-- =============================================================
-- EXERCISES: PostgreSQL fundamentals + Cloud SQL readiness
-- Connect first: docker exec -it learning_pg psql -U app_user -d learning_db
-- =============================================================

-- =============================================================
-- LEVEL 1: CRUD basics (warm up)
-- =============================================================

-- EX 1.1: Insert a new customer
-- INSERT INTO customers (email, full_name, password_hash) VALUES (?, ?, ?);

-- EX 1.2: Update the stock of 'USB-C Hub 7-in-1' to 950
-- UPDATE products SET ... WHERE ...;

-- EX 1.3: Soft-cancel order #4 (change status to 'cancelled')
-- UPDATE orders SET ... WHERE ...;

-- EX 1.4: Delete the cancelled order's items (CASCADE should handle it, but try manually)
-- What happens if you DELETE FROM orders WHERE id = 6; ? Check order_items after.

-- =============================================================
-- LEVEL 2: Querying (the real skill)
-- =============================================================

-- EX 2.1: Find all customers who have NEVER placed an order
-- Hint: LEFT JOIN ... WHERE ... IS NULL

-- EX 2.2: Get the top 3 most expensive products per category
-- Hint: use ROW_NUMBER() OVER (PARTITION BY ...)

-- EX 2.3: Find all orders shipping to a state that starts with 'O'
-- Hint: shipping_address->>'state' LIKE ...

-- EX 2.4: Which products have never been ordered?
-- Hint: NOT EXISTS or LEFT JOIN

-- EX 2.5: Calculate each customer's total spend (excluding cancelled orders)
-- Return: full_name, order_count, total_dollars
-- Sort by total_dollars DESC

-- =============================================================
-- LEVEL 3: Performance (what Cloud SQL bills you for)
-- =============================================================

-- EX 3.1: Run EXPLAIN ANALYZE on this query. Is it using an index?
EXPLAIN ANALYZE
SELECT * FROM orders WHERE status = 'delivered';

-- EX 3.2: Now try this. Compare the two plans:
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 1;

-- EX 3.3: Check index usage stats -- which indexes have never been scanned?
-- SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
-- In production, unused indexes waste storage and slow down writes. Drop them.

-- EX 3.4: Check table bloat (dead tuples from UPDATE/DELETE)
-- SELECT relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
-- FROM pg_stat_user_tables;

-- =============================================================
-- LEVEL 4: JSONB deep dive (Cloud SQL supports this fully)
-- =============================================================

-- EX 4.1: Find all orders shipping to zip codes starting with '9' (West Coast)
-- Hint: shipping_address->>'zip' LIKE '9%'

-- EX 4.2: Add a 'phone' field to Alice's first order shipping address
-- UPDATE orders SET shipping_address = shipping_address || '{"phone": "503-555-0100"}'::jsonb
-- WHERE id = 1;
-- Then SELECT it back and verify.

-- EX 4.3: List all unique cities from shipping addresses
-- Hint: SELECT DISTINCT shipping_address->>'city' FROM orders;

-- =============================================================
-- LEVEL 5: Roles & Security (critical for Cloud SQL)
-- =============================================================

-- EX 5.1: Connect as the readonly user and try to INSERT
-- \c learning_db readonly_user
-- (password: readonly_pass)
-- INSERT INTO customers (email, full_name, password_hash) VALUES ('test@test.com', 'Test', 'x');
-- What error do you get?

-- EX 5.2: Connect as app_backend and try to DROP a table
-- \c learning_db app_backend
-- (password: backend_pass)
-- DROP TABLE products;
-- What error do you get?

-- EX 5.3: Back as app_user, check who has access to what:
-- \c learning_db app_user
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
-- ORDER BY grantee, table_name;

-- =============================================================
-- LEVEL 6: Transactions & Concurrency
-- =============================================================

-- EX 6.1: Simulate a money transfer pattern with transactions
-- BEGIN;
--   UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = 1;
--   INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
--     VALUES (3, 1, 1, 129999);
--   -- Check the stock: SELECT stock_quantity FROM products WHERE id = 1;
-- COMMIT;
-- What happens if you ROLLBACK instead of COMMIT?

-- EX 6.2: Open TWO psql sessions. In session A:
-- BEGIN;
-- UPDATE products SET stock_quantity = 99 WHERE id = 1;
-- (don't commit yet)
-- In session B:
-- SELECT stock_quantity FROM products WHERE id = 1;
-- What value does B see? (This demonstrates MVCC isolation)

-- =============================================================
-- LEVEL 7: Backup & Restore (maps directly to Cloud SQL exports)
-- =============================================================
-- Run these from your HOST terminal (not inside psql):
--
-- Export full database:
--   docker exec learning_pg pg_dump -U app_user learning_db > backup.sql
--
-- Export just the schema (no data):
--   docker exec learning_pg pg_dump -U app_user --schema-only learning_db > schema.sql
--
-- Export as custom format (compressed, used by Cloud SQL export):
--   docker exec learning_pg pg_dump -U app_user -Fc learning_db > backup.dump
--
-- Restore into a fresh database:
--   docker exec -i learning_pg psql -U app_user -d postgres -c "CREATE DATABASE restore_test;"
--   docker exec -i learning_pg pg_restore -U app_user -d restore_test backup.dump
