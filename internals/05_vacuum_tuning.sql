-- =============================================================================
-- 05_vacuum_tuning.sql -- VACUUM and Dead Tuples
-- =============================================================================
-- PostgreSQL uses MVCC (Multi-Version Concurrency Control): UPDATEs don't
-- modify rows in place -- they create a new version and mark the old one as
-- dead. VACUUM reclaims space from dead tuples.
--
-- This script demonstrates:
--   - How dead tuples accumulate
--   - Manual VACUUM vs VACUUM FULL
--   - Autovacuum configuration
--   - Transaction ID wraparound monitoring
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < internals/05_vacuum_tuning.sql
-- =============================================================================

SET search_path = bookings, public;

-- ===================================================================
-- 1. SETUP: Create a test table to safely demonstrate VACUUM behavior
-- ===================================================================

\echo '=== 1. SETUP: Create test table ==='
DROP TABLE IF EXISTS vacuum_demo;
CREATE TABLE vacuum_demo AS
SELECT
    generate_series(1, 100000) AS id,
    md5(random()::text) AS data,
    now() AS created_at;

CREATE INDEX ON vacuum_demo(id);
ANALYZE vacuum_demo;

-- Baseline stats
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    pg_size_pretty(pg_total_relation_size('vacuum_demo'::regclass)) AS total_size
FROM pg_stat_user_tables
WHERE relname = 'vacuum_demo';

-- ===================================================================
-- 2. GENERATE DEAD TUPLES
-- ===================================================================

\echo ''
\echo '=== 2. GENERATE DEAD TUPLES (bulk UPDATE) ==='

-- Each UPDATE creates a new row version; the old one becomes "dead"
UPDATE vacuum_demo SET data = md5(random()::text) WHERE id <= 50000;

-- Force stats collector to update (may take a moment)
ANALYZE vacuum_demo;

\echo 'After updating 50,000 rows:'
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) AS dead_pct,
    pg_size_pretty(pg_total_relation_size('vacuum_demo'::regclass)) AS total_size
FROM pg_stat_user_tables
WHERE relname = 'vacuum_demo';
-- Expected: ~50,000 dead tuples, table size has grown.

-- ===================================================================
-- 3. MANUAL VACUUM (reclaim space for reuse, don't shrink file)
-- ===================================================================

\echo ''
\echo '=== 3a. VACUUM (standard) ==='
VACUUM VERBOSE vacuum_demo;

\echo ''
\echo 'After standard VACUUM:'
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    pg_size_pretty(pg_total_relation_size('vacuum_demo'::regclass)) AS total_size,
    last_vacuum
FROM pg_stat_user_tables
WHERE relname = 'vacuum_demo';
-- Dead tuples should be 0. Table size stays the same (space is marked
-- as reusable but file doesn't shrink).

-- ===================================================================
-- 4. VACUUM FULL (rewrites the table, reclaims disk space)
-- ===================================================================

\echo ''
\echo '=== 4. VACUUM FULL (rewrites table, reclaims disk space) ==='
\echo 'Size before VACUUM FULL:'
SELECT pg_size_pretty(pg_total_relation_size('vacuum_demo'::regclass)) AS size;

-- Generate more dead tuples first
UPDATE vacuum_demo SET data = md5(random()::text) WHERE id <= 50000;
ANALYZE vacuum_demo;
\echo 'Size after 50k more updates:'
SELECT pg_size_pretty(pg_total_relation_size('vacuum_demo'::regclass)) AS size;

-- VACUUM FULL: exclusive lock, rewrites entire table
-- WARNING: Blocks ALL reads and writes during execution
VACUUM FULL vacuum_demo;

\echo 'Size after VACUUM FULL:'
SELECT pg_size_pretty(pg_total_relation_size('vacuum_demo'::regclass)) AS size;
-- Table should be significantly smaller now.

-- ===================================================================
-- 5. AUTOVACUUM CONFIGURATION
-- ===================================================================

\echo ''
\echo '=== 5. AUTOVACUUM SETTINGS ==='
SELECT name, setting, short_desc
FROM pg_settings
WHERE name LIKE 'autovacuum%'
ORDER BY name;
-- Key parameters:
--   autovacuum_vacuum_threshold (default 50): min dead tuples before trigger
--   autovacuum_vacuum_scale_factor (default 0.2): trigger when 20% are dead
--   Formula: vacuum triggers when dead_tuples > threshold + scale_factor * live_tuples
--   For a 100K row table: triggers at 50 + 0.2 * 100000 = 20,050 dead tuples

\echo ''
\echo '=== AUTOVACUUM TRIGGER THRESHOLDS (per table) ==='
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    (SELECT setting::int FROM pg_settings WHERE name = 'autovacuum_vacuum_threshold')
        + (SELECT setting::float FROM pg_settings WHERE name = 'autovacuum_vacuum_scale_factor')
        * n_live_tup AS vacuum_trigger_at,
    CASE WHEN n_dead_tup >
        (SELECT setting::int FROM pg_settings WHERE name = 'autovacuum_vacuum_threshold')
        + (SELECT setting::float FROM pg_settings WHERE name = 'autovacuum_vacuum_scale_factor')
        * n_live_tup
        THEN 'YES'
        ELSE 'no'
    END AS needs_vacuum
FROM pg_stat_user_tables
WHERE schemaname = 'bookings'
ORDER BY n_dead_tup DESC;

-- ===================================================================
-- 6. TRANSACTION ID WRAPAROUND MONITORING
-- ===================================================================

\echo ''
\echo '=== 6. TRANSACTION ID AGE (wraparound risk) ==='
-- PostgreSQL uses 32-bit transaction IDs. After ~2 billion transactions,
-- IDs wrap around and old data becomes "in the future" (invisible).
-- VACUUM FREEZE marks rows as permanently visible, resetting the clock.
-- autovacuum_freeze_max_age (default 200M) triggers aggressive vacuuming.

SELECT
    c.relname                                   AS table_name,
    age(c.relfrozenxid)                         AS xid_age,
    (SELECT setting::int FROM pg_settings
     WHERE name = 'autovacuum_freeze_max_age')  AS freeze_max_age,
    ROUND(100.0 * age(c.relfrozenxid) /
        (SELECT setting::int FROM pg_settings
         WHERE name = 'autovacuum_freeze_max_age'), 1) AS pct_to_freeze
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'bookings'
  AND c.relkind = 'r'
ORDER BY age(c.relfrozenxid) DESC;
-- ALERT: pct_to_freeze approaching 100% means aggressive vacuum is imminent.
-- Above 100% is a wraparound emergency.

-- Database-level check
\echo ''
\echo '=== DATABASE XID AGE ==='
SELECT
    datname,
    age(datfrozenxid) AS xid_age,
    pg_size_pretty(pg_database_size(datname)) AS db_size
FROM pg_database
WHERE datname NOT LIKE 'template%'
ORDER BY age(datfrozenxid) DESC;

-- ===================================================================
-- CLEANUP
-- ===================================================================
\echo ''
\echo '=== CLEANUP ==='
DROP TABLE IF EXISTS vacuum_demo;
\echo 'Demo table removed.'
