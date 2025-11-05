import json
from os import environ

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fake_useragent import UserAgent

load_dotenv()

MY_FLIGHT_RADAR_BASE = "https://my.flightradar24.com/"

# Initialize UserAgent instance
ua = UserAgent()

def fetch_soup(url: str, headers: dict | None = None, timeout: float = 10.0) -> BeautifulSoup:
    if headers is None:
        headers = {}
    if 'User-Agent' not in headers:
        headers['User-Agent'] = ua.random
    
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, 'html.parser')

def write_to_data(json_data):
    target = environ.get("OUTPUT")
    if not target:
        raise ValueError("OUTPUT environment variable is not set.")

    with open(target, 'w', encoding="utf-8") as f:
        json.dump(json_data, f, indent=2)

if __name__ == '__main__':
    username = environ.get('FLIGHT_RADAR_USERNAME')
    if not username:
        raise ValueError("FLIGHT_RADAR_USERNAME environment variable is not set.")

    soup = fetch_soup(f"{MY_FLIGHT_RADAR_BASE}{username}")

    main_map = soup.find(id="main-map")
    data_paths = main_map.get("data-paths")
    data_points = main_map.get("data-points")

    data_paths = json.loads(data_paths)
    data_points = json.loads(data_points)

    arc_keys = ["startLat", "startLng", "endLat", "endLng"]

    arcs = [
        { key: float(val) for key, val in zip(arc_keys, path) }
        for path in data_paths
    ]

    airports = [
        {
            "lat": float(point["lat"]),
            "lng": float(point["lon"]),
            "iata": point["iata"],
            "icao": point["icao"],
            "city": point["city"],
            "name": point["name"],
            "country": point["country"],
            "count": point["count"]
        }
        for point in data_points
    ]

    write_to_data({
        "arcs": arcs,
        "airports": airports
    })


