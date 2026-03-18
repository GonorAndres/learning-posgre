-- =============================================================================
-- 01_explain_deep_dive.sql -- Reading Execution Plans
-- =============================================================================
-- This script dissects how PostgreSQL plans and executes queries. Each section
-- demonstrates a different node type or join strategy, with commentary on
-- what the planner chose and why.
--
-- Key EXPLAIN ANALYZE fields:
--   cost=startup..total  - planner's estimated cost (arbitrary units)
--   actual time          - real wall-clock milliseconds
--   rows                 - actual rows produced by this node
--   loops                - how many times this node executed
--   Buffers: shared hit  - pages found in shared_buffers (cache hits)
--   Buffers: shared read - pages fetched from disk
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < internals/01_explain_deep_dive.sql
-- =============================================================================

SET search_path = bookings, public;

-- ===================================================================
-- SECTION 1: SCAN TYPES
-- ===================================================================

-- ---------------------------------------------------------------------------
-- 1a. Sequential Scan
--     PG reads every row in the table. Chosen when:
--     - No suitable index exists
--     - The query returns a large fraction of the table
--     - The table is small enough that an index adds overhead
-- ---------------------------------------------------------------------------
\echo '=== 1a. SEQUENTIAL SCAN (full table scan on flights) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM flights WHERE status = 'Arrived';
-- Expected: Seq Scan on flights with a Filter on status.
-- Note the "rows removed by filter" showing discarded rows.

-- ---------------------------------------------------------------------------
-- 1b. Index Scan
--     PG uses a B-tree index to find matching rows, then fetches each row
--     from the heap (table data). Best for highly selective queries.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 1b. INDEX SCAN (primary key lookup) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM flights WHERE flight_id = 1000;
-- Expected: Index Scan using flights_pkey. Exactly 1 row, minimal buffers.

-- ---------------------------------------------------------------------------
-- 1c. Index Only Scan
--     All needed columns are IN the index -- no heap fetch required.
--     Only works when the visibility map confirms all rows are visible.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 1c. INDEX ONLY SCAN (only need indexed columns) ==='
-- First, ensure the visibility map is up to date
VACUUM flights;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT flight_id FROM flights WHERE flight_id BETWEEN 1000 AND 2000;
-- Expected: Index Only Scan. Note "Heap Fetches: 0" (ideal) or a small number.

-- ---------------------------------------------------------------------------
-- 1d. Bitmap Index Scan + Bitmap Heap Scan
--     Two-phase approach: first build a bitmap of matching pages from the
--     index, then fetch those pages in sequential order. Chosen when
--     selectivity is moderate (too many rows for index scan, too few for
--     seq scan).
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 1d. BITMAP SCAN (moderate selectivity) ==='
-- Create a temp index for this demonstration
CREATE INDEX IF NOT EXISTS idx_flights_dep_tmp ON flights(departure_airport);
ANALYZE flights;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM flights WHERE departure_airport = 'SVO';
-- Expected: Bitmap Index Scan on idx_flights_dep_tmp -> Bitmap Heap Scan
-- SVO (Sheremetyevo) is a major hub, so moderate number of rows.

-- Cleanup
DROP INDEX IF EXISTS idx_flights_dep_tmp;

-- ===================================================================
-- SECTION 2: JOIN STRATEGIES
-- ===================================================================

-- ---------------------------------------------------------------------------
-- 2a. Nested Loop Join
--     For each row in the outer table, look up matching rows in the inner.
--     Ideal when the outer is small and the inner has an index.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 2a. NESTED LOOP JOIN (small outer, indexed inner) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT f.flight_no, a.model ->> 'en' AS aircraft
FROM flights f
JOIN aircrafts_data a ON a.aircraft_code = f.aircraft_code
WHERE f.flight_id BETWEEN 1 AND 10;
-- Expected: Nested Loop. Index scan on flights_pkey -> loop into aircrafts_data.
-- Only 10 outer rows, so nested loop is efficient.

-- ---------------------------------------------------------------------------
-- 2b. Hash Join
--     Build a hash table from the smaller table, then probe it with the
--     larger table. The go-to for equi-joins on unindexed columns.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 2b. HASH JOIN (equi-join, no useful index) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT f.flight_id, tf.amount
FROM flights f
JOIN ticket_flights tf ON tf.flight_id = f.flight_id
WHERE f.status = 'Arrived'
  AND f.departure_airport = 'SVO';
-- Expected: Hash Join. One side builds hash table, other probes.
-- Watch "Batches" -- >1 means hash spilled to disk (work_mem too small).

-- ---------------------------------------------------------------------------
-- 2c. Merge Join
--     Both inputs are sorted on the join key, then merged in a single pass.
--     Very efficient for large pre-sorted datasets.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 2c. MERGE JOIN (both sides sorted) ==='
-- Force merge join to demonstrate it
SET enable_hashjoin = off;
SET enable_nestloop = off;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT t.passenger_name, b.total_amount
FROM tickets t
JOIN bookings b ON b.book_ref = t.book_ref;
-- Expected: Merge Join with Sort nodes on both sides (or index scan if sorted).

-- Restore defaults
RESET enable_hashjoin;
RESET enable_nestloop;

-- ===================================================================
-- SECTION 3: AGGREGATION AND SORTING
-- ===================================================================

-- ---------------------------------------------------------------------------
-- 3a. Sort + GroupAggregate vs HashAggregate
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 3a. HASH AGGREGATE ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT departure_airport, COUNT(*)
FROM flights
GROUP BY departure_airport;
-- Expected: HashAggregate (104 groups is small enough for a hash table)

\echo ''
\echo '=== 3b. GROUP AGGREGATE (many groups) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT passenger_name, COUNT(*)
FROM tickets
GROUP BY passenger_name;
-- Expected: Could be HashAggregate or GroupAggregate with Sort,
-- depending on the number of distinct passenger names.

-- ===================================================================
-- SECTION 4: SUBQUERIES AND CTEs
-- ===================================================================

-- ---------------------------------------------------------------------------
-- 4a. Subquery vs CTE performance
--     In PG 12+, CTEs can be inlined (optimized away). Before 12, CTEs
--     were optimization barriers.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 4a. CTE (may be inlined in PG 12+) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH big_bookings AS (
    SELECT book_ref, total_amount
    FROM bookings
    WHERE total_amount > 500000
)
SELECT t.passenger_name, bb.total_amount
FROM big_bookings bb
JOIN tickets t ON t.book_ref = bb.book_ref;

\echo ''
\echo '=== 4b. EQUIVALENT SUBQUERY ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT t.passenger_name, b.total_amount
FROM bookings b
JOIN tickets t ON t.book_ref = b.book_ref
WHERE b.total_amount > 500000;
-- Compare the two plans: in PG 16, the CTE should be inlined and both
-- plans should be identical.

-- ---------------------------------------------------------------------------
-- 4c. LATERAL join (correlated subquery in FROM)
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 4c. LATERAL JOIN ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    a.airport_code,
    a.airport_name ->> 'en' AS airport,
    top_route.dest,
    top_route.flight_count
FROM airports_data a
JOIN LATERAL (
    SELECT f.arrival_airport AS dest, COUNT(*) AS flight_count
    FROM flights f
    WHERE f.departure_airport = a.airport_code
      AND f.status = 'Arrived'
    GROUP BY f.arrival_airport
    ORDER BY COUNT(*) DESC
    LIMIT 1
) top_route ON TRUE
ORDER BY top_route.flight_count DESC
LIMIT 10;
-- Expected: Nested Loop with a subplan that runs once per airport.
-- LATERAL is powerful for "top-N per group" patterns.

-- ===================================================================
-- SECTION 5: READING THE NUMBERS
-- ===================================================================
\echo ''
\echo '=== QUICK REFERENCE: What to look for in EXPLAIN ANALYZE ==='
\echo '  - "Seq Scan" with many "rows removed by filter" -> needs an index'
\echo '  - "Nested Loop" with high "loops" count -> consider hash/merge join'
\echo '  - "Sort Method: external merge" -> work_mem too small, spilling to disk'
\echo '  - "Buffers: shared read" >> "shared hit" -> cache is cold or too small'
\echo '  - "actual time" much higher than "cost" estimate -> stale statistics (run ANALYZE)'
\echo '  - "Hash Batches: N" where N > 1 -> hash spilled to disk (increase work_mem)'
