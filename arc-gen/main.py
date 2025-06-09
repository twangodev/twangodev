import json
from os import environ

import requests
from bs4 import BeautifulSoup

MY_FLIGHT_RADAR_BASE = "https://my.flightradar24.com/"

def fetch_soup(url: str, headers: dict | None = None, timeout: float = 10.0) -> BeautifulSoup:
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

    data_paths = json.loads(data_paths)

    keys = ["startLat", "startLng", "endLat", "endLng"]

    arcs = [
        { key: float(val) for key, val in zip(keys, path) }
        for path in data_paths
    ]

    write_to_data(arcs)


