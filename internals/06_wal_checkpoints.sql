-- =============================================================================
-- 06_wal_checkpoints.sql -- WAL and Checkpoint Monitoring
-- =============================================================================
-- The Write-Ahead Log (WAL) is PostgreSQL's durability mechanism. Every change
-- is written to WAL before it hits the data files. Checkpoints periodically
-- flush dirty pages from shared_buffers to disk.
--
-- Understanding WAL is critical for:
--   - Write performance tuning
--   - Replication configuration
--   - Backup strategies (PITR)
--   - Cloud SQL tuning (what you can and cannot change)
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < internals/06_wal_checkpoints.sql
-- =============================================================================

SET search_path = bookings, public;

-- ===================================================================
-- 1. CURRENT WAL CONFIGURATION
-- ===================================================================

\echo '=== 1. WAL CONFIGURATION ==='
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name IN (
    'wal_level',
    'max_wal_size',
    'min_wal_size',
    'checkpoint_completion_target',
    'checkpoint_timeout',
    'synchronous_commit',
    'wal_compression',
    'wal_buffers',
    'full_page_writes',
    'archive_mode'
)
ORDER BY name;
-- Key relationships:
--   wal_level = 'replica': supports streaming replication (Cloud SQL default)
--   max_wal_size: triggers checkpoint when WAL reaches this size
--   checkpoint_completion_target: spread I/O over this fraction of checkpoint interval
--   synchronous_commit: 'on' = wait for WAL flush (safe), 'off' = faster writes (risk)

-- ===================================================================
-- 2. CHECKPOINT STATISTICS
-- ===================================================================

\echo ''
\echo '=== 2. CHECKPOINT STATISTICS (pg_stat_bgwriter) ==='
SELECT
    checkpoints_timed                           AS scheduled_checkpoints,
    checkpoints_req                             AS requested_checkpoints,
    buffers_checkpoint                          AS buffers_written_checkpoint,
    buffers_clean                               AS buffers_written_bgwriter,
    buffers_backend                             AS buffers_written_backends,
    maxwritten_clean                            AS bgwriter_maxwritten_stops,
    pg_size_pretty(
        buffers_checkpoint * current_setting('block_size')::bigint
    )                                           AS checkpoint_write_volume,
    pg_size_pretty(
        buffers_backend * current_setting('block_size')::bigint
    )                                           AS backend_write_volume
FROM pg_stat_bgwriter;
-- INSIGHT:
--   buffers_backend > 0 means backends are doing their own writes because
--   the bgwriter/checkpointer can't keep up. This causes latency spikes.
--   Increase shared_buffers or bgwriter_lru_maxpages.
--
--   checkpoints_req >> checkpoints_timed means max_wal_size is too small
--   (checkpoints triggered by WAL volume, not the timer).

-- ===================================================================
-- 3. CURRENT WAL POSITION
-- ===================================================================

\echo ''
\echo '=== 3. CURRENT WAL POSITION ==='
SELECT
    pg_current_wal_lsn()                        AS current_lsn,
    pg_walfile_name(pg_current_wal_lsn())       AS current_wal_file,
    pg_size_pretty(
        pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')
    )                                           AS total_wal_generated;

-- ===================================================================
-- 4. WAL GENERATION RATE (measure a bulk operation)
-- ===================================================================

\echo ''
\echo '=== 4. WAL GENERATION: Before bulk operation ==='
SELECT pg_current_wal_lsn() AS before_lsn \gset

-- Perform a bulk operation
CREATE TEMP TABLE wal_test AS
SELECT generate_series(1, 100000) AS id, md5(random()::text) AS data;

-- Update all rows (generates WAL for each change)
UPDATE wal_test SET data = md5(random()::text);

\echo 'After 100K inserts + 100K updates:'
SELECT
    pg_size_pretty(
        pg_wal_lsn_diff(pg_current_wal_lsn(), :'before_lsn'::pg_lsn)
    ) AS wal_generated;

DROP TABLE wal_test;

-- ===================================================================
-- 5. SYNCHRONOUS COMMIT IMPACT
-- ===================================================================

\echo ''
\echo '=== 5. SYNCHRONOUS COMMIT IMPACT ==='

-- Test with synchronous_commit = on (default, safest)
CREATE TEMP TABLE sync_test(id int, data text);

\echo 'synchronous_commit = on (safe, default):'
\timing on
INSERT INTO sync_test
SELECT generate_series(1, 10000), md5(random()::text);
\timing off

TRUNCATE sync_test;

-- Test with synchronous_commit = off (faster, tiny durability risk)
SET synchronous_commit = off;
\echo ''
\echo 'synchronous_commit = off (faster writes):'
\timing on
INSERT INTO sync_test
SELECT generate_series(1, 10000), md5(random()::text);
\timing off

RESET synchronous_commit;
DROP TABLE sync_test;
-- TRADE-OFF: 'off' can lose the last ~600ms of commits on crash.
-- Acceptable for logging, analytics. Never for financial transactions.

-- ===================================================================
-- 6. REPLICATION AND WAL LEVEL
-- ===================================================================

\echo ''
\echo '=== 6. REPLICATION SLOT STATUS ==='
SELECT
    slot_name,
    slot_type,
    active,
    pg_size_pretty(
        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
    ) AS wal_retained
FROM pg_replication_slots;
-- Empty result is normal for local dev. In production/Cloud SQL, you'd
-- see slots for read replicas. Inactive slots accumulate WAL indefinitely.

-- ===================================================================
-- 7. CLOUD SQL CONTEXT
-- ===================================================================

\echo ''
\echo '=== 7. CLOUD SQL: What you CAN and CANNOT tune ==='
\echo ''
\echo 'CAN change (via Database Flags):'
\echo '  - max_connections, shared_buffers, work_mem'
\echo '  - log_min_duration_statement, log_statement'
\echo '  - autovacuum_* settings (per-table too)'
\echo '  - random_page_cost, effective_cache_size'
\echo '  - synchronous_commit (set to "off" for analytics workloads)'
\echo ''
\echo 'CANNOT change:'
\echo '  - wal_level (always "replica" for HA)'
\echo '  - max_wal_size (managed by Cloud SQL)'
\echo '  - archive_mode/archive_command (managed for PITR)'
\echo '  - full_page_writes (always on)'
\echo '  - ssl configuration (always enforced)'
\echo '  - pg_hba.conf (managed via IAM and Authorized Networks)'
\echo ''
\echo 'IMPORTANT: Cloud SQL handles checkpoints, WAL archival, and'
\echo 'replication automatically. Focus tuning on query-level settings'
\echo '(work_mem, effective_cache_size) and autovacuum thresholds.'
