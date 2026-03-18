-- =============================================================================
-- 04_statistics_monitoring.sql -- pg_stat Analysis
-- =============================================================================
-- PostgreSQL maintains statistics about table access patterns, index usage,
-- cache effectiveness, and active sessions. These views are essential for
-- production monitoring and performance tuning.
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < internals/04_statistics_monitoring.sql
-- =============================================================================

SET search_path = bookings, public;

-- ===================================================================
-- 1. TABLE ACCESS PATTERNS
-- ===================================================================

\echo '=== 1. TABLE ACCESS PATTERNS (pg_stat_user_tables) ==='
SELECT
    relname                                     AS table_name,
    seq_scan                                    AS seq_scans,
    seq_tup_read                                AS seq_rows_read,
    idx_scan                                    AS idx_scans,
    idx_tup_fetch                               AS idx_rows_fetched,
    CASE WHEN (seq_scan + COALESCE(idx_scan, 0)) > 0
        THEN ROUND(100.0 * COALESCE(idx_scan, 0) /
             (seq_scan + COALESCE(idx_scan, 0)), 1)
        ELSE 0
    END                                         AS idx_scan_pct,
    n_tup_ins                                   AS inserts,
    n_tup_upd                                   AS updates,
    n_tup_del                                   AS deletes,
    n_live_tup                                  AS live_rows,
    n_dead_tup                                  AS dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'bookings'
ORDER BY seq_tup_read DESC NULLS LAST;
-- INSIGHT: Tables with high seq_scan and low idx_scan are candidates
-- for new indexes. Tables with high dead_rows need VACUUM.

-- ===================================================================
-- 2. INDEX USAGE ANALYSIS
-- ===================================================================

\echo ''
\echo '=== 2. INDEX USAGE (pg_stat_user_indexes) ==='
SELECT
    relname                                     AS table_name,
    indexrelname                                 AS index_name,
    idx_scan                                    AS times_used,
    idx_tup_read                                AS rows_read,
    idx_tup_fetch                               AS rows_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'bookings'
ORDER BY idx_scan DESC NULLS LAST;

-- Unused indexes: waste storage and slow down writes
\echo ''
\echo '=== UNUSED INDEXES (candidates for removal) ==='
SELECT
    relname                                     AS table_name,
    indexrelname                                 AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan                                    AS times_used
FROM pg_stat_user_indexes
WHERE schemaname = 'bookings'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ===================================================================
-- 3. CACHE HIT RATIO
-- ===================================================================

\echo ''
\echo '=== 3. CACHE HIT RATIO ==='

-- Table cache hit ratio
SELECT
    relname                                     AS table_name,
    heap_blks_read                              AS disk_reads,
    heap_blks_hit                               AS cache_hits,
    CASE WHEN (heap_blks_read + heap_blks_hit) > 0
        THEN ROUND(100.0 * heap_blks_hit /
             (heap_blks_read + heap_blks_hit), 2)
        ELSE 0
    END                                         AS cache_hit_pct
FROM pg_statio_user_tables
WHERE schemaname = 'bookings'
  AND (heap_blks_read + heap_blks_hit) > 0
ORDER BY (heap_blks_read + heap_blks_hit) DESC;
-- TARGET: >99% cache hit ratio in production means shared_buffers is
-- sized appropriately. Below 95% suggests increasing shared_buffers.

-- Index cache hit ratio
\echo ''
\echo '=== INDEX CACHE HIT RATIO ==='
SELECT
    relname                                     AS table_name,
    indexrelname                                 AS index_name,
    idx_blks_read                               AS disk_reads,
    idx_blks_hit                                AS cache_hits,
    CASE WHEN (idx_blks_read + idx_blks_hit) > 0
        THEN ROUND(100.0 * idx_blks_hit /
             (idx_blks_read + idx_blks_hit), 2)
        ELSE 0
    END                                         AS cache_hit_pct
FROM pg_statio_user_indexes
WHERE schemaname = 'bookings'
  AND (idx_blks_read + idx_blks_hit) > 0
ORDER BY (idx_blks_read + idx_blks_hit) DESC;

-- ===================================================================
-- 4. TABLE BLOAT ESTIMATION
-- ===================================================================

\echo ''
\echo '=== 4. TABLE BLOAT (dead tuples vs live) ==='
SELECT
    relname                                     AS table_name,
    n_live_tup                                  AS live_rows,
    n_dead_tup                                  AS dead_rows,
    CASE WHEN n_live_tup > 0
        THEN ROUND(100.0 * n_dead_tup / n_live_tup, 2)
        ELSE 0
    END                                         AS dead_pct,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    last_vacuum::date                           AS last_vacuum,
    last_autovacuum::date                       AS last_autovacuum,
    last_analyze::date                          AS last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'bookings'
ORDER BY n_dead_tup DESC;
-- INSIGHT: dead_pct > 20% means the table has significant bloat.
-- This triggers autovacuum (default threshold: 20% of table + 50 rows).

-- ===================================================================
-- 5. ACTIVE CONNECTIONS
-- ===================================================================

\echo ''
\echo '=== 5. ACTIVE CONNECTIONS (pg_stat_activity) ==='
SELECT
    pid,
    usename                                     AS user_name,
    datname                                     AS database,
    state,
    CASE WHEN state = 'active'
        THEN ROUND(EXTRACT(EPOCH FROM (now() - query_start)), 1)
        ELSE NULL
    END                                         AS running_seconds,
    LEFT(query, 80)                             AS query_preview,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE datname IS NOT NULL
ORDER BY state, query_start;
-- WARNING: 'idle in transaction' connections hold locks and prevent VACUUM.
-- In production, set idle_in_transaction_session_timeout to kill these.

-- ===================================================================
-- 6. LOCK MONITORING
-- ===================================================================

\echo ''
\echo '=== 6. CURRENT LOCKS ==='
SELECT
    l.locktype,
    l.relation::regclass                        AS table_name,
    l.mode,
    l.granted,
    a.pid,
    a.usename,
    LEFT(a.query, 60)                           AS query_preview
FROM pg_locks l
JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.relation IS NOT NULL
  AND a.datname = current_database()
ORDER BY l.relation, l.mode;

-- ===================================================================
-- 7. DATABASE-WIDE STATISTICS
-- ===================================================================

\echo ''
\echo '=== 7. DATABASE STATISTICS ==='
SELECT
    datname                                     AS database,
    numbackends                                 AS connections,
    xact_commit                                 AS commits,
    xact_rollback                               AS rollbacks,
    CASE WHEN (xact_commit + xact_rollback) > 0
        THEN ROUND(100.0 * xact_rollback /
             (xact_commit + xact_rollback), 3)
        ELSE 0
    END                                         AS rollback_pct,
    blks_read                                   AS disk_blocks_read,
    blks_hit                                    AS cache_blocks_hit,
    CASE WHEN (blks_read + blks_hit) > 0
        THEN ROUND(100.0 * blks_hit / (blks_read + blks_hit), 2)
        ELSE 0
    END                                         AS cache_hit_pct,
    tup_returned                                AS rows_returned,
    tup_fetched                                 AS rows_fetched,
    tup_inserted                                AS rows_inserted,
    tup_updated                                 AS rows_updated,
    tup_deleted                                 AS rows_deleted,
    temp_files                                  AS temp_files_created,
    pg_size_pretty(temp_bytes)                  AS temp_bytes_written
FROM pg_stat_database
WHERE datname = current_database();
-- INSIGHT: high temp_files means work_mem is too small -- sorts and
-- hash joins are spilling to disk.
