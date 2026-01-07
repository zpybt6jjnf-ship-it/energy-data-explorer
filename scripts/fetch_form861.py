#!/usr/bin/env python3
"""
Download and parse EIA Form 861 reliability data (SAIDI/SAIFI).

Form 861 data is released annually in ZIP files containing Excel spreadsheets.
The reliability data includes SAIDI and SAIFI metrics by utility.

This script extracts:
- State-level aggregated data (backward compatible)
- Utility-level data with ownership type and RTO membership

Data source: https://www.eia.gov/electricity/data/eia861/
"""

import json
import re
import sys
from io import BytesIO
from pathlib import Path
from typing import Optional, List, Dict, Tuple
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
UTILITY_OUTPUT_DIR = PROJECT_ROOT / "raw_data" / "utilities"

# EIA Form 861 base URL
FORM_861_BASE_URL = "https://www.eia.gov/electricity/data/eia861"

# Years with available reliability data (Form 861 started collecting in 2013)
AVAILABLE_YEARS = range(2013, 2024)

# RTO column names in Utility_Data file
RTO_COLUMNS = ['CAISO', 'ERCOT', 'PJM', 'NYISO', 'SPP', 'MISO', 'ISONE']

# Valid US state codes
VALID_STATES = {
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
}


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


def find_column(df: pd.DataFrame, patterns: List[str]) -> Optional[str]:
    """Find a column matching any of the given patterns (case-insensitive)."""
    cols_lower = {c.lower(): c for c in df.columns}
    for pattern in patterns:
        for col in cols_lower:
            if pattern in col.replace('-', ' ').replace('_', ' '):
                return cols_lower[col]
    return None


def extract_utility_reliability(df: pd.DataFrame) -> Optional[pd.DataFrame]:
    """
    Extract utility-level reliability data with all available fields.

    Returns DataFrame with: utility_id, utility_name, state, ownership,
    saidi, saifi, saidi_with_med, saifi_with_med, customers

    SAIDI/SAIFI without MED are the primary values (normalized baseline).
    SAIDI/SAIFI with MED include major event day impacts.
    """
    cols_lower = {c.lower(): c for c in df.columns}

    # Find required columns
    utility_id_col = find_column(df, ['utility number', 'utility_number', 'utility id'])
    utility_name_col = find_column(df, ['utility name', 'utility_name'])
    state_col = find_column(df, ['state'])
    ownership_col = find_column(df, ['ownership'])

    # Find SAIDI without MED (primary/normalized value)
    saidi_wo_med_col = find_column(df, ['saidi without', 'saidi w/o', 'saidi_wo'])

    # Find SAIDI with MED (includes major events)
    saidi_with_med_col = find_column(df, ['saidi with med', 'saidi w/ med', 'saidi_w_med'])
    if not saidi_with_med_col:
        # Try to find a generic SAIDI column that's different from without-MED
        generic_saidi = find_column(df, ['saidi'])
        if generic_saidi and generic_saidi != saidi_wo_med_col:
            saidi_with_med_col = generic_saidi

    # Use the best available column as primary SAIDI
    saidi_col = saidi_wo_med_col if saidi_wo_med_col else saidi_with_med_col
    if not saidi_col:
        saidi_col = find_column(df, ['saidi'])

    # Find SAIFI without MED (primary/normalized value)
    saifi_wo_med_col = find_column(df, ['saifi without', 'saifi w/o', 'saifi_wo'])

    # Find SAIFI with MED (includes major events)
    saifi_with_med_col = find_column(df, ['saifi with med', 'saifi w/ med', 'saifi_w_med'])
    if not saifi_with_med_col:
        generic_saifi = find_column(df, ['saifi'])
        if generic_saifi and generic_saifi != saifi_wo_med_col:
            saifi_with_med_col = generic_saifi

    # Use the best available column as primary SAIFI
    saifi_col = saifi_wo_med_col if saifi_wo_med_col else saifi_with_med_col
    if not saifi_col:
        saifi_col = find_column(df, ['saifi'])

    # Find customer count
    customers_col = find_column(df, ['number of customers', 'customers'])

    if not utility_id_col or not state_col or not saidi_col:
        print(f"    Missing required columns. Found: utility_id={utility_id_col}, state={state_col}, saidi={saidi_col}")
        return None

    # Build result DataFrame
    result = pd.DataFrame()
    result['utility_id'] = pd.to_numeric(df[utility_id_col], errors='coerce')
    result['utility_name'] = df[utility_name_col].astype(str).str.strip() if utility_name_col else ''
    result['state'] = df[state_col].astype(str).str.strip().str.upper()
    result['ownership'] = df[ownership_col].astype(str).str.strip() if ownership_col else ''
    result['saidi'] = pd.to_numeric(df[saidi_col], errors='coerce')
    result['saifi'] = pd.to_numeric(df[saifi_col], errors='coerce') if saifi_col else None
    result['customers'] = pd.to_numeric(df[customers_col], errors='coerce') if customers_col else None

    # Add "with MED" values if available (for MED toggle feature)
    if saidi_with_med_col and saidi_with_med_col != saidi_col:
        result['saidi_with_med'] = pd.to_numeric(df[saidi_with_med_col], errors='coerce')
    else:
        result['saidi_with_med'] = result['saidi']  # Same as primary if no separate column

    if saifi_with_med_col and saifi_with_med_col != saifi_col:
        result['saifi_with_med'] = pd.to_numeric(df[saifi_with_med_col], errors='coerce')
    else:
        result['saifi_with_med'] = result['saifi']  # Same as primary if no separate column

    # Filter to valid states
    result = result[result['state'].isin(VALID_STATES)]

    # Drop rows with missing critical data
    result = result.dropna(subset=['utility_id', 'saidi'])
    result['utility_id'] = result['utility_id'].astype(int)

    return result


def find_utility_data_file(zf: ZipFile, year: int) -> Optional[str]:
    """Find the Utility_Data file in the ZIP archive."""
    patterns = [
        r'utility_data.*\.xlsx?$',
        r'utility.*data.*\.xlsx?$',
    ]
    for name in zf.namelist():
        name_lower = name.lower()
        for pattern in patterns:
            if re.search(pattern, name_lower):
                return name
    return None


def parse_utility_metadata(zf: ZipFile, filename: str) -> Optional[pd.DataFrame]:
    """
    Parse utility metadata including ownership type and RTO membership.

    Returns DataFrame with: utility_id, ownership_type, nerc_region, and RTO flags
    """
    try:
        with zf.open(filename) as f:
            for skiprows in [0, 1, 2]:
                try:
                    df = pd.read_excel(f, sheet_name=0, skiprows=skiprows)
                    cols_lower = {c.lower(): c for c in df.columns}

                    # Check for utility number column
                    if any('utility number' in c or 'utility_number' in c for c in cols_lower):
                        break
                except Exception:
                    continue
            else:
                return None

        # Find columns
        utility_id_col = find_column(df, ['utility number', 'utility_number'])
        ownership_col = find_column(df, ['ownership type', 'ownership_type'])
        nerc_col = find_column(df, ['nerc region', 'nerc_region'])

        if not utility_id_col:
            return None

        result = pd.DataFrame()
        result['utility_id'] = pd.to_numeric(df[utility_id_col], errors='coerce')
        result['ownership_type'] = df[ownership_col].astype(str).str.strip() if ownership_col else ''
        result['nerc_region'] = df[nerc_col].astype(str).str.strip() if nerc_col else ''

        # Extract RTO membership flags
        for rto in RTO_COLUMNS:
            rto_col = find_column(df, [rto.lower()])
            if rto_col:
                # Convert Y/N to boolean
                result[f'rto_{rto.lower()}'] = df[rto_col].astype(str).str.upper().str.strip() == 'Y'
            else:
                result[f'rto_{rto.lower()}'] = False

        result = result.dropna(subset=['utility_id'])
        result['utility_id'] = result['utility_id'].astype(int)

        return result

    except Exception as e:
        print(f"    Error parsing utility metadata: {e}")
        return None


def extract_saidi_saifi(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and standardize SAIDI/SAIFI columns from the raw data.
    (Legacy function for backward compatibility)
    """
    utility_df = extract_utility_reliability(df)
    if utility_df is None:
        return None

    # Return only state and reliability columns
    return utility_df[['state', 'saidi', 'saifi']].copy()


def aggregate_to_state_level(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate utility-level data to state-level averages.

    Uses simple averaging (each utility weighted equally) to preserve
    visibility of smaller utility performance.

    Includes both with-MED and without-MED values for the MED toggle feature.
    """
    # Build aggregation dict based on available columns
    agg_dict = {
        'saidi': 'mean',
        'saifi': 'mean'
    }

    # Add MED columns if present
    if 'saidi_with_med' in df.columns:
        agg_dict['saidi_with_med'] = 'mean'
    if 'saifi_with_med' in df.columns:
        agg_dict['saifi_with_med'] = 'mean'

    # Simple average across all utilities in the state
    state_agg = df.groupby('state').agg(agg_dict).reset_index()

    # Add metadata
    state_agg['utility_count'] = df.groupby('state').size().values

    if 'customers' in df.columns:
        state_agg['total_customers'] = df.groupby('state')['customers'].sum().values

    # Round to reasonable precision
    state_agg['saidi'] = state_agg['saidi'].round(1)
    if 'saifi' in state_agg.columns:
        state_agg['saifi'] = state_agg['saifi'].round(2)
    if 'saidi_with_med' in state_agg.columns:
        state_agg['saidi_with_med'] = state_agg['saidi_with_med'].round(1)
    if 'saifi_with_med' in state_agg.columns:
        state_agg['saifi_with_med'] = state_agg['saifi_with_med'].round(2)

    return state_agg


def fetch_year(year: int) -> Tuple[Optional[List[Dict]], Optional[List[Dict]]]:
    """
    Fetch and process Form 861 reliability data for a single year.

    Returns tuple of:
    - state_records: list of state-level reliability records
    - utility_records: list of utility-level records with RTO membership
    """
    print(f"\nProcessing {year}...")

    # Download ZIP
    zf = download_form861_zip(year)
    if zf is None:
        return None, None

    # Find reliability file
    rel_file = find_reliability_file(zf, year)
    if rel_file is None:
        print(f"    No reliability file found in ZIP")
        return None, None

    print(f"    Found reliability: {rel_file}")

    # Parse reliability data
    raw_df = parse_reliability_data(zf, rel_file, year)
    if raw_df is None:
        return None, None

    # Extract utility-level reliability data
    utility_df = extract_utility_reliability(raw_df)
    if utility_df is None or len(utility_df) == 0:
        print(f"    No valid utility data extracted")
        return None, None

    print(f"    Found {len(utility_df)} utility records")

    # Try to get utility metadata (ownership type, RTO membership)
    util_data_file = find_utility_data_file(zf, year)
    if util_data_file:
        print(f"    Found utility metadata: {util_data_file}")
        metadata_df = parse_utility_metadata(zf, util_data_file)
        if metadata_df is not None:
            # Merge reliability with metadata
            utility_df = utility_df.merge(
                metadata_df,
                on='utility_id',
                how='left',
                suffixes=('', '_meta')
            )
            # Use ownership_type from metadata if available
            if 'ownership_type' in utility_df.columns:
                utility_df['ownership'] = utility_df['ownership_type'].fillna(utility_df['ownership'])
            print(f"    Merged with metadata: {len(utility_df)} records")
    else:
        print(f"    No utility metadata file found")
        # Add empty RTO columns
        for rto in RTO_COLUMNS:
            utility_df[f'rto_{rto.lower()}'] = False
        utility_df['nerc_region'] = ''

    # Aggregate to state level (customer-weighted)
    state_df = aggregate_to_state_level(utility_df)
    print(f"    Aggregated to {len(state_df)} states")

    # Convert state records to list of dicts
    state_records = []
    for _, row in state_df.iterrows():
        record = {
            'state': row['state'],
            'saidi': row['saidi'],
            'saifi': row['saifi'] if pd.notna(row.get('saifi')) else None,
            'year': year
        }
        # Add MED fields if available
        if 'saidi_with_med' in row and pd.notna(row.get('saidi_with_med')):
            record['saidi_with_med'] = row['saidi_with_med']
        if 'saifi_with_med' in row and pd.notna(row.get('saifi_with_med')):
            record['saifi_with_med'] = row['saifi_with_med']
        state_records.append(record)

    # Convert utility records to list of dicts
    utility_records = []
    rto_cols = [f'rto_{rto.lower()}' for rto in RTO_COLUMNS]
    for _, row in utility_df.iterrows():
        record = {
            'utility_id': int(row['utility_id']),
            'utility_name': row['utility_name'],
            'state': row['state'],
            'ownership': row['ownership'],
            'saidi': round(row['saidi'], 1) if pd.notna(row['saidi']) else None,
            'saifi': round(row['saifi'], 2) if pd.notna(row.get('saifi')) else None,
            'customers': int(row['customers']) if pd.notna(row.get('customers')) else None,
            'nerc_region': row.get('nerc_region', ''),
            'year': year
        }
        # Add MED fields if available
        if 'saidi_with_med' in row and pd.notna(row.get('saidi_with_med')):
            record['saidi_with_med'] = round(row['saidi_with_med'], 1)
        if 'saifi_with_med' in row and pd.notna(row.get('saifi_with_med')):
            record['saifi_with_med'] = round(row['saifi_with_med'], 2)
        # Add RTO flags
        for rto_col in rto_cols:
            if rto_col in row:
                record[rto_col] = bool(row[rto_col])
            else:
                record[rto_col] = False
        utility_records.append(record)

    return state_records, utility_records


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
    UTILITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Track results
    success_count = 0
    failed_years = []
    total_utilities = 0

    # Process each year
    for year in AVAILABLE_YEARS:
        state_records, utility_records = fetch_year(year)

        if state_records is None or len(state_records) == 0:
            failed_years.append(year)
            continue

        # Save state-level data (backward compatible)
        state_file = OUTPUT_DIR / f"reliability_{year}.json"
        with open(state_file, 'w') as f:
            json.dump(state_records, f, indent=2)
        print(f"    Saved state data: {state_file.name}")

        # Save utility-level data
        if utility_records:
            utility_file = UTILITY_OUTPUT_DIR / f"utilities_{year}.json"
            with open(utility_file, 'w') as f:
                json.dump(utility_records, f, indent=2)
            print(f"    Saved utility data: {utility_file.name} ({len(utility_records)} utilities)")
            total_utilities += len(utility_records)

        success_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Successfully processed: {success_count} years")
    print(f"Total utility records: {total_utilities}")

    if failed_years:
        print(f"Failed years: {failed_years}")
        print("\nNote: Recent years may not be available yet.")
        print("Form 861 data is typically released ~10 months after year end.")

    print(f"\nOutput directories:")
    print(f"  State-level: {OUTPUT_DIR}")
    print(f"  Utility-level: {UTILITY_OUTPUT_DIR}")


if __name__ == "__main__":
    main()
