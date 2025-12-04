import json
from collections import Counter
from os import environ

import airportsdata
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fake_useragent import UserAgent

load_dotenv()

FLIGHT_LIST_API = "https://my.flightradar24.com/public-scripts/flight-list/{username}/{start_row}//"
BATCH_SIZE = 50

ua = UserAgent()
AIRPORTS_DB = airportsdata.load("IATA")


def get_headers() -> dict:
    return {
        "User-Agent": ua.random,
        "Accept": "application/json, text/html, */*",
    }


def fetch_json(url: str, timeout: float = 10.0) -> dict:
    resp = requests.get(url, headers=get_headers(), timeout=timeout)
    resp.raise_for_status()
    return resp.json()


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


def parse_route(row: list) -> tuple[str, str]:
    """Parse a flight row and return (from_iata, to_iata)."""
    return parse_iata(row[2]), parse_iata(row[3])


def fetch_all_routes(username: str) -> list[tuple[str, str]]:
    """Fetch all routes using pagination."""
    routes = []
    start_row = 1

    while True:
        url = FLIGHT_LIST_API.format(username=username, start_row=start_row)
        data = fetch_json(url)

        if not data:
            break

        for key in sorted(data.keys(), key=int):
            route = parse_route(data[key])
            routes.append(route)

        fetched_keys = [int(k) for k in data.keys()]
        max_key = max(fetched_keys)

        if len(data) < BATCH_SIZE:
            break

        start_row = max_key + 1

    return routes


def routes_to_arcs(routes: list[tuple[str, str]]) -> list[dict]:
    """Convert routes to arc data with coordinates."""
    arcs = []
    for from_iata, to_iata in routes:
        from_airport = AIRPORTS_DB.get(from_iata)
        to_airport = AIRPORTS_DB.get(to_iata)

        if from_airport and to_airport:
            arcs.append({
                "startLat": from_airport["lat"],
                "startLng": from_airport["lon"],
                "endLat": to_airport["lat"],
                "endLng": to_airport["lon"],
            })
    return arcs


def routes_to_airports(routes: list[tuple[str, str]]) -> list[dict]:
    """Extract unique airports with visit counts from routes."""
    # Count visits to each airport
    airport_counts = Counter()
    for from_iata, to_iata in routes:
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


