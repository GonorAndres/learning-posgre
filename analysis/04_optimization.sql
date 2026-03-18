-- =============================================================================
-- 04_optimization.sql -- Performance Optimization Evidence
-- =============================================================================
-- Business question: "How much faster can we make these queries with proper
-- indexing?"
--
-- This script demonstrates EXPLAIN ANALYZE before and after creating indexes.
-- The demo database ships with only primary key indexes -- no custom indexes
-- on the columns we filter/join on, making it perfect for demonstrating
-- the impact of strategic indexing.
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < analysis/04_optimization.sql
-- =============================================================================

SET search_path = bookings, public;

-- ---------------------------------------------------------------------------
-- 0. Verify no custom indexes exist yet (only PKs and FKs from the dump)
-- ---------------------------------------------------------------------------
\echo '=== EXISTING INDEXES ==='
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'bookings'
ORDER BY tablename, indexname;

-- ---------------------------------------------------------------------------
-- 1. BEFORE: Query flights by departure airport and status
--    Expected: Sequential Scan on flights (no index on departure_airport)
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== BEFORE INDEX: Flights from SVO with status Arrived ==='
EXPLAIN ANALYZE
SELECT *
FROM flights
WHERE departure_airport = 'SVO'
  AND status = 'Arrived';

-- ---------------------------------------------------------------------------
-- 2. BEFORE: Delay analysis join (the core query from 01_delays.sql)
--    Expected: Hash Join with Seq Scans
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== BEFORE INDEX: Route delay analysis ==='
EXPLAIN ANALYZE
SELECT
    dep.airport_name ->> 'en' AS departure,
    arr.airport_name ->> 'en' AS arrival,
    COUNT(*) AS total_flights,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
    ) AS delayed
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
JOIN airports_data arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY dep.airport_name, arr.airport_name
HAVING COUNT(*) >= 50;

-- ---------------------------------------------------------------------------
-- 3. BEFORE: Revenue lookup for a specific flight
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== BEFORE INDEX: Revenue for specific flight ==='
EXPLAIN ANALYZE
SELECT SUM(tf.amount), COUNT(*)
FROM ticket_flights tf
WHERE tf.flight_id = 12345;

-- ---------------------------------------------------------------------------
-- 4. CREATE INDEXES
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== CREATING INDEXES ==='

-- Composite index: covers the most common filter pattern
\echo 'Creating composite index on flights(departure_airport, status)...'
CREATE INDEX IF NOT EXISTS idx_flights_dep_status
    ON flights(departure_airport, status);

-- Partial index: 60%+ of our queries filter on completed flights
\echo 'Creating partial index on flights WHERE status = Arrived...'
CREATE INDEX IF NOT EXISTS idx_flights_arrived
    ON flights(departure_airport, arrival_airport)
    WHERE status = 'Arrived';

-- Expression index: for date-based grouping
-- Note: date_trunc on timestamptz is not IMMUTABLE (timezone-dependent).
-- Cast to date instead, which is IMMUTABLE.
\echo 'Creating expression index on scheduled_departure::date...'
CREATE INDEX IF NOT EXISTS idx_flights_sched_date
    ON flights((scheduled_departure::date));

-- Index for ticket_flights lookups by flight
\echo 'Creating index on ticket_flights(flight_id)...'
CREATE INDEX IF NOT EXISTS idx_tf_flight_id
    ON ticket_flights(flight_id);

-- Index for booking lead time analysis
\echo 'Creating index on bookings(book_ref)...'
CREATE INDEX IF NOT EXISTS idx_tickets_book_ref
    ON tickets(book_ref);

-- Force statistics update so the planner knows about the new indexes
\echo 'Running ANALYZE...'
ANALYZE flights;
ANALYZE ticket_flights;
ANALYZE tickets;

-- ---------------------------------------------------------------------------
-- 5. AFTER: Same query -- flights by departure airport and status
--    Expected: Index Scan using idx_flights_dep_status
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== AFTER INDEX: Flights from SVO with status Arrived ==='
EXPLAIN ANALYZE
SELECT *
FROM flights
WHERE departure_airport = 'SVO'
  AND status = 'Arrived';

-- ---------------------------------------------------------------------------
-- 6. AFTER: Same delay analysis join
--    Expected: Improved join strategy using partial index
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== AFTER INDEX: Route delay analysis ==='
EXPLAIN ANALYZE
SELECT
    dep.airport_name ->> 'en' AS departure,
    arr.airport_name ->> 'en' AS arrival,
    COUNT(*) AS total_flights,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
    ) AS delayed
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
JOIN airports_data arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY dep.airport_name, arr.airport_name
HAVING COUNT(*) >= 50;

-- ---------------------------------------------------------------------------
-- 7. AFTER: Revenue lookup for a specific flight
--    Expected: Index Scan using idx_tf_flight_id
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== AFTER INDEX: Revenue for specific flight ==='
EXPLAIN ANALYZE
SELECT SUM(tf.amount), COUNT(*)
FROM ticket_flights tf
WHERE tf.flight_id = 12345;

-- ---------------------------------------------------------------------------
-- 8. Index size analysis: storage cost of our new indexes
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== INDEX SIZE ANALYSIS ==='
SELECT
    indexrelname                                   AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid))   AS index_size,
    idx_scan                                       AS times_used,
    idx_tup_read                                   AS tuples_read,
    idx_tup_fetch                                  AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'bookings'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ---------------------------------------------------------------------------
-- 9. Table size overview
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== TABLE SIZES ==='
SELECT
    relname                                        AS table_name,
    pg_size_pretty(pg_total_relation_size(relid))  AS total_size,
    pg_size_pretty(pg_relation_size(relid))        AS data_size,
    pg_size_pretty(
        pg_total_relation_size(relid) - pg_relation_size(relid)
    )                                              AS index_size,
    n_live_tup                                     AS live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'bookings'
ORDER BY pg_total_relation_size(relid) DESC;
