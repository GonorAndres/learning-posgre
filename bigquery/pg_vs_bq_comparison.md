# PostgreSQL vs BigQuery: Side-by-Side Comparison

Real-world evidence from migrating the airlines demo database (5.74M rows, 8 tables).

---

## Performance Comparison

Queries run against the same dataset. PG: local Docker (1 CPU, 512MB RAM). BQ: on-demand pricing in `US` region.

| Query | PG (no index) | PG (with index) | BigQuery | BQ Bytes Scanned |
|:------|:-------------|:----------------|:---------|:----------------|
| Route delay analysis (49K flights, 2 JOINs, GROUP BY) | 292ms | 111ms | ~1.5s (first run), ~0.5s (cached) | ~4MB |
| Revenue by fare class (2.3M ticket_flights JOIN flights) | 1,635ms | ~400ms (with idx_tf_flight_id) | ~1.2s | ~25MB |
| Single flight revenue (point lookup, 1 flight_id) | 1,283ms | 2.6ms (13x faster) | ~0.8s | ~25MB |
| Flights from SVO (filter on departure_airport + status) | 33.9ms | 2.6ms (13x faster) | ~0.5s | ~3MB |
| Materialized view query (pre-computed) | 0.13ms | 0.13ms | N/A | N/A |

### Key Observations

1. **PostgreSQL wins on point lookups.** With a proper index, a single-row lookup takes 2.6ms. BigQuery's minimum query time is ~500ms due to job scheduling overhead -- 200x slower for this pattern.

2. **BigQuery wins on full-table scans at scale.** For analytical queries that scan millions of rows, BigQuery's columnar storage and massive parallelism keep query times flat regardless of table size. PG times grow linearly with data.

3. **Indexes are PG's superpower (and burden).** The 13x improvement from `idx_flights_dep_status` is dramatic -- but you have to design, create, and maintain those indexes. BQ handles optimization automatically via partitioning and clustering.

4. **Materialized views have no BQ equivalent.** PG's `mv_route_delay_summary` serves dashboard queries in 0.13ms. The closest BQ pattern is scheduled queries writing to a summary table, or BI Engine for sub-second OLAP.

---

## Query Syntax Comparison

| Concept | PostgreSQL | BigQuery |
|:--------|:-----------|:---------|
| Conditional count | `COUNT(*) FILTER (WHERE ...)` | `COUNTIF(...)` |
| Time interval | `INTERVAL '15 min'` | `INTERVAL 15 MINUTE` |
| Epoch extraction | `EXTRACT(EPOCH FROM (ts1 - ts2))` | `TIMESTAMP_DIFF(ts1, ts2, SECOND)` |
| JSONB access | `column->>'key'` | N/A (flattened in ETL) or `JSON_VALUE(col, '$.key')` |
| Timezone conversion | `timezone('UTC', ts)` | Not needed (always UTC) |
| Median | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY col)` | `APPROX_QUANTILES(col, 2)[OFFSET(1)]` |
| Window functions | Full support | Full support (identical syntax) |
| CTEs | Inlined since PG 12 | Always optimized |
| LATERAL join | `JOIN LATERAL (...) ON TRUE` | Not supported; use correlated subquery |

---

## Architecture Differences

| Dimension | PostgreSQL | BigQuery |
|:----------|:-----------|:---------|
| **Storage model** | Row-oriented (heap) | Columnar (Capacitor) |
| **Query execution** | Single-node, multi-process | Massively parallel (Dremel) |
| **Indexing** | B-tree, GIN, GiST, BRIN, partial, expression | Partition pruning, clustering, search indexes |
| **Transactions** | Full ACID, MVCC | Snapshot isolation on tables, no row-level locks |
| **Schema changes** | `ALTER TABLE` (may lock) | `ALTER TABLE` (instant, metadata-only) |
| **Vacuuming** | Required (dead tuples from MVCC) | Not applicable (append-only storage) |
| **Connections** | Per-client process (max_connections limit) | Serverless (no connection management) |
| **Replication** | Streaming replication, logical replication | Automatic (multi-region optional) |

---

## Cost Analysis (This Dataset)

### Cloud SQL (PostgreSQL)

| Tier | vCPUs | RAM | Storage | Monthly Cost |
|:-----|:------|:----|:--------|:-------------|
| db-f1-micro | Shared | 614MB | 10GB SSD | ~$7/mo |
| db-custom-1-3840 | 1 | 3.75GB | 10GB SSD | ~$50/mo |
| db-custom-2-8192 | 2 | 8GB | 10GB SSD | ~$100/mo |

Plus: network egress, backup storage, HA replica (2x cost).

### BigQuery

| Resource | Usage | Cost |
|:---------|:------|:-----|
| Storage | ~500MB (active) | $0.01/mo (10GB free) |
| Queries | ~50MB per analytical query | $0.00025/query ($5/TB) |
| 1,000 analytical queries/mo | ~50GB scanned | $0.25/mo |

**For this dataset (500MB, analytical workload):** BigQuery is ~28x cheaper than the smallest Cloud SQL instance, with zero infrastructure management.

**Break-even point:** Cloud SQL becomes competitive when you need:
- Sub-10ms point lookups (API backends)
- ACID transactions across rows/tables
- Concurrent read/write workloads (OLTP)
- Application-level connections (ORMs, connection pooling)

---

## When to Use Each

### Use PostgreSQL when:
- Your application needs **transactional guarantees** (orders, payments, inventory)
- Queries are **point lookups** by primary key or narrow filters with indexes
- You need **sub-millisecond latency** (API response times)
- Your data model has **complex relationships** enforced by foreign keys
- You need **real-time updates** visible to concurrent readers
- Data fits on a single machine (< 1TB active data)

### Use BigQuery when:
- You're running **analytical queries** over large datasets (aggregations, GROUP BY, JOINs across millions of rows)
- Query patterns are **ad-hoc and unpredictable** (no time to design indexes)
- You want **zero infrastructure management** (no VACUUM, no connection limits, no disk sizing)
- You need to **join with other GCP data** (Cloud Logging, GA4, Pub/Sub)
- **Cost matters more than latency** (pay-per-query vs always-on instance)
- Data is mostly **append-only** (event logs, analytics, historical records)

### Use both when:
- **OLTP in PostgreSQL, OLAP in BigQuery.** This project's pipeline demonstrates exactly this pattern: operational data lives in PG, analytical copies flow to BQ for dashboarding and ad-hoc analysis.

---

## Migration Pipeline Performance

| Metric | Value |
|:-------|:------|
| Total rows migrated | 5,744,250 |
| Tables migrated | 8 |
| Extract time (PG -> Python) | ~34s |
| Transform time (type mapping, JSONB flattening) | <1s |
| Load time (Python -> BQ) | ~65s |
| **Total pipeline time** | **~102s** |
| Rows per second (end-to-end) | ~56,300 |

Schema transformations applied:
- 3 JSONB columns flattened to 6 STRING columns
- 1 `point` column split to `longitude` + `latitude` FLOAT64
- All `timestamptz` converted to UTC
- All `character(N)` stripped of trailing whitespace
- `contact_data` JSONB serialized as JSON string
