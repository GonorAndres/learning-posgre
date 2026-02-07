-- =============================================================
-- PostgreSQL Learning Cheatsheet
-- Run these after connecting: psql -U app_user -d learning_db
-- =============================================================

-- 1. BASIC: See all orders with customer info
SELECT * FROM v_order_summary;

-- 2. JSONB: Query inside JSON shipping addresses
SELECT id, shipping_address->>'city' AS city, total_cents
FROM orders
WHERE shipping_address->>'state' = 'OR';

-- 3. FULL-TEXT SEARCH: Find products mentioning "laptop"
SELECT name, ts_rank(search_vector, query) AS rank
FROM products, to_tsquery('english', 'laptop') query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- 4. WINDOW FUNCTIONS: Rank products by price within category
SELECT name, category, price_cents,
       RANK() OVER (PARTITION BY category ORDER BY price_cents DESC) AS price_rank
FROM products;

-- 5. CTE (Common Table Expression): Customer lifetime value
WITH customer_totals AS (
    SELECT customer_id, SUM(total_cents) AS lifetime_cents, COUNT(*) AS order_count
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
)
SELECT c.full_name, ct.order_count, ct.lifetime_cents / 100.0 AS lifetime_dollars
FROM customer_totals ct
JOIN customers c ON c.id = ct.customer_id
ORDER BY lifetime_dollars DESC;

-- 6. EXPLAIN ANALYZE: See query execution plan (critical for optimization)
EXPLAIN ANALYZE
SELECT o.*, c.full_name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'delivered';

-- 7. INDEX USAGE: Check which indexes are being used
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 8. TABLE SIZES: Monitor storage
SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 9. ACTIVE CONNECTIONS: Production monitoring
SELECT pid, usename, application_name, state, query_start, query
FROM pg_stat_activity
WHERE datname = 'learning_db';

-- 10. LOCKS: Debug lock contention
SELECT locktype, relation::regclass, mode, granted, pid
FROM pg_locks
WHERE relation IS NOT NULL;
