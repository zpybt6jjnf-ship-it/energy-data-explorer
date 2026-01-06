#!/usr/bin/env python3
"""
Process EIA data and build chart-ready JSON for the visualization.
Combines generation data (from API) with reliability data to create
the SAIDI vs VRE penetration dataset.

Also builds utility-level data with RTO membership for aggregation features.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data"
OUTPUT_DIR = PROJECT_ROOT / "public" / "data"
UTILITY_RAW_DIR = RAW_DATA_DIR / "utilities"

# State codes to full names and regions
STATE_INFO = {
    "AL": ("Alabama", "South"), "AK": ("Alaska", "West"), "AZ": ("Arizona", "West"),
    "AR": ("Arkansas", "South"), "CA": ("California", "West"), "CO": ("Colorado", "West"),
    "CT": ("Connecticut", "Northeast"), "DE": ("Delaware", "South"),
    "DC": ("District of Columbia", "South"), "FL": ("Florida", "South"),
    "GA": ("Georgia", "South"), "HI": ("Hawaii", "West"), "ID": ("Idaho", "West"),
    "IL": ("Illinois", "Midwest"), "IN": ("Indiana", "Midwest"), "IA": ("Iowa", "Midwest"),
    "KS": ("Kansas", "Midwest"), "KY": ("Kentucky", "South"), "LA": ("Louisiana", "South"),
    "ME": ("Maine", "Northeast"), "MD": ("Maryland", "South"),
    "MA": ("Massachusetts", "Northeast"), "MI": ("Michigan", "Midwest"),
    "MN": ("Minnesota", "Midwest"), "MS": ("Mississippi", "South"),
    "MO": ("Missouri", "Midwest"), "MT": ("Montana", "West"), "NE": ("Nebraska", "Midwest"),
    "NV": ("Nevada", "West"), "NH": ("New Hampshire", "Northeast"),
    "NJ": ("New Jersey", "Northeast"), "NM": ("New Mexico", "West"),
    "NY": ("New York", "Northeast"), "NC": ("North Carolina", "South"),
    "ND": ("North Dakota", "Midwest"), "OH": ("Ohio", "Midwest"),
    "OK": ("Oklahoma", "South"), "OR": ("Oregon", "West"), "PA": ("Pennsylvania", "Northeast"),
    "RI": ("Rhode Island", "Northeast"), "SC": ("South Carolina", "South"),
    "SD": ("South Dakota", "Midwest"), "TN": ("Tennessee", "South"), "TX": ("Texas", "South"),
    "UT": ("Utah", "West"), "VT": ("Vermont", "Northeast"), "VA": ("Virginia", "South"),
    "WA": ("Washington", "West"), "WV": ("West Virginia", "South"),
    "WI": ("Wisconsin", "Midwest"), "WY": ("Wyoming", "West")
}


def load_generation_data(year: int) -> Optional[Dict[str, Dict]]:
    """Load generation data from JSON file."""
    file_path = RAW_DATA_DIR / "generation" / f"generation_{year}.json"

    if not file_path.exists():
        print(f"  Warning: Generation file not found for {year}")
        return None

    try:
        with open(file_path) as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"  Error reading generation data for {year}: {e}")
        return None


def load_rate_data(year: int) -> Optional[List[Dict]]:
    """Load retail electricity rate data from JSON file."""
    file_path = RAW_DATA_DIR / "rates" / f"rates_{year}.json"

    if not file_path.exists():
        print(f"  Warning: Rate file not found for {year}")
        return None

    try:
        with open(file_path) as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"  Error reading rate data for {year}: {e}")
        return None


def load_reliability_data(year: int) -> Optional[List[Dict]]:
    """Load reliability data from JSON file."""
    file_path = RAW_DATA_DIR / "reliability" / f"reliability_{year}.json"

    if not file_path.exists():
        print(f"  Warning: Reliability file not found for {year}")
        return None

    try:
        with open(file_path) as f:
            data = json.load(f)

        # Validate data - filter out unreasonable values
        # SAIDI typically ranges from 50-500 minutes, but can exceed 2000+ during major events
        # (e.g., Maine 2023 averaged ~2961 due to severe storms)
        valid_data = []
        for record in data:
            saidi = record.get("saidi")
            if saidi is not None and 0 < saidi < 10000:  # Allow high values for extreme events
                valid_data.append(record)

        if len(valid_data) < len(data):
            print(f"  Filtered {len(data) - len(valid_data)} invalid reliability records")

        return valid_data
    except Exception as e:
        print(f"  Error reading reliability data for {year}: {e}")
        return None


def load_utility_data(year: int) -> Optional[List[Dict]]:
    """Load utility-level data from JSON file."""
    file_path = UTILITY_RAW_DIR / f"utilities_{year}.json"

    if not file_path.exists():
        return None

    try:
        with open(file_path) as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"  Error reading utility data for {year}: {e}")
        return None


def detect_data_source() -> str:
    """Detect whether we're using real Form 861 data or estimates."""
    reliability_dir = RAW_DATA_DIR / "reliability"

    if not reliability_dir.exists():
        return "EIA API (generation) and sample data (reliability)"

    # Check if reliability data looks real (high variance) or estimated (low variance)
    reliability_files = list(reliability_dir.glob("reliability_*.json"))
    if not reliability_files:
        return "EIA API (generation) and sample data (reliability)"

    try:
        # Sample a recent year's data
        sample_file = sorted(reliability_files)[-1]  # Most recent
        with open(sample_file) as f:
            sample_data = json.load(f)

        if sample_data:
            saidi_values = [r.get("saidi", 0) for r in sample_data]
            if len(saidi_values) > 10:
                avg = sum(saidi_values) / len(saidi_values)
                variance = sum((v - avg) ** 2 for v in saidi_values) / len(saidi_values)

                # Real Form 861 data has high variance (states differ significantly)
                if variance > 3000:
                    return "EIA API (generation) and EIA Form 861 (reliability)"
    except Exception:
        pass

    return "EIA API (generation) and Form 861 estimates (reliability)"


def process_generation_data(gen_data: Dict) -> Dict[str, Dict]:
    """
    Process generation data into state-level VRE penetration and generation mix.
    Returns dict keyed by state code with wind, solar, total, and other fuel types.
    """
    state_gen = {}

    # Map EIA fuel type codes to our field names
    FUEL_MAPPING = {
        "ALL": "total",
        "WND": "wind",
        "SUN": "solar",
        "NG": "gas",
        "COW": "coal",
        "NUC": "nuclear",
        "HYC": "hydro",
        "OTH": "other"
    }

    # Process each fuel type
    for fuel_type, field_name in FUEL_MAPPING.items():
        if fuel_type not in gen_data:
            continue

        for record in gen_data[fuel_type]:
            # Get state code from location field
            location = record.get("location", "")

            # Skip non-state records (like US total or regions)
            if len(location) != 2 or location not in STATE_INFO:
                continue

            generation = record.get("generation")
            if generation is None:
                continue

            try:
                generation = float(generation)
            except (ValueError, TypeError):
                continue

            if location not in state_gen:
                state_gen[location] = {
                    "total": 0,
                    "wind": 0,
                    "solar": 0,
                    "gas": 0,
                    "coal": 0,
                    "nuclear": 0,
                    "hydro": 0,
                    "other": 0
                }

            state_gen[location][field_name] = generation

    # Calculate VRE penetration percentages
    for state, data in state_gen.items():
        total = data["total"]
        if total > 0:
            data["windPenetration"] = round(data["wind"] / total * 100, 2)
            data["solarPenetration"] = round(data["solar"] / total * 100, 2)
            data["vrePenetration"] = round((data["wind"] + data["solar"]) / total * 100, 2)
        else:
            data["windPenetration"] = 0
            data["solarPenetration"] = 0
            data["vrePenetration"] = 0

    return state_gen


def build_chart_json():
    """Build the final JSON data file for the chart."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_points = []
    years_available = []

    print("Processing data by year...")
    for year in range(2013, 2024):
        print(f"\nYear {year}:")

        # Load data
        gen_data = load_generation_data(year)
        reliability_data = load_reliability_data(year)
        rate_data = load_rate_data(year)

        if gen_data is None or reliability_data is None:
            print(f"  Skipping {year} - missing data")
            continue

        # Process generation data
        state_generation = process_generation_data(gen_data)
        print(f"  Generation data for {len(state_generation)} states")

        # Create reliability lookup by state code
        reliability_by_state = {r["state"]: r for r in reliability_data}

        # Create rate lookup by state code (residential rates as primary)
        rates_by_state = {}
        if rate_data:
            for r in rate_data:
                state = r["state"]
                sector = r["sector"]
                if state not in rates_by_state:
                    rates_by_state[state] = {}
                rates_by_state[state][sector] = r["price"]
            print(f"  Rate data for {len(rates_by_state)} states")

        # Combine data for each state
        year_point_count = 0
        for state_code, gen_info in state_generation.items():
            if state_code not in STATE_INFO:
                continue

            state_name, region = STATE_INFO[state_code]

            # Get reliability data (may be None for some states/years)
            rel_data = reliability_by_state.get(state_code, {})
            saidi = rel_data.get("saidi")
            saifi = rel_data.get("saifi")

            # Get rate data for this state
            state_rates = rates_by_state.get(state_code, {})

            # Include point if we have either SAIDI or rate data
            # (allows affordability chart to show all states even without reliability data)
            if saidi is None and not state_rates:
                continue

            point = {
                "state": state_name,
                "stateCode": state_code,
                "year": year,
                "saidi": saidi,
                "saifi": saifi,
                "vrePenetration": gen_info["vrePenetration"],
                "windPenetration": gen_info["windPenetration"],
                "solarPenetration": gen_info["solarPenetration"],
                "totalGeneration": round(gen_info["total"], 0),
                "customerCount": 0,  # Not available from this data source
                "region": region,
                # Rate data (cents per kWh)
                "rateResidential": state_rates.get("RES"),
                "rateCommercial": state_rates.get("COM"),
                "rateIndustrial": state_rates.get("IND"),
                "rateAll": state_rates.get("ALL"),
                # Generation by fuel type (MWh) for Energy Mix chart
                "generationWind": round(gen_info.get("wind", 0), 0),
                "generationSolar": round(gen_info.get("solar", 0), 0),
                "generationGas": round(gen_info.get("gas", 0), 0),
                "generationCoal": round(gen_info.get("coal", 0), 0),
                "generationNuclear": round(gen_info.get("nuclear", 0), 0),
                "generationHydro": round(gen_info.get("hydro", 0), 0),
                "generationOther": round(gen_info.get("other", 0), 0)
            }

            all_points.append(point)
            year_point_count += 1

        if year_point_count > 0:
            years_available.append(year)
            print(f"  Added {year_point_count} state records")

    if not all_points:
        print("\nNo data points generated! Check raw data files.")
        return

    # Build final JSON structure
    states = sorted(list(set(p["stateCode"] for p in all_points)))
    regions = sorted(list(set(p["region"] for p in all_points)))

    output = {
        "points": all_points,
        "metadata": {
            "lastUpdated": datetime.now().isoformat(),
            "yearsAvailable": sorted(years_available),
            "states": states,
            "regions": regions,
            "dataSource": detect_data_source()
        }
    }

    # Write output
    output_file = OUTPUT_DIR / "saidi-vre.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Output saved to: {output_file}")
    print(f"Total data points: {len(all_points)}")
    print(f"Years covered: {min(years_available)} - {max(years_available)}")
    print(f"States included: {len(states)}")


def build_utility_json():
    """Build utility-level JSON data file for aggregation features."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_utilities = []
    years_available = []

    # RTO mapping for display names
    RTO_NAMES = {
        'rto_caiso': 'CAISO',
        'rto_ercot': 'ERCOT',
        'rto_pjm': 'PJM',
        'rto_nyiso': 'NYISO',
        'rto_spp': 'SPP',
        'rto_miso': 'MISO',
        'rto_isone': 'ISO-NE'
    }

    print("\nProcessing utility data by year...")
    for year in range(2013, 2024):
        utility_data = load_utility_data(year)

        if utility_data is None:
            print(f"  No utility data for {year}")
            continue

        # Load generation data to get VRE penetration by state
        gen_data = load_generation_data(year)
        state_gen = {}
        if gen_data:
            state_gen = process_generation_data(gen_data)

        year_count = 0
        for u in utility_data:
            state_code = u.get('state', '')
            if state_code not in STATE_INFO:
                continue

            state_name, region = STATE_INFO[state_code]

            # Determine primary RTO (first one that's true)
            primary_rto = None
            rto_list = []
            for rto_key, rto_name in RTO_NAMES.items():
                if u.get(rto_key, False):
                    rto_list.append(rto_name)
                    if primary_rto is None:
                        primary_rto = rto_name

            # Get VRE data for state
            state_vre = state_gen.get(state_code, {})

            utility_record = {
                'utilityId': u.get('utility_id'),
                'utilityName': u.get('utility_name', ''),
                'state': state_name,
                'stateCode': state_code,
                'region': region,
                'ownership': u.get('ownership', ''),
                'nercRegion': u.get('nerc_region', ''),
                'primaryRto': primary_rto,
                'rtos': rto_list,
                'year': year,
                'saidi': u.get('saidi'),
                'saifi': u.get('saifi'),
                'customers': u.get('customers'),
                # Include state-level VRE for context
                'stateVrePenetration': state_vre.get('vrePenetration', 0),
                'stateWindPenetration': state_vre.get('windPenetration', 0),
                'stateSolarPenetration': state_vre.get('solarPenetration', 0),
            }

            all_utilities.append(utility_record)
            year_count += 1

        if year_count > 0:
            years_available.append(year)
            print(f"  Year {year}: {year_count} utilities")

    if not all_utilities:
        print("No utility data found!")
        return

    # Calculate aggregations for metadata
    ownership_types = sorted(list(set(u['ownership'] for u in all_utilities if u['ownership'])))
    rtos = sorted(list(set(rto for u in all_utilities for rto in u.get('rtos', []))))

    output = {
        'utilities': all_utilities,
        'metadata': {
            'lastUpdated': datetime.now().isoformat(),
            'yearsAvailable': sorted(years_available),
            'ownershipTypes': ownership_types,
            'rtos': rtos,
            'totalUtilities': len(set(u['utilityId'] for u in all_utilities)),
            'dataSource': 'EIA Form 861 (utility-level reliability and metadata)'
        }
    }

    output_file = OUTPUT_DIR / 'utilities.json'
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Utility data saved to: {output_file}")
    print(f"Total utility records: {len(all_utilities)}")
    print(f"Unique utilities: {output['metadata']['totalUtilities']}")
    print(f"Ownership types: {ownership_types}")
    print(f"RTOs: {rtos}")


def create_sample_data():
    """Create sample data for development/testing."""
    print("Creating sample data for development...")

    import random
    random.seed(42)

    sample_points = []

    for year in range(2013, 2024):
        year_offset = (year - 2013) / 10

        for state_code, (state_name, region) in STATE_INFO.items():
            # Base VRE varies by region
            base_vre = {
                "West": 15, "Midwest": 12, "South": 5, "Northeast": 8
            }[region]

            # VRE increases over time with state variation
            vre = base_vre * (1 + year_offset * 2) * random.uniform(0.5, 1.5)
            wind = vre * random.uniform(0.4, 0.8)
            solar = vre - wind

            # SAIDI varies by region with some noise
            base_saidi = {
                "West": 150, "South": 200, "Midwest": 120, "Northeast": 100
            }[region]
            saidi = base_saidi * random.uniform(0.6, 1.4)

            sample_points.append({
                "state": state_name,
                "stateCode": state_code,
                "year": year,
                "saidi": round(saidi, 1),
                "saifi": round(saidi / 100 * random.uniform(0.9, 1.1), 2),
                "vrePenetration": round(vre, 1),
                "windPenetration": round(wind, 1),
                "solarPenetration": round(solar, 1),
                "totalGeneration": random.randint(10000, 500000),
                "customerCount": random.randint(100000, 5000000),
                "region": region
            })

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "points": sample_points,
        "metadata": {
            "lastUpdated": datetime.now().isoformat(),
            "yearsAvailable": list(range(2013, 2024)),
            "states": sorted(STATE_INFO.keys()),
            "regions": ["Midwest", "Northeast", "South", "West"],
            "dataSource": "Sample data for development"
        }
    }

    output_file = OUTPUT_DIR / "saidi-vre.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Sample data saved to: {output_file}")
    print(f"Total points: {len(sample_points)}")


if __name__ == "__main__":
    import sys

    if "--sample" in sys.argv:
        create_sample_data()
    elif "--utilities" in sys.argv:
        # Build only utility data
        build_utility_json()
    else:
        # Check if we have raw data
        gen_dir = RAW_DATA_DIR / "generation"
        rel_dir = RAW_DATA_DIR / "reliability"

        if not gen_dir.exists() or not rel_dir.exists():
            print("Raw data directories not found.")
            print("Run 'python fetch_eia_data.py' first to download data.")
            print("\nCreating sample data instead...")
            create_sample_data()
        else:
            # Build both state-level and utility-level data
            build_chart_json()

            # Also build utility data if available
            if UTILITY_RAW_DIR.exists():
                build_utility_json()
            else:
                print("\nNo utility data found. Run 'python fetch_form861.py' to generate.")
