-- =============================================================
-- Views: Common reporting patterns
-- =============================================================

-- Order summary view (joins multiple tables)
CREATE VIEW v_order_summary AS
SELECT
    o.id AS order_id,
    c.full_name AS customer_name,
    c.email,
    o.status,
    o.total_cents / 100.0 AS total_dollars,
    o.shipping_address->>'city' AS ship_city,     -- JSONB arrow operator
    o.shipping_address->>'state' AS ship_state,
    COUNT(oi.id) AS item_count,
    o.created_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, c.full_name, c.email;

-- Revenue by category
CREATE VIEW v_revenue_by_category AS
SELECT
    p.category,
    COUNT(DISTINCT oi.order_id) AS order_count,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price_cents) / 100.0 AS revenue_dollars
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled'
GROUP BY p.category
ORDER BY revenue_dollars DESC;

-- =============================================================
-- Roles: Production-like access control
-- Cloud SQL uses IAM + database roles together
-- =============================================================

-- Read-only role for analytics/reporting
CREATE ROLE readonly_user LOGIN PASSWORD 'readonly_pass';
GRANT CONNECT ON DATABASE learning_db TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;

-- App role with limited writes (no DROP, no TRUNCATE)
CREATE ROLE app_backend LOGIN PASSWORD 'backend_pass';
GRANT CONNECT ON DATABASE learning_db TO app_backend;
GRANT USAGE ON SCHEMA public TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_backend;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_backend;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_backend;
