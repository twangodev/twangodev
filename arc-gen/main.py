import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from os import environ
from zoneinfo import ZoneInfo

import airportsdata
from bs4 import BeautifulSoup
from curl_cffi import requests
from dotenv import load_dotenv

load_dotenv()

FLIGHT_LIST_API = "https://my.flightradar24.com/public-scripts/flight-list/{username}/{start_row}//"
PROFILE_FLIGHTS_URL = "https://my.flightradar24.com/{username}/flights"
BATCH_SIZE = 50

AIRPORTS_DB = airportsdata.load("IATA")


def get_headers(username: str) -> dict:
    return {
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": f"https://my.flightradar24.com/{username}",
    }


def fetch(url: str, username: str, timeout: float = 10.0):
    resp = requests.get(url, headers=get_headers(username), impersonate="chrome", timeout=timeout)
    resp.raise_for_status()
    return resp


def fetch_json(url: str, username: str, timeout: float = 10.0) -> dict:
    return fetch(url, username, timeout).json()


def fetch_text(url: str, username: str, timeout: float = 10.0) -> str:
    return fetch(url, username, timeout).text


def parse_iata(html: str) -> str:
    """Extract IATA code from HTML field."""
    if not html or not html.strip():
        return ""
    soup = BeautifulSoup(html, "html.parser")
    link = soup.find("a", class_="show-hovercard")
    if link:
        return link.get_text(strip=True)
    span = soup.find("span", class_="tooltip")
    if span:
        return span.get_text(strip=True)
    return soup.get_text(strip=True)


def parse_date(html: str) -> str:
    """Extract date (YYYY-MM-DD) from HTML field."""
    if not html or not html.strip():
        return ""
    soup = BeautifulSoup(html, "html.parser")
    span = soup.find("span", class_="inner-date")
    if span:
        return span.get_text(strip=True)
    return ""


def parse_time(value) -> str:
    """Extract HH:MM time string from a row field."""
    if not isinstance(value, str):
        return ""
    return value.strip()


def parse_route(
    date_html, flight_raw, from_html, to_html, dep_raw, arr_raw
) -> tuple[str, str, str, str, str, str]:
    """Parse already-extracted flight fields into a normalized route tuple
    (date, from_iata, to_iata, dep_time, arr_time, flight_number)."""
    return (
        parse_date(date_html),
        parse_iata(from_html),
        parse_iata(to_html),
        parse_time(dep_raw),
        parse_time(arr_raw),
        parse_time(flight_raw),
    )


def parse_api_route(row: list) -> tuple[str, str, str, str, str, str]:
    """Map a load-more API row (positional JSON array) onto parse_route."""
    field = lambda i: row[i] if len(row) > i else None
    return parse_route(field(0), field(1), field(2), field(3), field(5), field(6))


def to_utc_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def compute_utc_times(
    date: str,
    dep_time: str,
    arr_time: str,
    from_tz: str | None,
    to_tz: str | None,
) -> tuple[str | None, str | None]:
    """Convert local dep/arr times to UTC ISO strings.

    Arrival date is inferred by picking the candidate (dep_date ± 1 day) that
    yields a positive duration under 24 hours.
    """
    if not (date and from_tz):
        return None, None

    dep_utc = None
    if dep_time:
        dep_local = datetime.strptime(f"{date} {dep_time}", "%Y-%m-%d %H:%M")
        dep_utc = dep_local.replace(tzinfo=ZoneInfo(from_tz)).astimezone(timezone.utc)

    arr_utc = None
    if arr_time and to_tz and dep_utc is not None:
        base = datetime.strptime(f"{date} {arr_time}", "%Y-%m-%d %H:%M")
        best = None
        for delta in (-1, 0, 1):
            candidate = (base + timedelta(days=delta)).replace(tzinfo=ZoneInfo(to_tz)).astimezone(timezone.utc)
            duration = (candidate - dep_utc).total_seconds()
            if 0 < duration <= 24 * 3600 and (best is None or duration < best[0]):
                best = (duration, candidate)
        if best is not None:
            arr_utc = best[1]

    return (to_utc_iso(dep_utc) if dep_utc else None, to_utc_iso(arr_utc) if arr_utc else None)


def parse_html_rows(html: str) -> dict[int, tuple]:
    """Parse the server-rendered flight table into {row_number: route}.

    The flights page (``/<user>/flights``) renders the most recent batch of
    flights inline, keyed by a 0-indexed ``data-row-number``. Row 0 is the
    newest flight and only ever appears here, never in the load-more API.
    """
    soup = BeautifulSoup(html, "html.parser")
    rows: dict[int, tuple] = {}
    for tr in soup.select("table.flight-list-original tbody tr[data-row-number]"):
        try:
            row_number = int(tr["data-row-number"])
        except (KeyError, ValueError):
            continue
        cells = tr.find_all("td")
        if len(cells) < 8:
            continue
        rows[row_number] = parse_route(
            date_html=cells[0].decode_contents(),
            flight_raw=cells[1].get_text(strip=True),
            from_html=cells[3].decode_contents(),
            to_html=cells[4].decode_contents(),
            dep_raw=cells[6].get_text(strip=True),
            arr_raw=cells[7].get_text(strip=True),
        )
    return rows


def fetch_all_routes(username: str) -> list[tuple[str, str, str]]:
    """Fetch all routes, newest first.

    FlightRadar24's ``start_row`` parameter is the last-seen row number and is
    *exclusive* (``start_row=N`` returns rows ``N+1`` onward), and rows 0 and 1
    are only ever server-rendered on the flights page. So seed from that page,
    then page the API forward using the highest row number seen so far.
    """
    rows = parse_html_rows(fetch_text(PROFILE_FLIGHTS_URL.format(username=username), username))
    last_row = max(rows) if rows else 0

    while True:
        url = FLIGHT_LIST_API.format(username=username, start_row=last_row)
        data = fetch_json(url, username)
        if not data:
            break

        keys = [int(k) for k in data.keys()]
        for key in data:
            rows[int(key)] = parse_api_route(data[key])

        max_key = max(keys)
        if len(data) < BATCH_SIZE or max_key <= last_row:
            break
        last_row = max_key

    return [rows[k] for k in sorted(rows)]


def routes_to_arcs(routes: list[tuple[str, str, str]]) -> list[dict]:
    """Convert routes to arc data with coordinates."""
    arcs = []
    for date, from_iata, to_iata, dep_time, arr_time, flight_number in routes:
        from_airport = AIRPORTS_DB.get(from_iata)
        to_airport = AIRPORTS_DB.get(to_iata)

        if from_airport and to_airport:
            arc = {
                "startLat": from_airport["lat"],
                "startLng": from_airport["lon"],
                "endLat": to_airport["lat"],
                "endLng": to_airport["lon"],
                "fromIata": from_iata,
                "toIata": to_iata,
            }
            if date:
                arc["date"] = date
            if flight_number:
                arc["flightNumber"] = flight_number
            dep_utc, arr_utc = compute_utc_times(
                date, dep_time, arr_time, from_airport.get("tz"), to_airport.get("tz")
            )
            if dep_utc:
                arc["depUtc"] = dep_utc
            if arr_utc:
                arc["arrUtc"] = arr_utc
            arcs.append(arc)
    return arcs


def routes_to_airports(routes: list[tuple[str, str, str]]) -> list[dict]:
    """Extract unique airports with visit counts from routes."""
    # Count visits to each airport
    airport_counts = Counter()
    for _date, from_iata, to_iata, *_rest in routes:
        airport_counts[from_iata] += 1
        airport_counts[to_iata] += 1

    airports = []
    for iata, count in airport_counts.items():
        airport = AIRPORTS_DB.get(iata)
        if airport:
            airports.append({
                "lat": airport["lat"],
                "lng": airport["lon"],
                "iata": iata,
                "icao": airport.get("icao", ""),
                "city": airport.get("city", ""),
                "subd": airport.get("subd", ""),
                "name": airport.get("name", ""),
                "country": airport.get("country", ""),
                "count": count,
            })
    return airports


def write_to_data(json_data):
    target = environ.get("OUTPUT")
    if not target:
        raise ValueError("OUTPUT environment variable is not set.")

    with open(target, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2)


if __name__ == "__main__":
    username = environ.get("FLIGHT_RADAR_USERNAME")
    if not username:
        raise ValueError("FLIGHT_RADAR_USERNAME environment variable is not set.")

    print(f"Fetching routes for {username}...")

    routes = fetch_all_routes(username)
    print(f"Fetched {len(routes)} routes")

    arcs = routes_to_arcs(routes)
    airports = routes_to_airports(routes)
    print(f"Generated {len(arcs)} arcs and {len(airports)} airports")

    write_to_data({
        "arcs": arcs,
        "airports": airports,
    })


