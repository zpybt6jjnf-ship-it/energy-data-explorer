#!/usr/bin/env python3
"""
Download and parse EIA Form 861 reliability data (SAIDI/SAIFI).

Form 861 data is released annually in ZIP files containing Excel spreadsheets.
The reliability data includes SAIDI and SAIFI metrics by utility.

Data source: https://www.eia.gov/electricity/data/eia861/
"""

import json
import re
import sys
from io import BytesIO
from pathlib import Path
from typing import Optional, List, Dict
from zipfile import ZipFile, BadZipFile

import requests

try:
    import pandas as pd
except ImportError:
    print("Error: pandas is required. Install with: pip install pandas openpyxl")
    sys.exit(1)

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data" / "form861"
OUTPUT_DIR = PROJECT_ROOT / "raw_data" / "reliability"

# EIA Form 861 base URL
FORM_861_BASE_URL = "https://www.eia.gov/electricity/data/eia861"

# Years with available reliability data (Form 861 started collecting in 2013)
AVAILABLE_YEARS = range(2013, 2024)


def download_form861_zip(year: int) -> Optional[ZipFile]:
    """
    Download Form 861 ZIP file for a specific year.

    Returns ZipFile object or None if download fails.
    """
    # EIA uses different paths for current vs archived data
    # Current year: zip/f861YYYY.zip
    # Archived years: archive/zip/f861YYYY.zip
    import datetime
    current_year = datetime.datetime.now().year

    if year >= current_year:
        url = f"{FORM_861_BASE_URL}/zip/f861{year}.zip"
    else:
        url = f"{FORM_861_BASE_URL}/archive/zip/f861{year}.zip"

    print(f"  Downloading Form 861 for {year}...")
    print(f"    URL: {url}")

    try:
        response = requests.get(url, timeout=60)

        if response.status_code == 404:
            print(f"    File not found (data may not be released yet)")
            return None

        if response.status_code != 200:
            print(f"    Failed: HTTP {response.status_code}")
            return None

        return ZipFile(BytesIO(response.content))

    except requests.exceptions.RequestException as e:
        print(f"    Download error: {e}")
        return None
    except BadZipFile:
        print(f"    Error: Downloaded file is not a valid ZIP")
        return None


def find_reliability_file(zf: ZipFile, year: int) -> Optional[str]:
    """
    Find the reliability data file within the ZIP archive.

    File naming varies by year, so we search for patterns.
    """
    # Common patterns for reliability files
    patterns = [
        r'reliability.*\.xlsx?$',
        r'.*reliability.*\.xlsx?$',
        r'rel_.*\.xlsx?$',
        r'.*saidi.*\.xlsx?$',
    ]

    for name in zf.namelist():
        name_lower = name.lower()
        for pattern in patterns:
            if re.search(pattern, name_lower):
                return name

    # List available files for debugging
    xlsx_files = [f for f in zf.namelist() if f.endswith('.xlsx') or f.endswith('.xls')]
    if xlsx_files:
        print(f"    Available Excel files: {xlsx_files[:5]}...")

    return None


def parse_reliability_data(zf: ZipFile, filename: str, year: int) -> Optional[pd.DataFrame]:
    """
    Parse reliability data from the Excel file.

    Handles different column naming conventions across years.
    """
    try:
        with zf.open(filename) as f:
            # Try reading with header on different rows (EIA format varies)
            for skiprows in [0, 1, 2]:
                try:
                    df = pd.read_excel(f, sheet_name=0, skiprows=skiprows)

                    # Look for key columns
                    cols_lower = {c.lower(): c for c in df.columns}

                    # Check if this looks like the right data
                    has_state = any('state' in c for c in cols_lower)
                    has_saidi = any('saidi' in c for c in cols_lower)

                    if has_state and has_saidi:
                        return df

                except Exception:
                    continue

        print(f"    Could not find expected columns in {filename}")
        return None

    except Exception as e:
        print(f"    Error parsing {filename}: {e}")
        return None


def extract_saidi_saifi(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and standardize SAIDI/SAIFI columns from the raw data.

    Handles various column naming conventions:
    - "SAIDI Without Major Event Days"
    - "SAIDI with MED"
    - "SAIDI_wo_MED"
    - etc.
    """
    cols_lower = {c.lower(): c for c in df.columns}

    # Find state column
    state_col = None
    for pattern in ['state', 'st']:
        for col in cols_lower:
            if pattern in col:
                state_col = cols_lower[col]
                break
        if state_col:
            break

    # Find SAIDI column (prefer "without MED" / "w/o MED" versions)
    saidi_col = None
    for pattern in ['saidi without', 'saidi w/o', 'saidi_wo', 'saidi wo']:
        for col in cols_lower:
            if pattern in col.replace('-', ' ').replace('_', ' '):
                saidi_col = cols_lower[col]
                break
        if saidi_col:
            break

    # Fallback to any SAIDI column
    if not saidi_col:
        for col in cols_lower:
            if 'saidi' in col:
                saidi_col = cols_lower[col]
                break

    # Find SAIFI column
    saifi_col = None
    for pattern in ['saifi without', 'saifi w/o', 'saifi_wo', 'saifi wo']:
        for col in cols_lower:
            if pattern in col.replace('-', ' ').replace('_', ' '):
                saifi_col = cols_lower[col]
                break
        if saifi_col:
            break

    if not saifi_col:
        for col in cols_lower:
            if 'saifi' in col:
                saifi_col = cols_lower[col]
                break

    if not state_col or not saidi_col:
        print(f"    Missing required columns. Found: state={state_col}, saidi={saidi_col}")
        return None

    # Extract and clean data
    result = df[[state_col]].copy()
    result.columns = ['state']

    result['saidi'] = pd.to_numeric(df[saidi_col], errors='coerce')

    if saifi_col:
        result['saifi'] = pd.to_numeric(df[saifi_col], errors='coerce')
    else:
        result['saifi'] = result['saidi'] / 100  # Estimate if not available

    # Clean state codes
    result['state'] = result['state'].astype(str).str.strip().str.upper()

    # Filter to valid 2-letter state codes
    valid_states = {
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    }
    result = result[result['state'].isin(valid_states)]

    # Drop rows with missing SAIDI
    result = result.dropna(subset=['saidi'])

    return result


def aggregate_to_state_level(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate utility-level data to state-level averages.

    Ideally this would be customer-weighted, but we use simple average
    as a fallback when customer counts aren't available.
    """
    # Group by state and calculate mean
    state_agg = df.groupby('state').agg({
        'saidi': 'mean',
        'saifi': 'mean'
    }).reset_index()

    # Round to reasonable precision
    state_agg['saidi'] = state_agg['saidi'].round(1)
    state_agg['saifi'] = state_agg['saifi'].round(2)

    return state_agg


def fetch_year(year: int) -> Optional[List[Dict]]:
    """
    Fetch and process Form 861 reliability data for a single year.

    Returns list of state-level reliability records, or None on failure.
    """
    print(f"\nProcessing {year}...")

    # Download ZIP
    zf = download_form861_zip(year)
    if zf is None:
        return None

    # Find reliability file
    rel_file = find_reliability_file(zf, year)
    if rel_file is None:
        print(f"    No reliability file found in ZIP")
        return None

    print(f"    Found: {rel_file}")

    # Parse data
    raw_df = parse_reliability_data(zf, rel_file, year)
    if raw_df is None:
        return None

    # Extract SAIDI/SAIFI columns
    clean_df = extract_saidi_saifi(raw_df)
    if clean_df is None or len(clean_df) == 0:
        print(f"    No valid data extracted")
        return None

    # Aggregate to state level
    state_df = aggregate_to_state_level(clean_df)

    print(f"    Extracted {len(state_df)} states")

    # Convert to list of dicts
    records = []
    for _, row in state_df.iterrows():
        records.append({
            'state': row['state'],
            'saidi': row['saidi'],
            'saifi': row['saifi'],
            'year': year
        })

    return records


def main():
    """Main function to fetch all Form 861 reliability data."""
    print("=" * 60)
    print("EIA Form 861 Reliability Data Fetcher")
    print("=" * 60)
    print(f"\nData source: {FORM_861_BASE_URL}")
    print(f"Years to fetch: {min(AVAILABLE_YEARS)} - {max(AVAILABLE_YEARS)}")

    # Create output directories
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Track results
    success_count = 0
    failed_years = []

    # Process each year
    for year in AVAILABLE_YEARS:
        records = fetch_year(year)

        if records is None or len(records) == 0:
            failed_years.append(year)
            continue

        # Save to JSON
        output_file = OUTPUT_DIR / f"reliability_{year}.json"
        with open(output_file, 'w') as f:
            json.dump(records, f, indent=2)

        print(f"    Saved: {output_file.name}")
        success_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Successfully processed: {success_count} years")

    if failed_years:
        print(f"Failed years: {failed_years}")
        print("\nNote: Recent years may not be available yet.")
        print("Form 861 data is typically released ~10 months after year end.")

    print(f"\nOutput directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
