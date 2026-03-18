-- =============================================================================
-- 03_partitioning.sql -- Table Partitioning
-- =============================================================================
-- Demonstrates range partitioning on the flights table by month. Partitioning
-- helps when:
--   - Tables are very large (millions+ rows)
--   - Queries consistently filter on the partition key (date ranges)
--   - You want to drop old data instantly (detach partition vs DELETE)
--
-- We create a partitioned COPY of the flights table to compare plans
-- side-by-side without modifying the original data.
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < internals/03_partitioning.sql
-- =============================================================================

SET search_path = bookings, public;

-- ===================================================================
-- 1. CREATE PARTITIONED TABLE
-- ===================================================================

\echo '=== 1. CREATE PARTITIONED TABLE (flights_part) ==='

DROP TABLE IF EXISTS flights_part CASCADE;

CREATE TABLE flights_part (
    flight_id          integer NOT NULL,
    flight_no          character(6) NOT NULL,
    scheduled_departure timestamptz NOT NULL,
    scheduled_arrival   timestamptz NOT NULL,
    departure_airport  character(3) NOT NULL,
    arrival_airport    character(3) NOT NULL,
    status             varchar(20) NOT NULL,
    aircraft_code      character(3) NOT NULL,
    actual_departure   timestamptz,
    actual_arrival     timestamptz
) PARTITION BY RANGE (scheduled_departure);

-- Create monthly partitions covering the data range (Jun 2017 - Sep 2017)
CREATE TABLE flights_part_2017_06
    PARTITION OF flights_part
    FOR VALUES FROM ('2017-06-01') TO ('2017-07-01');

CREATE TABLE flights_part_2017_07
    PARTITION OF flights_part
    FOR VALUES FROM ('2017-07-01') TO ('2017-08-01');

CREATE TABLE flights_part_2017_08
    PARTITION OF flights_part
    FOR VALUES FROM ('2017-08-01') TO ('2017-09-01');

CREATE TABLE flights_part_2017_09
    PARTITION OF flights_part
    FOR VALUES FROM ('2017-09-01') TO ('2017-10-01');

-- Default partition for anything outside the defined ranges
CREATE TABLE flights_part_default
    PARTITION OF flights_part DEFAULT;

\echo 'Partitioned table and 5 partitions created.'

-- ===================================================================
-- 2. LOAD DATA FROM ORIGINAL TABLE
-- ===================================================================

\echo ''
\echo '=== 2. LOADING DATA INTO PARTITIONED TABLE ==='

INSERT INTO flights_part
SELECT * FROM flights;

-- Verify distribution
SELECT
    tableoid::regclass AS partition,
    COUNT(*) AS rows
FROM flights_part
GROUP BY tableoid
ORDER BY partition;

-- ===================================================================
-- 3. ADD INDEXES (one per partition, automatically)
-- ===================================================================

\echo ''
\echo '=== 3. CREATE INDEXES ==='

-- Creating an index on the parent table automatically creates a matching
-- index on each partition
CREATE INDEX ON flights_part(departure_airport, status);
CREATE INDEX ON flights_part(flight_id);

ANALYZE flights_part;

\echo 'Indexes created on all partitions.'

-- ===================================================================
-- 4. PARTITION PRUNING DEMONSTRATION
-- ===================================================================

-- 4a. Query for a specific month: only that partition is scanned
\echo ''
\echo '=== 4a. PARTITION PRUNING: Single month query ==='
EXPLAIN (ANALYZE, COSTS OFF)
SELECT COUNT(*)
FROM flights_part
WHERE scheduled_departure >= '2017-07-01'
  AND scheduled_departure <  '2017-08-01';
-- Expected: Only flights_part_2017_07 is scanned. Other partitions are pruned.

-- 4b. Compare with unpartitioned table (scans everything)
\echo ''
\echo '=== 4b. SAME QUERY ON UNPARTITIONED TABLE ==='
EXPLAIN (ANALYZE, COSTS OFF)
SELECT COUNT(*)
FROM flights
WHERE scheduled_departure >= '2017-07-01'
  AND scheduled_departure <  '2017-08-01';
-- Expected: Seq Scan or Index Scan on the full flights table.

-- 4c. Two-month range: prunes to 2 partitions
\echo ''
\echo '=== 4c. PARTITION PRUNING: Two-month range ==='
EXPLAIN (ANALYZE, COSTS OFF)
SELECT departure_airport, COUNT(*)
FROM flights_part
WHERE scheduled_departure >= '2017-07-01'
  AND scheduled_departure <  '2017-09-01'
GROUP BY departure_airport
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 4d. No pruning possible (no filter on partition key)
\echo ''
\echo '=== 4d. NO PRUNING: Query without partition key filter ==='
EXPLAIN (ANALYZE, COSTS OFF)
SELECT departure_airport, COUNT(*)
FROM flights_part
WHERE status = 'Arrived'
GROUP BY departure_airport;
-- Expected: All partitions are scanned (Append node with all children).

-- ===================================================================
-- 5. PARTITION MAINTENANCE
-- ===================================================================

\echo ''
\echo '=== 5a. ADD A NEW PARTITION (October) ==='
CREATE TABLE flights_part_2017_10
    PARTITION OF flights_part
    FOR VALUES FROM ('2017-10-01') TO ('2017-11-01');
\echo 'October partition added (empty, ready for new data).'

-- 5b. Detach a partition (instant removal of old data)
\echo ''
\echo '=== 5b. DETACH PARTITION (June -- "archiving" old data) ==='
-- DETACH makes the partition a standalone table
ALTER TABLE flights_part DETACH PARTITION flights_part_2017_06;

-- Verify it's gone from the partitioned table
SELECT
    tableoid::regclass AS partition,
    COUNT(*) AS rows
FROM flights_part
GROUP BY tableoid
ORDER BY partition;

-- The detached table still exists with all its data
\echo ''
\echo 'Detached table still exists:'
SELECT COUNT(*) AS june_rows FROM flights_part_2017_06;

-- Re-attach for cleanliness
ALTER TABLE flights_part ATTACH PARTITION flights_part_2017_06
    FOR VALUES FROM ('2017-06-01') TO ('2017-07-01');
\echo 'June partition re-attached.'

-- ===================================================================
-- 6. SIZE COMPARISON
-- ===================================================================

\echo ''
\echo '=== 6. SIZE COMPARISON ==='
SELECT
    'flights (original)' AS table_name,
    pg_size_pretty(pg_total_relation_size('flights'::regclass)) AS total_size
UNION ALL
SELECT
    'flights_part (partitioned)',
    pg_size_pretty(pg_total_relation_size('flights_part'::regclass))
UNION ALL
SELECT
    c.relname,
    pg_size_pretty(pg_total_relation_size(c.oid))
FROM pg_class c
JOIN pg_inherits i ON i.inhrelid = c.oid
WHERE i.inhparent = 'flights_part'::regclass
ORDER BY table_name;

-- ===================================================================
-- 7. WHEN NOT TO PARTITION
-- ===================================================================

\echo ''
\echo '=== 7. WHEN NOT TO PARTITION: Point lookup overhead ==='
-- Point lookups by primary key are SLIGHTLY slower on partitioned tables
-- because the planner must determine which partition to access.

\echo 'Unpartitioned (direct index scan):'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT * FROM flights WHERE flight_id = 5000;

\echo ''
\echo 'Partitioned (must check which partition):'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT * FROM flights_part WHERE flight_id = 5000;
-- Partitioning adds a small overhead for point lookups. Don't partition
-- small tables or tables primarily accessed by primary key.

-- ===================================================================
-- CLEANUP
-- ===================================================================
\echo ''
\echo '=== CLEANUP ==='
DROP TABLE IF EXISTS flights_part CASCADE;
DROP TABLE IF EXISTS flights_part_2017_10 CASCADE;
\echo 'Partitioned tables removed.'
