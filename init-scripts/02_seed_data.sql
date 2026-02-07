-- =============================================================
-- Seed Data: Realistic example records
-- =============================================================

-- Customers
INSERT INTO customers (email, full_name, password_hash) VALUES
    ('alice@example.com',   'Alice Johnson',    '$2b$12$placeholder_hash_alice'),
    ('bob@example.com',     'Bob Smith',        '$2b$12$placeholder_hash_bob'),
    ('carol@example.com',   'Carol Williams',   '$2b$12$placeholder_hash_carol'),
    ('dave@example.com',    'Dave Brown',       '$2b$12$placeholder_hash_dave'),
    ('eve@example.com',     'Eve Davis',        '$2b$12$placeholder_hash_eve');

-- Products
INSERT INTO products (sku, name, description, price_cents, stock_quantity, category) VALUES
    ('LAPTOP-001',  'ProBook 15',           'Professional 15-inch laptop with 16GB RAM and 512GB SSD', 129999, 50, 'electronics'),
    ('LAPTOP-002',  'UltraBook Air',        'Ultra-thin 13-inch laptop, perfect for travel',           99999,  30, 'electronics'),
    ('PHONE-001',   'SmartPhone X',         'Latest flagship smartphone with 128GB storage',           79999,  100, 'electronics'),
    ('HDPH-001',    'NoiseCancel Pro',      'Over-ear noise cancelling headphones',                    29999,  200, 'audio'),
    ('HDPH-002',    'BudsPro Wireless',     'True wireless earbuds with 24h battery',                  14999,  150, 'audio'),
    ('CHAIR-001',   'ErgoDesk Chair',       'Ergonomic office chair with lumbar support',              44999,  40,  'furniture'),
    ('DESK-001',    'StandUp Pro',          'Electric standing desk, 60x30 inches',                   59999,  25,  'furniture'),
    ('BOOK-001',    'PostgreSQL Internals', 'Deep dive into PostgreSQL architecture',                  4999,   500, 'books'),
    ('BOOK-002',    'SQL Performance',      'Query optimization and indexing strategies',              3999,   300, 'books'),
    ('CABLE-001',   'USB-C Hub 7-in-1',    'Multi-port USB-C adapter with HDMI and ethernet',         3499,   1000, 'accessories');

-- Orders with JSONB shipping addresses
INSERT INTO orders (customer_id, status, total_cents, shipping_address, notes) VALUES
    (1, 'delivered',  134498, '{"street": "123 Main St", "city": "Portland", "state": "OR", "zip": "97201"}', NULL),
    (1, 'shipped',    79999,  '{"street": "123 Main St", "city": "Portland", "state": "OR", "zip": "97201"}', 'Leave at door'),
    (2, 'confirmed',  59998,  '{"street": "456 Oak Ave", "city": "Seattle", "state": "WA", "zip": "98101"}', NULL),
    (3, 'pending',    44999,  '{"street": "789 Pine Rd", "city": "Denver", "state": "CO", "zip": "80201"}', 'Gift wrap please'),
    (4, 'delivered',  164997, '{"street": "321 Elm St", "city": "Austin", "state": "TX", "zip": "73301"}', NULL),
    (5, 'cancelled',  14999,  '{"street": "654 Birch Ln", "city": "Miami", "state": "FL", "zip": "33101"}', 'Changed my mind');

-- Order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES
    (1, 1, 1, 129999),   -- Alice: 1 ProBook
    (1, 10, 1, 3499),    -- Alice: 1 USB-C Hub (note: total doesn't match exactly, that's realistic)
    (2, 3, 1, 79999),    -- Alice: 1 SmartPhone
    (3, 5, 2, 14999),    -- Bob: 2 BudsPro (2 x 14999 = 29998... close enough for demo)
    (3, 4, 1, 29999),    -- Bob: 1 NoiseCancel
    (4, 6, 1, 44999),    -- Carol: 1 ErgoDesk Chair
    (5, 1, 1, 129999),   -- Dave: 1 ProBook
    (5, 10, 1, 3499),    -- Dave: 1 USB-C Hub
    (5, 4, 1, 29999),    -- Dave: 1 NoiseCancel
    (6, 5, 1, 14999);    -- Eve: 1 BudsPro (cancelled)
