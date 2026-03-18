"""
Transform PostgreSQL data for BigQuery compatibility.

Key translations:
  - JSONB columns -> flattened into separate _en / _ru STRING columns
  - point type (coordinates) -> separate latitude / longitude FLOAT64
  - timestamptz -> ensure UTC for BigQuery TIMESTAMP
  - character(N) -> strip trailing whitespace (PG pads fixed-length strings)
"""
import json
import pandas as pd


def flatten_jsonb_column(df: pd.DataFrame, col: str, keys: list[str]) -> pd.DataFrame:
    """
    Expand a JSONB column into separate columns: col_key1, col_key2, etc.
    Drops the original JSONB column.
    """
    for key in keys:
        df[f"{col}_{key}"] = df[col].apply(
            lambda x: x.get(key) if isinstance(x, dict) else
                       json.loads(x).get(key) if isinstance(x, str) else None
        )
    df = df.drop(columns=[col])
    return df


def parse_point_column(df: pd.DataFrame, col: str) -> pd.DataFrame:
    """
    Convert PostgreSQL point '(lon,lat)' string to separate float columns.
    PostgreSQL point format: (x, y) where x=longitude, y=latitude.
    """
    def extract_coords(val):
        if val is None:
            return None, None
        s = str(val).strip('()')
        parts = s.split(',')
        if len(parts) == 2:
            return float(parts[0]), float(parts[1])
        return None, None

    coords = df[col].apply(extract_coords)
    df['longitude'] = coords.apply(lambda x: x[0])
    df['latitude'] = coords.apply(lambda x: x[1])
    df = df.drop(columns=[col])
    return df


def strip_fixed_strings(df: pd.DataFrame) -> pd.DataFrame:
    """Strip trailing whitespace from fixed-length character columns."""
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
    return df


def ensure_utc_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    """Convert timezone-aware timestamps to UTC, then remove tzinfo for BQ."""
    for col in df.select_dtypes(include=['datetimetz']).columns:
        df[col] = df[col].dt.tz_convert('UTC').dt.tz_localize(None)
    return df


def transform_table(table: str, df: pd.DataFrame) -> pd.DataFrame:
    """Apply table-specific transformations."""
    df = strip_fixed_strings(df)
    df = ensure_utc_timestamps(df)

    if table == 'aircrafts_data':
        df = flatten_jsonb_column(df, 'model', ['en', 'ru'])

    elif table == 'airports_data':
        df = flatten_jsonb_column(df, 'airport_name', ['en', 'ru'])
        df = flatten_jsonb_column(df, 'city', ['en', 'ru'])
        df = parse_point_column(df, 'coordinates')

    elif table == 'tickets':
        # contact_data is JSONB with varying keys (email, phone)
        # Flatten to JSON string for BQ (preserve flexibility)
        df['contact_data'] = df['contact_data'].apply(
            lambda x: json.dumps(x) if isinstance(x, dict) else
                       x if isinstance(x, str) else None
        )

    return df


def transform_all(data: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """Transform all extracted tables."""
    results = {}
    for table, df in data.items():
        print(f"  Transforming {table}...", end=" ", flush=True)
        results[table] = transform_table(table, df)
        print(f"done ({len(results[table].columns)} columns)")
    return results
