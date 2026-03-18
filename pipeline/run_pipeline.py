#!/usr/bin/env python3
"""
PostgreSQL -> BigQuery migration pipeline.

Usage:
    python run_pipeline.py                    # Full pipeline (all tables)
    python run_pipeline.py --extract-only     # Extract from PG only (no BQ load)
    python run_pipeline.py --tables flights bookings  # Specific tables only
    python run_pipeline.py --dry-run          # Show what would happen
"""
import sys
import os
import time
import argparse

# Add pipeline dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import TABLES, BQ_PROJECT, BQ_DATASET, PG_DATABASE
from extract import extract_all
from transform import transform_all
from load import load_all


def main():
    parser = argparse.ArgumentParser(description="PostgreSQL to BigQuery pipeline")
    parser.add_argument('--tables', nargs='+', help='Specific tables to migrate')
    parser.add_argument('--extract-only', action='store_true', help='Only extract from PG')
    parser.add_argument('--dry-run', action='store_true', help='Show plan without executing')
    args = parser.parse_args()

    tables = args.tables or TABLES
    # Validate table names
    invalid = set(tables) - set(TABLES)
    if invalid:
        print(f"Error: unknown tables: {invalid}")
        print(f"Valid tables: {TABLES}")
        sys.exit(1)

    print("=" * 60)
    print("PostgreSQL -> BigQuery Migration Pipeline")
    print("=" * 60)
    print(f"  Source: PostgreSQL ({PG_DATABASE})")
    print(f"  Target: BigQuery ({BQ_PROJECT}.{BQ_DATASET})")
    print(f"  Tables: {', '.join(tables)}")
    print(f"  Mode:   {'DRY RUN' if args.dry_run else 'extract-only' if args.extract_only else 'FULL PIPELINE'}")
    print()

    if args.dry_run:
        print("Dry run complete. No data was moved.")
        return

    # Step 1: Extract
    total_start = time.time()
    print("[1/3] EXTRACTING from PostgreSQL...")
    data = extract_all(tables)

    total_rows = sum(len(df) for df in data.values())
    print(f"\n  Total extracted: {total_rows:,} rows across {len(data)} tables\n")

    # Step 2: Transform
    print("[2/3] TRANSFORMING for BigQuery compatibility...")
    transformed = transform_all(data)
    print()

    # Step 3: Load
    if args.extract_only:
        print("[3/3] SKIPPED (--extract-only mode)")
    else:
        print("[3/3] LOADING into BigQuery...")
        load_all(transformed)

    # Summary
    elapsed = time.time() - total_start
    print()
    print("=" * 60)
    print(f"Pipeline complete in {elapsed:.1f}s")
    print(f"  {total_rows:,} rows across {len(data)} tables")
    if not args.extract_only:
        print(f"  Destination: {BQ_PROJECT}.{BQ_DATASET}")
    print("=" * 60)


if __name__ == '__main__':
    main()
