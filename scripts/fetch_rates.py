#!/usr/bin/env python3
"""
Fetch retail electricity rate data from EIA API.

Data source: EIA API v2 - electricity/retail-sales
Includes average retail prices by state and sector (residential, commercial, industrial).
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "raw_data" / "rates"
API_BASE = "https://api.eia.gov/v2"

# Sectors to fetch
SECTORS = {
    "RES": "residential",
    "COM": "commercial",
    "IND": "industrial",
    "ALL": "all"
}


def get_api_key() -> str:
    """Get API key from environment."""
    api_key = os.getenv("EIA_API_KEY")
    if not api_key:
        raise ValueError("EIA_API_KEY not found - check your .env file")
    return api_key


def fetch_retail_prices(api_key: str, sector: str, year: int) -> List[Dict]:
    """
    Fetch retail electricity prices for a specific sector and year.

    Returns list of records with state, price, revenue, and sales data.
    """
    url = f"{API_BASE}/electricity/retail-sales/data/"

    params = {
        "api_key": api_key,
        "frequency": "annual",
        "data[0]": "price",
        "data[1]": "revenue",
        "data[2]": "sales",
        "facets[sectorid][]": sector,
        "start": str(year),
        "end": str(year),
        "sort[0][column]": "stateid",
        "sort[0][direction]": "asc",
        "length": 5000
    }

    try:
        response = requests.get(url, params=params, timeout=60)

        if response.status_code != 200:
            print(f"    API error: HTTP {response.status_code}")
            return []

        data = response.json()

        if "response" not in data or "data" not in data["response"]:
            print(f"    Unexpected API response format")
            return []

        return data["response"]["data"]

    except requests.exceptions.RequestException as e:
        print(f"    Request error: {e}")
        return []


def process_rate_data(records: List[Dict], sector: str, year: int) -> List[Dict]:
    """
    Process raw API records into clean rate data.

    Filters to state-level data (2-letter codes) and extracts key fields.
    """
    processed = []

    # Valid US state codes
    valid_states = {
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    }

    for record in records:
        state_id = record.get("stateid", "")

        # Only keep 2-letter state codes
        if state_id not in valid_states:
            continue

        # Extract and validate price
        price = record.get("price")
        if price is None:
            continue

        try:
            price = float(price)
        except (ValueError, TypeError):
            continue

        # Price is in cents/kWh - validate reasonable range
        if price <= 0 or price > 100:
            continue

        # Extract other fields
        revenue = record.get("revenue")
        sales = record.get("sales")

        try:
            revenue = float(revenue) if revenue else None
            sales = float(sales) if sales else None
        except (ValueError, TypeError):
            revenue = None
            sales = None

        processed.append({
            "state": state_id,
            "sector": sector,
            "sectorName": SECTORS.get(sector, sector),
            "price": round(price, 2),  # cents per kWh
            "revenue": round(revenue, 0) if revenue else None,  # thousand dollars
            "sales": round(sales, 0) if sales else None,  # thousand kWh
            "year": year
        })

    return processed


def fetch_all_rates(api_key: str, years: range) -> Dict[int, List[Dict]]:
    """
    Fetch retail electricity rates for all sectors and years.

    Returns dict keyed by year with list of rate records.
    """
    all_data = {}

    for year in years:
        print(f"\nYear {year}:")
        year_data = []

        for sector_id, sector_name in SECTORS.items():
            print(f"  Fetching {sector_name} rates...", end=" ")

            records = fetch_retail_prices(api_key, sector_id, year)
            processed = process_rate_data(records, sector_id, year)

            print(f"got {len(processed)} states")
            year_data.extend(processed)

        if year_data:
            all_data[year] = year_data

    return all_data


def main():
    """Main function to fetch all retail electricity rate data."""
    print("=" * 60)
    print("EIA Retail Electricity Rate Fetcher")
    print("=" * 60)

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    api_key = get_api_key()
    print(f"Using EIA API key: {api_key[:8]}...")

    # Years to fetch (align with reliability data range)
    years = range(2013, 2024)
    print(f"Years to fetch: {min(years)} - {max(years)}")

    # Fetch all rate data
    all_data = fetch_all_rates(api_key, years)

    # Save by year
    print("\nSaving data files...")
    for year, records in all_data.items():
        output_file = DATA_DIR / f"rates_{year}.json"
        with open(output_file, 'w') as f:
            json.dump(records, f, indent=2)
        print(f"  Saved: {output_file.name} ({len(records)} records)")

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Successfully fetched: {len(all_data)} years")
    print(f"Output directory: {DATA_DIR}")


if __name__ == "__main__":
    main()
