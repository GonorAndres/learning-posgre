-- =============================================================================
-- 02_revenue_bq.sql -- Revenue Analysis (BigQuery Standard SQL)
-- =============================================================================
-- Same business questions as analysis/02_revenue.sql, translated to BigQuery.
--
-- Key differences:
--   FILTER (WHERE ...)        -> not available; use IF() inside aggregate
--   TO_CHAR(amount, 'FM...')  -> FORMAT('%\'d', CAST(amount AS INT64))
--   PERCENTILE_CONT           -> APPROX_QUANTILES (approximate) or
--                                 PERCENTILE_CONT (exact, window only)
--   LAG() over GROUP BY       -> works the same (BigQuery has full window support)
--
-- Run: bq query --use_legacy_sql=false < bigquery/02_revenue_bq.sql
-- =============================================================================

-- 1. Revenue by fare class
SELECT
    tf.fare_conditions                          AS fare_class,
    COUNT(*)                                    AS tickets_sold,
    CAST(SUM(tf.amount) AS INT64)               AS total_revenue_rub,
    ROUND(AVG(tf.amount), 2)                    AS avg_ticket_rub,
    ROUND(
        100.0 * SUM(tf.amount) / SUM(SUM(tf.amount)) OVER (), 1
    )                                           AS revenue_pct,
    ROUND(
        100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1
    )                                           AS ticket_pct
FROM `airlines_demo.ticket_flights` tf
JOIN `airlines_demo.flights` f ON f.flight_id = tf.flight_id
WHERE f.status = 'Arrived'
GROUP BY tf.fare_conditions
ORDER BY total_revenue_rub DESC;

-- 2. Top 20 routes by revenue
SELECT
    dep.airport_name_en                         AS departure,
    arr.airport_name_en                         AS arrival,
    COUNT(DISTINCT f.flight_id)                 AS flights,
    COUNT(tf.ticket_no)                         AS passengers,
    CAST(SUM(tf.amount) AS INT64)               AS total_revenue_rub,
    ROUND(AVG(tf.amount), 2)                    AS avg_ticket_rub
FROM `airlines_demo.ticket_flights` tf
JOIN `airlines_demo.flights` f ON f.flight_id = tf.flight_id
JOIN `airlines_demo.airports_data` dep ON dep.airport_code = f.departure_airport
JOIN `airlines_demo.airports_data` arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY dep.airport_name_en, arr.airport_name_en
ORDER BY total_revenue_rub DESC
LIMIT 20;

-- 3. Booking lead time vs price
-- BigQuery uses TIMESTAMP_DIFF instead of EXTRACT(DAY FROM interval)
WITH booking_lead AS (
    SELECT
        tf.fare_conditions,
        tf.amount,
        TIMESTAMP_DIFF(f.scheduled_departure, b.book_date, DAY) AS lead_days
    FROM `airlines_demo.ticket_flights` tf
    JOIN `airlines_demo.flights` f ON f.flight_id = tf.flight_id
    JOIN `airlines_demo.tickets` t ON t.ticket_no = tf.ticket_no
    JOIN `airlines_demo.bookings` b ON b.book_ref = t.book_ref
    WHERE f.status = 'Arrived'
)
SELECT
    CASE
        WHEN lead_days < 1   THEN '0: Same day'
        WHEN lead_days < 7   THEN '1: 1-6 days'
        WHEN lead_days < 14  THEN '2: 1-2 weeks'
        WHEN lead_days < 30  THEN '3: 2-4 weeks'
        WHEN lead_days < 60  THEN '4: 1-2 months'
        ELSE                      '5: 2+ months'
    END                         AS lead_time_bucket,
    COUNT(*)                    AS tickets,
    ROUND(AVG(amount), 2)       AS avg_price_rub,
    -- BigQuery: PERCENTILE_CONT is an analytic function, so use APPROX_QUANTILES
    ROUND(APPROX_QUANTILES(amount, 2)[OFFSET(1)], 2) AS approx_median_rub
FROM booking_lead
GROUP BY lead_time_bucket
ORDER BY lead_time_bucket;
