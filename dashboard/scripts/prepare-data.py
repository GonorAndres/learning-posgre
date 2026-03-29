#!/usr/bin/env python3
"""Parse results/*.txt into structured JSON for the dashboard.
Also extracts airports, routes, and heatmap data from Docker PG."""

import json
import re
import os
import sys

RESULTS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'results')
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)


def parse_psql_table(text: str) -> list[dict]:
    """Parse a psql-formatted table (pipe-delimited) into list of dicts."""
    lines = [l for l in text.strip().split('\n') if l.strip()]
    if not lines:
        return []

    # Find header line (contains | separators)
    header_idx = None
    for i, line in enumerate(lines):
        if '|' in line and not line.strip().startswith(('--', '(', 'SET', 'CREATE', 'DROP', 'ANALYZE', 'NOTICE')):
            header_idx = i
            break
    if header_idx is None:
        return []

    headers = [h.strip() for h in lines[header_idx].split('|')]

    # Skip separator line (dashes)
    data_start = header_idx + 1
    if data_start < len(lines) and re.match(r'^[\s\-+]+$', lines[data_start]):
        data_start += 1

    rows = []
    for line in lines[data_start:]:
        if line.strip().startswith('(') and 'row' in line:
            break
        if '|' not in line:
            continue
        values = [v.strip() for v in line.split('|')]
        if len(values) != len(headers):
            continue
        row = {}
        for h, v in zip(headers, values):
            if not h:
                continue
            row[h] = auto_type(v)
        rows.append(row)
    return rows


def auto_type(val: str):
    """Convert string value to appropriate Python type."""
    if val == '' or val is None:
        return None
    # Remove commas from numbers like "26,663,985,500"
    cleaned = val.replace(',', '')
    try:
        if '.' in cleaned:
            return float(cleaned)
        return int(cleaned)
    except ValueError:
        return val


def split_sections(text: str) -> dict[str, str]:
    """Split a results file into named sections by === markers."""
    sections = {}
    pattern = r'===\s*(.+?)\s*==='
    parts = re.split(pattern, text)
    # parts: [preamble, name1, content1, name2, content2, ...]
    for i in range(1, len(parts) - 1, 2):
        name = parts[i].strip()
        content = parts[i + 1]
        sections[name] = content
    return sections


def extract_execution_time(text: str) -> float | None:
    """Extract Execution Time from EXPLAIN ANALYZE output."""
    m = re.search(r'Execution Time:\s*([\d.]+)\s*ms', text)
    return float(m.group(1)) if m else None


# ── Parse delays ──
def parse_delays():
    with open(os.path.join(RESULTS_DIR, '01_delays.txt')) as f:
        text = f.read()
    sections = split_sections(text)

    overview_rows = parse_psql_table(sections.get('DATASET OVERVIEW', ''))
    overview = overview_rows[0] if overview_rows else {}

    top_routes = parse_psql_table(sections.get('TOP 20 ROUTES BY DELAY PERCENTAGE (>50 flights)', ''))
    worst_airports = parse_psql_table(sections.get('WORST 15 DEPARTURE AIRPORTS BY AVG DELAY', ''))
    by_hour = parse_psql_table(sections.get('DELAY RATE BY HOUR OF DAY (LOCAL TIME)', ''))
    by_day = parse_psql_table(sections.get('DELAY RATE BY DAY OF WEEK', ''))
    recovery = parse_psql_table(sections.get('DELAY RECOVERY: LATE DEPARTURES THAT MADE UP TIME', ''))
    by_aircraft = parse_psql_table(sections.get('DELAY RATE BY AIRCRAFT TYPE', ''))

    return {
        'overview': overview,
        'topRoutes': top_routes,
        'worstAirports': worst_airports,
        'byHour': by_hour,
        'byDay': by_day,
        'recovery': recovery[0] if recovery else {},
        'byAircraft': by_aircraft,
    }


# ── Parse revenue ──
def parse_revenue():
    with open(os.path.join(RESULTS_DIR, '02_revenue.txt')) as f:
        text = f.read()
    sections = split_sections(text)

    by_fare = parse_psql_table(sections.get('REVENUE BY FARE CLASS', ''))
    top_routes = parse_psql_table(sections.get('TOP 20 ROUTES BY REVENUE', ''))
    by_aircraft = parse_psql_table(sections.get('REVENUE BY AIRCRAFT TYPE', ''))

    # Lead time
    lead_time = parse_psql_table(sections.get('BOOKING LEAD TIME vs PRICE', ''))

    # Pareto
    pareto = parse_psql_table(sections.get('PARETO: REVENUE CONCENTRATION BY ROUTE', ''))
    pareto_summary = parse_psql_table(sections.get('PARETO SUMMARY', ''))

    # Monthly
    monthly = parse_psql_table(sections.get('MONTHLY REVENUE TREND', ''))

    return {
        'byFareClass': by_fare,
        'topRoutes': top_routes,
        'byAircraft': by_aircraft,
        'leadTime': lead_time,
        'pareto': pareto,
        'paretoSummary': pareto_summary[0] if pareto_summary else {},
        'monthlyTrend': monthly,
    }


# ── Parse utilization ──
def parse_utilization():
    with open(os.path.join(RESULTS_DIR, '03_utilization.txt')) as f:
        text = f.read()
    sections = split_sections(text)

    fleet = parse_psql_table(sections.get('FLEET OVERVIEW', ''))
    seats = parse_psql_table(sections.get('SEAT CAPACITY BY AIRCRAFT AND CLASS', ''))
    load_factor = parse_psql_table(sections.get('LOAD FACTOR BY AIRCRAFT TYPE', ''))
    worst_routes = parse_psql_table(sections.get('ROUTES WITH LOWEST LOAD FACTOR (30+ flights)', ''))
    turnaround = parse_psql_table(sections.get('TURNAROUND TIME BY AIRCRAFT TYPE', ''))
    by_day = parse_psql_table(sections.get('UTILIZATION BY DAY OF WEEK', ''))

    return {
        'fleet': fleet,
        'seatCapacity': seats,
        'loadFactor': load_factor,
        'worstRoutes': worst_routes,
        'turnaround': turnaround,
        'loadByDay': by_day,
    }


# ── Parse optimization ──
def parse_optimization():
    with open(os.path.join(RESULTS_DIR, '04_optimization.txt')) as f:
        text = f.read()
    sections = split_sections(text)

    indexes = parse_psql_table(sections.get('EXISTING INDEXES', ''))
    index_sizes = parse_psql_table(sections.get('INDEX SIZE ANALYSIS', ''))
    table_sizes = parse_psql_table(sections.get('TABLE SIZE ANALYSIS', ''))

    # Extract before/after execution times
    speedups = []
    pairs = [
        ('Flights from SVO with status Arrived', 'BEFORE INDEX: Flights from SVO with status Arrived',
         'AFTER INDEX: Flights from SVO with status Arrived'),
        ('Route delay analysis', 'BEFORE INDEX: Route delay analysis',
         'AFTER INDEX: Route delay analysis'),
        ('Revenue for specific flight', 'BEFORE INDEX: Revenue for specific flight',
         'AFTER INDEX: Revenue for specific flight'),
    ]
    for label, before_key, after_key in pairs:
        before_t = extract_execution_time(sections.get(before_key, ''))
        after_t = extract_execution_time(sections.get(after_key, ''))
        if before_t and after_t:
            speedups.append({
                'query': label,
                'before_ms': before_t,
                'after_ms': after_t,
                'speedup': f'{before_t / after_t:.0f}x'
            })

    return {
        'indexes': indexes,
        'indexSizes': index_sizes,
        'tableSizes': table_sizes,
        'speedups': speedups,
    }


# ── Parse materialized views ──
def parse_mat_views():
    with open(os.path.join(RESULTS_DIR, '05_materialized_views.txt')) as f:
        text = f.read()
    sections = split_sections(text)

    raw_t = extract_execution_time(sections.get('PERFORMANCE: Raw query (scans flights + airports + aggregation)', ''))
    mv_t = extract_execution_time(sections.get('PERFORMANCE: Materialized view (pre-computed, indexed)', ''))

    return {
        'raw_ms': raw_t,
        'mv_ms': mv_t,
        'speedup': f'{raw_t / mv_t:.0f}x' if raw_t and mv_t else None,
    }


# ── Parse geospatial ──
def parse_geospatial():
    with open(os.path.join(RESULTS_DIR, '06_geospatial.txt')) as f:
        text = f.read()
    sections = split_sections(text)

    longest = parse_psql_table(sections.get('TOP 20 LONGEST ROUTES BY DISTANCE', ''))
    by_distance = parse_psql_table(sections.get('DELAY RATE BY DISTANCE BUCKET', ''))
    hubs = parse_psql_table(sections.get('AIRPORT CONNECTIVITY (top 20 by destinations)', ''))
    rev_per_km = parse_psql_table(sections.get('REVENUE PER KILOMETER (top 20 routes, 50+ flights)', ''))
    extremes = parse_psql_table(sections.get('GEOGRAPHIC EXTREMES', ''))

    return {
        'longestRoutes': longest,
        'delayByDistance': by_distance,
        'hubs': hubs,
        'revenuePerKm': rev_per_km,
        'extremes': extremes,
    }


# ── Extract from DB (airports, routes, heatmap) ──
def extract_from_db():
    try:
        import psycopg2
    except ImportError:
        print("WARNING: psycopg2 not available, skipping DB extraction.")
        print("  Run: pip install psycopg2-binary")
        return False

    try:
        conn = psycopg2.connect(
            host='localhost', port=5432,
            user='app_user', password='dev_secret_123',
            database='demo'
        )
    except Exception as e:
        print(f"WARNING: Cannot connect to DB ({e}), skipping DB extraction.")
        print("  Ensure Docker PG is running: docker compose up -d")
        return False

    import pandas as pd
    cur = conn.cursor()

    # Airports
    cur.execute("""
        SELECT a.airport_code AS code,
               a.airport_name->>'en' AS name,
               a.city->>'en' AS city,
               a.coordinates[0] AS lon,
               a.coordinates[1] AS lat,
               a.timezone,
               COALESCE(t.departures, 0) AS departures,
               COALESCE(d.destinations, 0) AS destinations
        FROM bookings.airports_data a
        LEFT JOIN (
            SELECT departure_airport AS code, COUNT(*) AS departures
            FROM bookings.flights WHERE status='Arrived'
            GROUP BY departure_airport
        ) t ON t.code = a.airport_code
        LEFT JOIN (
            SELECT departure_airport AS code, COUNT(DISTINCT arrival_airport) AS destinations
            FROM bookings.flights WHERE status='Arrived'
            GROUP BY departure_airport
        ) d ON d.code = a.airport_code
    """)
    cols = [desc[0] for desc in cur.description]
    airports = [dict(zip(cols, row)) for row in cur.fetchall()]
    # Convert Decimal to float
    for a in airports:
        for k in ('lon', 'lat', 'departures', 'destinations'):
            if a[k] is not None:
                a[k] = float(a[k])

    save_json('airports.json', airports)
    print(f"  airports.json: {len(airports)} airports")

    # Routes
    cur.execute("""
        SELECT f.departure_airport AS dep, f.arrival_airport AS arr,
               COUNT(*) AS flights,
               ROUND(100.0 * COUNT(*) FILTER (
                   WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
               ) / COUNT(*), 1) AS delay_pct
        FROM bookings.flights f WHERE f.status='Arrived'
        GROUP BY dep, arr HAVING COUNT(*) >= 20
        ORDER BY flights DESC
    """)
    cols = [desc[0] for desc in cur.description]
    routes_raw = [dict(zip(cols, row)) for row in cur.fetchall()]

    # Attach coordinates
    airport_map = {a['code']: a for a in airports}
    routes = []
    for r in routes_raw:
        dep_a = airport_map.get(r['dep'])
        arr_a = airport_map.get(r['arr'])
        if dep_a and arr_a:
            routes.append({
                'dep': r['dep'],
                'arr': r['arr'],
                'dep_lon': dep_a['lon'],
                'dep_lat': dep_a['lat'],
                'arr_lon': arr_a['lon'],
                'arr_lat': arr_a['lat'],
                'flights': int(r['flights']),
                'delay_pct': float(r['delay_pct']),
            })

    save_json('routes.json', routes)
    print(f"  routes.json: {len(routes)} routes")

    # Heatmap (hour x day cross-tab)
    cur.execute("""
        SELECT
            EXTRACT(ISODOW FROM f.scheduled_departure)::int AS dow,
            EXTRACT(HOUR FROM timezone(dep.timezone, f.scheduled_departure))::int AS hour_local,
            COUNT(*) AS flights,
            ROUND(100.0 * COUNT(*) FILTER (
                WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
            ) / COUNT(*), 1) AS delay_pct
        FROM bookings.flights f
        JOIN bookings.airports_data dep ON dep.airport_code = f.departure_airport
        WHERE f.status = 'Arrived'
        GROUP BY dow, hour_local
    """)
    cols = [desc[0] for desc in cur.description]
    heatmap_rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    day_names = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
                 5: 'Friday', 6: 'Saturday', 7: 'Sunday'}
    for row in heatmap_rows:
        row['day_name'] = day_names.get(int(row['dow']), '')
        for k in ('dow', 'hour_local', 'flights'):
            row[k] = int(row[k])
        row['delay_pct'] = float(row['delay_pct'])

    save_json('heatmap.json', heatmap_rows)
    print(f"  heatmap.json: {len(heatmap_rows)} cells")

    conn.close()
    return True


def save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, default=str)


# ── Pipeline comparison (hand-curated from markdown) ──
def create_pipeline_json():
    data = {
        'performance': [
            {'query': 'Route delay analysis', 'pg_no_index': '292ms', 'pg_with_index': '111ms', 'bigquery': '~1.5s / ~0.5s cached', 'bq_bytes': '~4MB'},
            {'query': 'Revenue by fare class', 'pg_no_index': '1,635ms', 'pg_with_index': '~400ms', 'bigquery': '~1.2s', 'bq_bytes': '~25MB'},
            {'query': 'Single flight revenue', 'pg_no_index': '1,283ms', 'pg_with_index': '2.6ms', 'bigquery': '~0.8s', 'bq_bytes': '~25MB'},
            {'query': 'Flights from SVO', 'pg_no_index': '33.9ms', 'pg_with_index': '2.6ms', 'bigquery': '~0.5s', 'bq_bytes': '~3MB'},
            {'query': 'Materialized view query', 'pg_no_index': '174ms', 'pg_with_index': '0.13ms', 'bigquery': 'N/A', 'bq_bytes': 'N/A'},
        ],
        'syntax': [
            {'concept': 'Conditional count', 'postgresql': "COUNT(*) FILTER (WHERE ...)", 'bigquery': 'COUNTIF(...)'},
            {'concept': 'Time interval', 'postgresql': "INTERVAL '15 min'", 'bigquery': 'INTERVAL 15 MINUTE'},
            {'concept': 'Epoch extraction', 'postgresql': 'EXTRACT(EPOCH FROM (ts1 - ts2))', 'bigquery': 'TIMESTAMP_DIFF(ts1, ts2, SECOND)'},
            {'concept': 'JSONB access', 'postgresql': "column->>'key'", 'bigquery': "JSON_VALUE(col, '$.key')"},
            {'concept': 'Timezone conversion', 'postgresql': "timezone('UTC', ts)", 'bigquery': 'Not needed (always UTC)'},
            {'concept': 'Median', 'postgresql': 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY col)', 'bigquery': 'APPROX_QUANTILES(col, 2)[OFFSET(1)]'},
            {'concept': 'LATERAL join', 'postgresql': 'JOIN LATERAL (...) ON TRUE', 'bigquery': 'Not supported; use correlated subquery'},
            {'concept': 'Window functions', 'postgresql': 'Full support', 'bigquery': 'Full support (identical syntax)'},
        ],
        'architecture': [
            {'dimension': 'Storage model', 'postgresql': 'Row-oriented (heap)', 'bigquery': 'Columnar (Capacitor)'},
            {'dimension': 'Query execution', 'postgresql': 'Single-node, multi-process', 'bigquery': 'Massively parallel (Dremel)'},
            {'dimension': 'Indexing', 'postgresql': 'B-tree, GIN, GiST, BRIN, partial, expression', 'bigquery': 'Partition pruning, clustering, search indexes'},
            {'dimension': 'Transactions', 'postgresql': 'Full ACID, MVCC', 'bigquery': 'Snapshot isolation, no row-level locks'},
            {'dimension': 'Schema changes', 'postgresql': 'ALTER TABLE (may lock)', 'bigquery': 'ALTER TABLE (instant, metadata-only)'},
            {'dimension': 'Vacuuming', 'postgresql': 'Required (dead tuples from MVCC)', 'bigquery': 'Not applicable (append-only storage)'},
            {'dimension': 'Connections', 'postgresql': 'Per-client process (max_connections)', 'bigquery': 'Serverless (no connection management)'},
            {'dimension': 'Replication', 'postgresql': 'Streaming + logical replication', 'bigquery': 'Automatic (multi-region optional)'},
        ],
        'etl': {
            'total_rows': 5740000,
            'tables': 8,
            'duration_seconds': 102,
            'throughput_rows_per_sec': 56000,
        }
    }
    save_json('pipeline.json', data)
    print("  pipeline.json: hand-curated")


def main():
    print("=== Parsing results/*.txt ===")

    delays = parse_delays()
    save_json('delays.json', delays)
    print(f"  delays.json: {len(delays['topRoutes'])} routes, {len(delays['byHour'])} hours")

    revenue = parse_revenue()
    save_json('revenue.json', revenue)
    print(f"  revenue.json: {len(revenue['byFareClass'])} classes, {len(revenue['pareto'])} pareto routes")

    utilization = parse_utilization()
    save_json('utilization.json', utilization)
    print(f"  utilization.json: {len(utilization['fleet'])} aircraft")

    optimization = parse_optimization()
    save_json('optimization.json', optimization)
    print(f"  optimization.json: {len(optimization['speedups'])} speedups")

    mat_views = parse_mat_views()
    save_json('materialized-views.json', mat_views)
    print(f"  materialized-views.json: {mat_views.get('speedup', 'N/A')} speedup")

    geospatial = parse_geospatial()
    save_json('geospatial.json', geospatial)
    print(f"  geospatial.json: {len(geospatial['hubs'])} hubs")

    print("\n=== Creating pipeline.json ===")
    create_pipeline_json()

    print("\n=== Extracting from Docker PG ===")
    extract_from_db()

    print("\nDone! JSON files written to dashboard/data/")


if __name__ == '__main__':
    main()
