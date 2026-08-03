# Flight Analytics Platform

> Route, revenue and fleet analytics over an airline network of 104 airports and 532 routes, served as a static dashboard and backed by a PostgreSQL-to-BigQuery pipeline.

**Live:** https://analytics-flights.gonor.me

---

## The Question

**"Which routes lose the most time to delays, where does revenue concentrate, and how do PostgreSQL and BigQuery compare for the same analytical workload?"**

The platform runs SQL analytics over an 8-table, 5.74M-row flight schema, documents the query-performance work behind each dashboard view, and ships a complete migration pipeline to BigQuery.

---

## Key Findings

| Insight | Evidence |
|:--------|:--------|
| Worst routes hit 11.1% delay rate (Voronezh-Pulkovo: 10/90 flights delayed) | `analysis/01_delays.sql` |
| Economy class: 70.8% of revenue from 88% of tickets; Business: 26.5% from 10% | `analysis/02_revenue.sql` |
| Boeing 777-300 leads fleet at 72.8% load factor; Cessna 208 at just 16% | `analysis/03_utilization.sql` |
| Composite index on flights: 33.9ms -> 2.6ms (13x faster) | `analysis/04_optimization.sql` |
| Materialized views: 174ms -> 0.13ms (1,300x faster for dashboard queries) | `analysis/05_materialized_views.sql` |
| Full pipeline: 5.74M rows migrated PG -> BQ in 102 seconds | `pipeline/run_pipeline.py` |

---

## Architecture

```
Source dataset (5.74M rows, 8 tables)
        |
        v
Local PostgreSQL 16 (Docker, production-like config)
        |
        |--- 5 analysis scripts (delays, revenue, utilization, optimization, mat views)
        |--- 6 internals scripts (EXPLAIN, indexes, partitioning, pg_stat, VACUUM, WAL)
        |
        v
Python ETL Pipeline (extract -> transform -> load)
        |  - Server-side cursor extraction (~56K rows/s)
        |  - JSONB flattening, point parsing, type mapping
        |  - BigQuery load via google-cloud-bigquery
        v
Google BigQuery (airlines_demo dataset)
        |
        |--- Same queries in BigQuery Standard SQL
        |--- Documented syntax differences (COUNTIF, TIMESTAMP_DIFF, etc.)
        v
PG vs BQ Comparison (real timing, cost analysis, when-to-use-each)
```

---

## What the Data Looks Like

```
bookings ──> tickets ──> ticket_flights ──> flights ──> airports_data
                              |                |
                              v                v
                        boarding_passes    aircrafts_data ──> seats
```

| Table | What it holds | Rows |
|:------|:-------------|-----:|
| ticket_flights | Which ticket is on which flight + fare paid | 2,360,335 |
| boarding_passes | Seat assignments per passenger | 1,894,295 |
| tickets | Individual tickets linked to bookings | 829,071 |
| bookings | Reservation records with total amount | 593,433 |
| flights | Every flight with scheduled vs actual times | 65,664 |
| seats | Seat map per aircraft with fare class | 1,339 |
| airports_data | 104 Russian airports with coordinates + timezone | 104 |
| aircrafts_data | 9 aircraft models with range | 9 |

---

## PostgreSQL vs BigQuery

Same queries, same data, different systems. Full analysis in [`bigquery/pg_vs_bq_comparison.md`](bigquery/pg_vs_bq_comparison.md).

| Query | PostgreSQL | BigQuery | Winner |
|:------|:-----------|:---------|:-------|
| Route delay analysis (49K rows, 2 JOINs) | 111ms (indexed) | ~1.5s | PG |
| Revenue by fare class (2.3M rows) | 1,635ms | ~1.2s | BQ |
| Point lookup (1 flight by ID) | 2.6ms (indexed) | ~800ms | PG (300x) |
| Materialized view query | 0.13ms | N/A | PG |
| Cost for this dataset (monthly) | ~$7-100 (Cloud SQL) | ~$0.25 | BQ (28x) |

**Use PostgreSQL for:** OLTP, point lookups, transactions, sub-ms latency.
**Use BigQuery for:** OLAP, full scans, ad-hoc analytics, zero-ops.
**Use both for:** Operational data in PG, analytical copies in BQ (this project's pattern).

---

## Technical Highlights

### Analysis (PostgreSQL)

| Technique | Where | Impact |
|:----------|:------|:-------|
| Composite indexes | `flights(departure_airport, status)` | 13x query speedup |
| Partial indexes | `flights WHERE status = 'Arrived'` | Smaller index, targeted scans |
| Materialized views | Route delay, daily revenue, utilization | 1,300x dashboard speedup |
| JSONB queries | `airport_name->>'en'`, `contact_data` | Multilingual data access |
| Window functions | `LAG()`, `RANK()`, `SUM() OVER()` | Trend analysis, Pareto |
| EXPLAIN ANALYZE | Every major query | Documented before/after proof |

### Internals Deep-Dives

| Script | Demonstrates |
|:-------|:-------------|
| `01_explain_deep_dive.sql` | Seq Scan vs Index Scan vs Bitmap, Nested Loop vs Hash vs Merge Join |
| `02_index_strategies.sql` | B-tree composite, partial, expression, GIN (JSONB), covering (INCLUDE) |
| `03_partitioning.sql` | Range partitioning by month, partition pruning, maintenance |
| `04_statistics_monitoring.sql` | pg_stat_user_tables, cache hit ratio, unused indexes, bloat |
| `05_vacuum_tuning.sql` | Dead tuples, VACUUM vs VACUUM FULL, autovacuum config, XID wraparound |
| `06_wal_checkpoints.sql` | WAL generation rate, checkpoint stats, Cloud SQL context |

### Migration Pipeline

| Component | Technology |
|:----------|:-----------|
| Extract | `psycopg2` with batched cursor reads |
| Transform | `pandas` -- JSONB flattening, point parsing, type mapping |
| Load | `google-cloud-bigquery` with ADC auth |
| BigQuery SQL | Standard SQL equivalents with annotated syntax differences |

### Visualization and Geospatial

| Visualization | What it shows |
|:-------------|:-------------|
| Delay heatmap | Hour x day-of-week delay clustering (plotly) |
| Revenue Pareto curve | Route revenue concentration with 80/20 line |
| Load factor bars | Aircraft efficiency ranked (Boeing 777 at 72.8% to Cessna at 16%) |
| Performance chart | Before/after indexing speedups (13x to 1,300x) |
| Interactive route map | 104 airports + route lines colored by delay rate (folium) |
| Delay hotspot map | Airports colored green-to-red by delay severity |
| Geospatial SQL | Haversine distances in PG (`point` type) vs BQ (`ST_GEOGPOINT`) |

---

## Project Structure

```
learning_posgre/
  docker-compose.yml              # PostgreSQL 16 (512MB, 1 CPU, Cloud SQL-like)
  config/postgresql.conf          # Production-tuned config
  init-scripts/                   # E-commerce schema + seed data
  analysis/
    01_delays.sql                 # Route delay patterns (real metrics)
    02_revenue.sql                # Revenue by fare class, route, booking window
    03_utilization.sql            # Load factor, turnaround time, fleet efficiency
    04_optimization.sql           # EXPLAIN ANALYZE before/after indexing
    05_materialized_views.sql     # Pre-computed dashboard views
    06_geospatial.sql             # Haversine distances, route maps, revenue/km
  notebooks/
    flight_analytics.ipynb        # Interactive charts and maps (plotly + folium)
  internals/
    01_explain_deep_dive.sql      # Execution plan anatomy
    02_index_strategies.sql       # 5 index types compared
    03_partitioning.sql           # Range partitioning demonstration
    04_statistics_monitoring.sql  # pg_stat views and cache analysis
    05_vacuum_tuning.sql          # Dead tuples, autovacuum, XID wraparound
    06_wal_checkpoints.sql        # WAL generation and checkpoint monitoring
  pipeline/
    config.py                     # Environment-based configuration
    extract.py                    # PostgreSQL -> pandas (batched)
    transform.py                  # Type mapping, JSONB flattening
    load.py                       # pandas -> BigQuery (ADC auth)
    run_pipeline.py               # CLI orchestrator
  bigquery/
    schema_translation.md         # PG types -> BQ types (column-by-column)
    01_delays_bq.sql              # Delay analysis in BigQuery SQL
    02_revenue_bq.sql             # Revenue analysis in BigQuery SQL
    03_utilization_bq.sql         # Utilization in BigQuery SQL
    04_geospatial_bq.sql          # Geospatial with ST_GEOGPOINT / ST_DISTANCE
    pg_vs_bq_comparison.md        # Performance, cost, and architecture comparison
  results/                        # Pre-computed output from all scripts
```

---

## Pre-computed Results

Don't want to spin up Docker? The `results/` directory contains the full output of every analysis and internals script, captured from a real run against the 5.74M-row dataset. 12 files, 1,800+ lines of actual query results, EXPLAIN ANALYZE plans, and pg_stat metrics.

---

## Setup (Reproduce Locally)

```bash
# 1. Start PostgreSQL
cd learning_posgre && docker compose up -d --wait

# 2. Download and load the airline demo database
curl -O https://edu.postgrespro.com/demo-medium-en.zip
unzip demo-medium-en.zip
docker exec -i learning_pg psql -U app_user -d postgres < demo-medium-en-20170815.sql

# 3. Run analysis
for f in analysis/0*.sql; do
  docker exec -i learning_pg psql -U app_user -d demo < "$f"
done

# 4. Run the migration pipeline (requires gcloud auth)
python3 -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt
python pipeline/run_pipeline.py
```

---

## Technologies

PostgreSQL 16 | BigQuery | Python | Docker Compose | EXPLAIN ANALYZE | Materialized Views | Table Partitioning | GIN Indexes | JSONB | Window Functions | ETL Pipeline | Plotly | Folium | GIS | `gcloud` ADC

---

## Data Source

[PostgresPro Demo Database "Airlines"](https://postgrespro.com/community/demodb) -- distributed under the PostgreSQL license. Real flight schedule data across 104 Russian airports.
