-- =============================================================================
-- 02_index_strategies.sql -- Custom Index Design
-- =============================================================================
-- Demonstrates when and why to use each PostgreSQL index type. Each section
-- creates an index, shows its impact on a query plan, and measures its
-- storage cost.
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < internals/02_index_strategies.sql
-- =============================================================================

SET search_path = bookings, public;

-- ---------------------------------------------------------------------------
-- 0. Baseline: list existing indexes
-- ---------------------------------------------------------------------------
\echo '=== BASELINE: Current indexes on flights ==='
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE relname = 'flights' AND schemaname = 'bookings'
ORDER BY indexname;

-- ===================================================================
-- 1. B-TREE COMPOSITE INDEX: Column order matters
-- ===================================================================

-- The composite index (departure_airport, status) is useful for:
--   WHERE departure_airport = 'SVO' AND status = 'Arrived'  (both columns)
--   WHERE departure_airport = 'SVO'                         (leading column)
-- But NOT for:
--   WHERE status = 'Arrived'                                (trailing column only)

\echo ''
\echo '=== 1a. COMPOSITE INDEX (departure_airport, status) ==='
CREATE INDEX IF NOT EXISTS idx_demo_dep_status
    ON flights(departure_airport, status);
ANALYZE flights;

-- Uses the index (matches leading + second column)
\echo 'Query matching BOTH columns:'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT flight_id FROM flights
WHERE departure_airport = 'SVO' AND status = 'Arrived';

-- Uses the index (matches leading column)
\echo ''
\echo 'Query matching LEADING column only:'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT flight_id FROM flights
WHERE departure_airport = 'SVO';

-- Does NOT use this index (trailing column only)
\echo ''
\echo 'Query matching TRAILING column only (cannot use this composite index):'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT flight_id FROM flights
WHERE status = 'Arrived';

-- Reversed order: (status, departure_airport)
\echo ''
\echo '=== 1b. REVERSED COMPOSITE INDEX (status, departure_airport) ==='
CREATE INDEX IF NOT EXISTS idx_demo_status_dep
    ON flights(status, departure_airport);
ANALYZE flights;

-- Now the trailing-column query CAN use the reversed index
\echo 'Same query with reversed index available:'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT flight_id FROM flights
WHERE status = 'Arrived';

-- Size comparison
\echo ''
\echo 'Index sizes (both composites):'
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE indexname IN ('idx_demo_dep_status', 'idx_demo_status_dep');

-- ===================================================================
-- 2. PARTIAL INDEX: Index only the rows you query
-- ===================================================================

\echo ''
\echo '=== 2. PARTIAL INDEX (only Arrived flights) ==='
CREATE INDEX IF NOT EXISTS idx_demo_arrived_only
    ON flights(departure_airport, arrival_airport)
    WHERE status = 'Arrived';
ANALYZE flights;

EXPLAIN (ANALYZE, COSTS OFF)
SELECT departure_airport, arrival_airport, COUNT(*)
FROM flights
WHERE status = 'Arrived'
GROUP BY departure_airport, arrival_airport;

-- Size comparison: partial vs full
\echo ''
\echo 'Partial index vs full index size:'
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE indexname IN ('idx_demo_dep_status', 'idx_demo_arrived_only')
ORDER BY pg_relation_size(indexrelid) DESC;
-- The partial index should be significantly smaller since it only
-- indexes rows where status = 'Arrived' (~60% of the table).

-- ===================================================================
-- 3. EXPRESSION INDEX: Index a computed value
-- ===================================================================

\echo ''
\echo '=== 3. EXPRESSION INDEX (month extraction) ==='
CREATE INDEX IF NOT EXISTS idx_demo_flight_month
    ON flights(date_trunc('month', scheduled_departure));
ANALYZE flights;

-- Grouping by month now uses the expression index
EXPLAIN (ANALYZE, COSTS OFF)
SELECT
    date_trunc('month', scheduled_departure) AS month,
    COUNT(*) AS flights
FROM flights
GROUP BY date_trunc('month', scheduled_departure)
ORDER BY month;

-- Also useful for filtering a specific month
\echo ''
\echo 'Filter to a specific month:'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT *
FROM flights
WHERE date_trunc('month', scheduled_departure) = '2017-07-01'::timestamptz;

-- ===================================================================
-- 4. GIN INDEX: JSONB containment queries
-- ===================================================================

\echo ''
\echo '=== 4. GIN INDEX (JSONB on contact_data) ==='

-- Without GIN: seq scan on tickets to find by email
\echo 'Before GIN (seq scan):'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT ticket_no, passenger_name
FROM tickets
WHERE contact_data @> '{"email": "example@postgrespro.ru"}'::jsonb;

-- Create GIN index
CREATE INDEX IF NOT EXISTS idx_demo_contact_gin
    ON tickets USING GIN (contact_data);
ANALYZE tickets;

-- With GIN: bitmap index scan
\echo ''
\echo 'After GIN (bitmap index scan):'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT ticket_no, passenger_name
FROM tickets
WHERE contact_data @> '{"email": "example@postgrespro.ru"}'::jsonb;

-- GIN also supports ? (key exists), ?| (any key), ?& (all keys)
\echo ''
\echo 'GIN: check if key exists:'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT COUNT(*)
FROM tickets
WHERE contact_data ? 'phone';

-- ===================================================================
-- 5. COVERING INDEX (INCLUDE): Avoid heap fetches entirely
-- ===================================================================

\echo ''
\echo '=== 5. COVERING INDEX with INCLUDE ==='

-- Regular index: index scan + heap fetch for non-indexed columns
CREATE INDEX IF NOT EXISTS idx_demo_tf_flight
    ON ticket_flights(flight_id);
ANALYZE ticket_flights;

\echo 'Regular index (needs heap fetch for amount):'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT flight_id, SUM(amount)
FROM ticket_flights
WHERE flight_id BETWEEN 1000 AND 1100
GROUP BY flight_id;

-- Covering index: includes amount in the index leaf pages
DROP INDEX IF EXISTS idx_demo_tf_flight;
CREATE INDEX IF NOT EXISTS idx_demo_tf_flight_cover
    ON ticket_flights(flight_id) INCLUDE (amount);
ANALYZE ticket_flights;

\echo ''
\echo 'Covering index with INCLUDE (index-only scan, no heap fetch):'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT flight_id, SUM(amount)
FROM ticket_flights
WHERE flight_id BETWEEN 1000 AND 1100
GROUP BY flight_id;
-- Look for "Index Only Scan" and "Heap Fetches: 0"

-- ===================================================================
-- 6. INDEX SIZE SUMMARY
-- ===================================================================

\echo ''
\echo '=== ALL DEMO INDEXES: Size comparison ==='
SELECT
    indexrelname AS index_name,
    relname      AS table_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan     AS times_used
FROM pg_stat_user_indexes
WHERE schemaname = 'bookings'
  AND indexrelname LIKE 'idx_demo_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Table size for context
\echo ''
\echo '=== TABLE SIZES (for reference) ==='
SELECT
    relname AS table_name,
    pg_size_pretty(pg_relation_size(relid))       AS data_size,
    pg_size_pretty(pg_indexes_size(relid))        AS total_index_size
FROM pg_stat_user_tables
WHERE schemaname = 'bookings'
ORDER BY pg_relation_size(relid) DESC;

-- ===================================================================
-- CLEANUP: Remove demo indexes
-- ===================================================================
\echo ''
\echo '=== CLEANUP ==='
DROP INDEX IF EXISTS idx_demo_dep_status;
DROP INDEX IF EXISTS idx_demo_status_dep;
DROP INDEX IF EXISTS idx_demo_arrived_only;
DROP INDEX IF EXISTS idx_demo_flight_month;
DROP INDEX IF EXISTS idx_demo_contact_gin;
DROP INDEX IF EXISTS idx_demo_tf_flight_cover;
\echo 'All demo indexes removed.'
