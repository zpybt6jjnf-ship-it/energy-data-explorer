#!/usr/bin/env python3
"""
Fetch DOE Event-Correlated Outage Dataset.
Downloads from OpenEI and processes into state-year aggregations.

Source: https://data.openei.org/submissions/6458
Contains: EAGLE-I county-level outages + DOE-417 major event reports

The dataset includes:
- County-level outage data at 15-minute intervals (2014-2023)
- Major disturbance event reports with cause classifications
- Coverage: 146M+ customers across the US
"""

import json
import os
import zipfile
import csv
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import Optional, List, Dict
import requests

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data" / "outages"
OUTPUT_DIR = PROJECT_ROOT / "public" / "data"

# OpenEI download URL for the dataset
OPENEI_URL = "https://data.openei.org/files/6458/Outage%20Dataset%20v2.zip"
BACKUP_URL = "https://data.openei.org/files/6458/Outage%20Dataset%20v1.zip"

# State FIPS code mapping (for county aggregation)
FIPS_TO_STATE = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
    "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
    "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
    "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
    "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
    "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY", "72": "PR", "78": "VI"
}

# Cause classification mapping (from DOE-417 categories)
CAUSE_CATEGORIES = {
    "weather": ["severe weather", "weather", "storm", "hurricane", "tornado",
                "ice", "snow", "wind", "lightning", "flood", "heat", "cold",
                "extreme temperature", "winter storm", "thunderstorm"],
    "equipment": ["equipment failure", "equipment", "transmission", "distribution",
                  "transformer", "line failure", "generator", "substation"],
    "demand": ["load shedding", "demand", "capacity", "shortage", "conservation"],
    "fuel": ["fuel supply", "fuel", "gas", "natural gas shortage"],
    "cyber": ["cyber", "attack", "suspicious", "vandalism", "sabotage"],
    "other": ["other", "unknown", "islanding", "voltage reduction"]
}


def categorize_cause(cause_text: str) -> str:
    """Categorize outage cause into standard categories."""
    cause_lower = cause_text.lower() if cause_text else ""

    for category, keywords in CAUSE_CATEGORIES.items():
        if any(kw in cause_lower for kw in keywords):
            return category

    return "other"


def download_dataset() -> Optional[Path]:
    """Download the DOE outage dataset from OpenEI."""
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

    zip_path = RAW_DATA_DIR / "outage_dataset.zip"
    extract_dir = RAW_DATA_DIR / "extracted"

    if extract_dir.exists() and any(extract_dir.iterdir()):
        print("Using cached dataset")
        return extract_dir

    # Try to download
    for url in [OPENEI_URL, BACKUP_URL]:
        try:
            print(f"Downloading from: {url}")
            response = requests.get(url, timeout=300, stream=True)

            if response.status_code == 200:
                with open(zip_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)

                # Extract
                print("Extracting dataset...")
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    zf.extractall(extract_dir)

                return extract_dir

        except Exception as e:
            print(f"Failed to download: {e}")
            continue

    return None


def parse_doe417_events(extract_dir: Path) -> List[Dict]:
    """Parse DOE-417 major event reports."""
    events = []

    # Look for DOE-417 data file
    for filepath in extract_dir.rglob("*.csv"):
        if "417" in filepath.name.lower() or "event" in filepath.name.lower():
            print(f"  Parsing: {filepath.name}")

            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    reader = csv.DictReader(f)

                    for row in reader:
                        # Extract fields (column names vary by version)
                        date = row.get("Date") or row.get("date") or row.get("Event Date")
                        cause = row.get("Event Type") or row.get("cause") or row.get("Cause")
                        customers = row.get("Number of Customers Affected") or row.get("customers")
                        duration = row.get("Duration (hours)") or row.get("duration")
                        state = row.get("Area Affected") or row.get("state") or row.get("State")

                        if not date:
                            continue

                        # Parse year from date
                        try:
                            year = int(date[:4]) if len(date) >= 4 else None
                        except (ValueError, TypeError):
                            continue

                        if not year or year < 2014 or year > 2024:
                            continue

                        # Parse customers affected
                        try:
                            customers_int = int(float(customers)) if customers else 0
                        except (ValueError, TypeError):
                            customers_int = 0

                        # Parse duration
                        try:
                            duration_hours = float(duration) if duration else 0
                        except (ValueError, TypeError):
                            duration_hours = 0

                        events.append({
                            "date": date,
                            "year": year,
                            "cause": cause or "Unknown",
                            "causeCategory": categorize_cause(cause),
                            "customersAffected": customers_int,
                            "durationHours": duration_hours,
                            "states": [state] if state else []
                        })

            except Exception as e:
                print(f"    Error parsing {filepath.name}: {e}")

    return events


def aggregate_to_state_year(events: List[Dict]) -> List[Dict]:
    """Aggregate events to state-year summaries."""
    state_year_data = defaultdict(lambda: {
        "totalEvents": 0,
        "weatherEvents": 0,
        "equipmentEvents": 0,
        "demandEvents": 0,
        "otherEvents": 0,
        "totalCustomersAffected": 0,
        "maxEventCustomers": 0,
        "totalDurationHours": 0
    })

    for event in events:
        year = event["year"]
        category = event["causeCategory"]
        customers = event["customersAffected"]
        duration = event["durationHours"]

        # Handle events that affect multiple states
        states = event.get("states", [])
        if not states:
            states = ["US"]  # National event

        for state in states:
            # Clean state code
            state_code = state.strip()[:2].upper() if state else "US"
            if len(state_code) != 2:
                continue

            key = f"{state_code}-{year}"
            data = state_year_data[key]

            data["totalEvents"] += 1
            data["totalCustomersAffected"] += customers
            data["maxEventCustomers"] = max(data["maxEventCustomers"], customers)
            data["totalDurationHours"] += duration

            # Category counts
            if category == "weather":
                data["weatherEvents"] += 1
            elif category == "equipment":
                data["equipmentEvents"] += 1
            elif category == "demand":
                data["demandEvents"] += 1
            else:
                data["otherEvents"] += 1

    # Convert to list format
    results = []
    for key, data in state_year_data.items():
        state_code, year_str = key.split("-")
        year = int(year_str)

        # Determine primary cause
        cause_counts = {
            "weather": data["weatherEvents"],
            "equipment": data["equipmentEvents"],
            "demand": data["demandEvents"],
            "other": data["otherEvents"]
        }
        primary_cause = max(cause_counts, key=cause_counts.get)

        results.append({
            "stateCode": state_code,
            "year": year,
            "totalEvents": data["totalEvents"],
            "weatherEvents": data["weatherEvents"],
            "equipmentEvents": data["equipmentEvents"],
            "demandEvents": data["demandEvents"],
            "otherEvents": data["otherEvents"],
            "primaryCause": primary_cause,
            "totalCustomersAffected": data["totalCustomersAffected"],
            "maxEventCustomers": data["maxEventCustomers"],
            "avgDurationHours": round(data["totalDurationHours"] / max(data["totalEvents"], 1), 1)
        })

    return sorted(results, key=lambda x: (x["year"], x["stateCode"]))


def generate_sample_data() -> dict:
    """Generate sample outage data for development/testing."""
    print("Generating sample outage data...")

    import random
    random.seed(42)

    events = []
    state_year_summary = []

    # States with typical outage patterns
    state_profiles = {
        # High weather vulnerability (Gulf Coast, Southeast)
        "FL": {"weather_rate": 0.7, "base_events": 15},
        "TX": {"weather_rate": 0.6, "base_events": 20},
        "LA": {"weather_rate": 0.7, "base_events": 12},
        "NC": {"weather_rate": 0.5, "base_events": 10},
        "GA": {"weather_rate": 0.5, "base_events": 8},
        # Moderate (Northeast, Midwest)
        "NY": {"weather_rate": 0.4, "base_events": 12},
        "PA": {"weather_rate": 0.4, "base_events": 8},
        "OH": {"weather_rate": 0.4, "base_events": 7},
        "MI": {"weather_rate": 0.5, "base_events": 8},
        "IL": {"weather_rate": 0.4, "base_events": 7},
        # Lower (West, Mountain)
        "CA": {"weather_rate": 0.3, "base_events": 15},
        "WA": {"weather_rate": 0.3, "base_events": 5},
        "AZ": {"weather_rate": 0.2, "base_events": 4},
        "CO": {"weather_rate": 0.3, "base_events": 4},
        "NV": {"weather_rate": 0.2, "base_events": 3},
    }

    years = list(range(2014, 2024))

    for year in years:
        for state_code, profile in state_profiles.items():
            # Vary events by year (weather events increased over time)
            year_factor = 1 + (year - 2014) * 0.03
            num_events = int(profile["base_events"] * year_factor * random.uniform(0.7, 1.3))

            weather_events = int(num_events * profile["weather_rate"])
            equipment_events = int(num_events * 0.2)
            other_events = num_events - weather_events - equipment_events

            # Generate individual events
            for i in range(num_events):
                cause_cat = "weather" if i < weather_events else (
                    "equipment" if i < weather_events + equipment_events else "other"
                )

                customers = random.randint(10000, 500000) if cause_cat == "weather" else random.randint(5000, 100000)
                duration = random.uniform(2, 48) if cause_cat == "weather" else random.uniform(1, 12)

                events.append({
                    "eventId": f"{state_code}-{year}-{i:03d}",
                    "date": f"{year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
                    "states": [state_code],
                    "cause": {"weather": "Severe Weather", "equipment": "Equipment Failure", "other": "Other"}[cause_cat],
                    "causeCategory": cause_cat,
                    "customersAffected": customers,
                    "durationHours": round(duration, 1)
                })

            # State-year summary
            total_customers = sum(e["customersAffected"] for e in events if e["states"][0] == state_code and e["date"].startswith(str(year)))
            max_customers = max((e["customersAffected"] for e in events if e["states"][0] == state_code and e["date"].startswith(str(year))), default=0)

            state_year_summary.append({
                "stateCode": state_code,
                "year": year,
                "totalEvents": num_events,
                "weatherEvents": weather_events,
                "equipmentEvents": equipment_events,
                "demandEvents": 0,
                "otherEvents": other_events,
                "primaryCause": "weather" if weather_events > equipment_events else "equipment",
                "totalCustomersAffected": total_customers,
                "maxEventCustomers": max_customers,
                "avgDurationHours": round(random.uniform(4, 16), 1)
            })

    return {
        "events": events[-100:],  # Keep last 100 events for sample
        "stateYearSummary": state_year_summary,
        "metadata": {
            "lastUpdated": datetime.now().isoformat(),
            "yearsAvailable": years,
            "causeTypes": ["weather", "equipment", "demand", "other"],
            "dataSource": "Sample data for development"
        }
    }


def fetch_all_outage_data() -> dict:
    """Fetch and process DOE outage dataset."""
    print("Fetching DOE Event-Correlated Outage Dataset...")

    extract_dir = download_dataset()

    if extract_dir is None:
        print("\nCould not download dataset - generating sample data")
        return generate_sample_data()

    # Parse DOE-417 events
    print("\nParsing DOE-417 events...")
    events = parse_doe417_events(extract_dir)
    print(f"Found {len(events)} events")

    if not events:
        print("No events found - generating sample data")
        return generate_sample_data()

    # Aggregate to state-year
    print("\nAggregating to state-year summaries...")
    state_year_summary = aggregate_to_state_year(events)
    print(f"Created {len(state_year_summary)} state-year records")

    years = sorted(set(e["year"] for e in events))

    return {
        "events": events[-500:],  # Keep recent events for timeline
        "stateYearSummary": state_year_summary,
        "metadata": {
            "lastUpdated": datetime.now().isoformat(),
            "yearsAvailable": years,
            "causeTypes": ["weather", "equipment", "demand", "other"],
            "dataSource": "DOE Event-Correlated Outage Dataset (EAGLE-I + DOE-417)"
        }
    }


def main():
    """Main function to fetch outage data."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    data = fetch_all_outage_data()

    # Save output
    output_file = OUTPUT_DIR / "outage-events.json"
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Output saved to: {output_file}")
    print(f"Events: {len(data['events'])}")
    print(f"State-year summaries: {len(data['stateYearSummary'])}")
    print(f"Years: {min(data['metadata']['yearsAvailable'])} - {max(data['metadata']['yearsAvailable'])}")


if __name__ == "__main__":
    main()
