"""
Extract data from PostgreSQL using server-side cursors for memory efficiency.
Large tables (ticket_flights, boarding_passes) are extracted in batches.
"""
import time
import psycopg2
import psycopg2.extras
import pandas as pd
from config import PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE, PG_SCHEMA, BATCH_SIZE


def get_pg_connection():
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        user=PG_USER,
        password=PG_PASSWORD,
        database=PG_DATABASE,
    )


def get_table_count(conn, table: str) -> int:
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {PG_SCHEMA}.{table}")
        return cur.fetchone()[0]


def get_column_info(conn, table: str) -> list[dict]:
    """Get column names and types from information_schema."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
        """, (PG_SCHEMA, table))
        return cur.fetchall()


def extract_table(conn, table: str) -> pd.DataFrame:
    """
    Extract a full table into a pandas DataFrame.
    Uses server-side cursor for tables over BATCH_SIZE rows.
    """
    row_count = get_table_count(conn, table)
    print(f"  Extracting {table}: {row_count:,} rows...", end=" ", flush=True)
    start = time.time()

    # Use a regular cursor and fetch in chunks for all tables.
    # Named cursors in psycopg2 can have issues with description timing.
    chunks = []
    with conn.cursor() as cur:
        cur.execute(f"SELECT * FROM {PG_SCHEMA}.{table}")
        columns = [desc[0] for desc in cur.description]
        while True:
            rows = cur.fetchmany(BATCH_SIZE)
            if not rows:
                break
            chunks.append(pd.DataFrame(rows, columns=columns))
    df = pd.concat(chunks, ignore_index=True) if chunks else pd.DataFrame()

    elapsed = time.time() - start
    print(f"{len(df):,} rows in {elapsed:.1f}s ({len(df)/max(elapsed,0.01):,.0f} rows/s)")
    return df


def extract_all(tables: list[str]) -> dict[str, pd.DataFrame]:
    """Extract all specified tables and return as a dict of DataFrames."""
    conn = get_pg_connection()
    results = {}
    try:
        for table in tables:
            results[table] = extract_table(conn, table)
    finally:
        conn.close()
    return results
