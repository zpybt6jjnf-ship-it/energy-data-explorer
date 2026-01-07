#!/usr/bin/env python3
"""
Fetch EIA wholesale electricity price data.
Downloads Excel files from EIA and processes into JSON format.

Note: Wholesale prices are NOT available via API - only as Excel downloads.
Source: https://www.eia.gov/electricity/wholesalemarkets/data.php
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict
import requests
import statistics

# Try to import pandas and openpyxl for Excel parsing
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    print("Warning: pandas not installed. Install with: pip install pandas openpyxl")

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data" / "wholesale"
OUTPUT_DIR = PROJECT_ROOT / "public" / "data"

# EIA wholesale price data URLs (Excel files by year)
# Historical archive: https://www.eia.gov/electricity/wholesalemarkets/data/wholesale_prices_archive_2001_2013.zip
BASE_URL = "https://www.eia.gov/electricity/wholesalemarkets/data"

# Hub definitions with state mappings
HUBS = {
    "PJM West": {
        "states": ["PA", "OH", "WV", "VA", "MD", "DE", "NJ", "DC"],
        "region": "Mid-Atlantic",
        "data_from": 2001
    },
    "Mass Hub": {
        "states": ["MA", "CT", "RI", "NH", "VT", "ME"],
        "region": "New England",
        "data_from": 2001
    },
    "Indiana Hub": {
        "states": ["IN", "IL", "MI"],
        "region": "Midwest",
        "data_from": 2006
    },
    "Mid-C": {
        "states": ["WA", "OR", "ID", "MT"],
        "region": "Northwest",
        "data_from": 2001
    },
    "Palo Verde": {
        "states": ["AZ", "NM", "NV", "UT"],
        "region": "Southwest",
        "data_from": 2001
    },
    "NP15": {
        "states": ["CA"],  # Northern California
        "region": "California",
        "data_from": 2009
    },
    "SP15": {
        "states": ["CA"],  # Southern California
        "region": "California",
        "data_from": 2009
    },
    "ERCOT North": {
        "states": ["TX"],
        "region": "Texas",
        "data_from": 2014
    }
}

# Reverse mapping: state to hub
STATE_TO_HUB = {}
for hub, info in HUBS.items():
    for state in info["states"]:
        if state not in STATE_TO_HUB:
            STATE_TO_HUB[state] = hub


def download_wholesale_file(year: int) -> Optional[Path]:
    """Download wholesale price Excel file for a given year."""
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # EIA naming convention for wholesale files
    filename = f"wholesale_prices_{year}.xlsx"
    local_path = RAW_DATA_DIR / filename

    if local_path.exists():
        print(f"  Using cached: {filename}")
        return local_path

    # Try different URL patterns (EIA changes formats occasionally)
    urls_to_try = [
        f"{BASE_URL}/wholesale_prices_{year}.xlsx",
        f"{BASE_URL}/wholesale_electricity_prices_{year}.xlsx",
    ]

    for url in urls_to_try:
        try:
            print(f"  Downloading: {url}")
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                with open(local_path, 'wb') as f:
                    f.write(response.content)
                return local_path
        except Exception as e:
            print(f"  Failed: {e}")
            continue

    return None


def parse_wholesale_excel(filepath: Path, year: int) -> List[Dict]:
    """Parse wholesale price Excel file and extract daily prices by hub."""
    if not HAS_PANDAS:
        print("  Skipping Excel parse - pandas not installed")
        return []

    try:
        # Read Excel file - EIA files typically have data starting after headers
        df = pd.read_excel(filepath, sheet_name=0, header=None)

        # Find the header row (contains hub names)
        header_row = None
        for i, row in df.iterrows():
            row_str = ' '.join(str(v) for v in row.values if pd.notna(v))
            if any(hub.lower() in row_str.lower() for hub in HUBS.keys()):
                header_row = i
                break

        if header_row is None:
            print(f"  Could not find header row in {filepath.name}")
            return []

        # Re-read with proper header
        df = pd.read_excel(filepath, sheet_name=0, header=header_row)

        # Process each hub
        results = []
        for hub_name in HUBS.keys():
            # Find column matching hub name (case-insensitive, partial match)
            hub_col = None
            for col in df.columns:
                if hub_name.lower() in str(col).lower():
                    hub_col = col
                    break

            if hub_col is None:
                continue

            # Extract prices (filter out non-numeric)
            prices = pd.to_numeric(df[hub_col], errors='coerce').dropna()
            prices = prices[prices > 0]  # Filter invalid prices

            if len(prices) == 0:
                continue

            results.append({
                "hub": hub_name,
                "year": year,
                "avgPrice": round(float(prices.mean()), 2),
                "minPrice": round(float(prices.min()), 2),
                "maxPrice": round(float(prices.max()), 2),
                "volatility": round(float(prices.std()), 2) if len(prices) > 1 else 0,
                "dataPoints": len(prices),
                "mappedStates": HUBS[hub_name]["states"],
                "region": HUBS[hub_name]["region"]
            })

        return results

    except Exception as e:
        print(f"  Error parsing {filepath.name}: {e}")
        return []


def generate_sample_data() -> dict:
    """Generate sample wholesale price data for development/testing."""
    print("Generating sample wholesale price data...")

    import random
    random.seed(42)

    points = []
    years_available = list(range(2013, 2024))

    # Base prices by hub ($/MWh)
    base_prices = {
        "PJM West": 35,
        "Mass Hub": 45,
        "Indiana Hub": 32,
        "Mid-C": 28,
        "Palo Verde": 30,
        "NP15": 40,
        "SP15": 42,
        "ERCOT North": 35
    }

    for year in years_available:
        # Price trends: general increase with variation
        year_factor = 1 + (year - 2013) * 0.02

        for hub_name, base_price in base_prices.items():
            if year < HUBS[hub_name]["data_from"]:
                continue

            # Add yearly variation
            noise = random.uniform(0.85, 1.15)
            avg_price = base_price * year_factor * noise

            # Volatility varies by hub
            volatility = avg_price * random.uniform(0.15, 0.35)

            points.append({
                "hub": hub_name,
                "year": year,
                "avgPrice": round(avg_price, 2),
                "minPrice": round(avg_price * 0.4, 2),
                "maxPrice": round(avg_price * 2.5, 2),
                "volatility": round(volatility, 2),
                "dataPoints": 365,
                "mappedStates": HUBS[hub_name]["states"],
                "region": HUBS[hub_name]["region"]
            })

    return {
        "points": points,
        "metadata": {
            "lastUpdated": datetime.now().isoformat(),
            "hubsAvailable": list(HUBS.keys()),
            "yearsAvailable": years_available,
            "stateToHub": STATE_TO_HUB,
            "dataSource": "Sample data for development"
        }
    }


def fetch_all_wholesale_data(years: range) -> dict:
    """Fetch and process wholesale price data for all years."""
    all_points = []
    years_with_data = []

    print("Fetching wholesale electricity price data...")

    for year in years:
        print(f"\nYear {year}:")

        # Try to download and parse real data
        filepath = download_wholesale_file(year)

        if filepath and HAS_PANDAS:
            year_data = parse_wholesale_excel(filepath, year)
            if year_data:
                all_points.extend(year_data)
                years_with_data.append(year)
                print(f"  Parsed {len(year_data)} hub records")
                continue

        print(f"  No data available for {year}")

    if not all_points:
        print("\nNo real data found - generating sample data")
        return generate_sample_data()

    return {
        "points": all_points,
        "metadata": {
            "lastUpdated": datetime.now().isoformat(),
            "hubsAvailable": list(set(p["hub"] for p in all_points)),
            "yearsAvailable": sorted(years_with_data),
            "stateToHub": STATE_TO_HUB,
            "dataSource": "EIA Wholesale Electricity Markets (ICE)"
        }
    }


def main():
    """Main function to fetch wholesale price data."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Years to fetch (align with existing project data range)
    years = range(2013, 2025)

    # Try to fetch real data, fall back to sample
    if HAS_PANDAS:
        data = fetch_all_wholesale_data(years)
    else:
        print("pandas not available - generating sample data")
        data = generate_sample_data()

    # Save output
    output_file = OUTPUT_DIR / "wholesale-prices.json"
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Output saved to: {output_file}")
    print(f"Total records: {len(data['points'])}")
    print(f"Hubs: {data['metadata']['hubsAvailable']}")
    print(f"Years: {min(data['metadata']['yearsAvailable'])} - {max(data['metadata']['yearsAvailable'])}")


if __name__ == "__main__":
    main()
