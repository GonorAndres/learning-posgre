-- =============================================================================
-- 02_revenue.sql -- Revenue Analysis
-- =============================================================================
-- Business question: "How does revenue distribute across fare classes, routes,
-- and booking windows?"
--
-- Revenue lives in ticket_flights.amount (per flight segment, in rubles).
-- bookings.total_amount is the total for the entire booking.
-- We analyze only completed flights (status = 'Arrived') for accurate metrics.
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < analysis/02_revenue.sql
-- =============================================================================

SET search_path = bookings, public;

-- ---------------------------------------------------------------------------
-- 1. Revenue breakdown by fare class
-- ---------------------------------------------------------------------------
\echo '=== REVENUE BY FARE CLASS ==='
SELECT
    tf.fare_conditions                          AS fare_class,
    COUNT(*)                                    AS tickets_sold,
    TO_CHAR(SUM(tf.amount), 'FM999,999,999,999') AS total_revenue_rub,
    ROUND(AVG(tf.amount), 2)                    AS avg_ticket_rub,
    ROUND(MIN(tf.amount), 2)                    AS min_ticket_rub,
    ROUND(MAX(tf.amount), 2)                    AS max_ticket_rub,
    ROUND(
        100.0 * SUM(tf.amount) / SUM(SUM(tf.amount)) OVER (), 1
    )                                           AS revenue_pct,
    ROUND(
        100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1
    )                                           AS ticket_pct
FROM ticket_flights tf
JOIN flights f ON f.flight_id = tf.flight_id
WHERE f.status = 'Arrived'
GROUP BY tf.fare_conditions
ORDER BY SUM(tf.amount) DESC;

-- ---------------------------------------------------------------------------
-- 2. Top 20 routes by total revenue
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== TOP 20 ROUTES BY REVENUE ==='
SELECT
    dep.airport_name ->> 'en'                   AS departure,
    arr.airport_name ->> 'en'                   AS arrival,
    COUNT(DISTINCT f.flight_id)                 AS flights,
    COUNT(tf.ticket_no)                         AS passengers,
    TO_CHAR(SUM(tf.amount), 'FM999,999,999,999') AS total_revenue_rub,
    ROUND(AVG(tf.amount), 2)                    AS avg_ticket_rub,
    ROUND(SUM(tf.amount) / COUNT(DISTINCT f.flight_id), 2) AS revenue_per_flight
FROM ticket_flights tf
JOIN flights f ON f.flight_id = tf.flight_id
JOIN airports_data dep ON dep.airport_code = f.departure_airport
JOIN airports_data arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY dep.airport_name, arr.airport_name
ORDER BY SUM(tf.amount) DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- 3. Revenue per aircraft type
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== REVENUE BY AIRCRAFT TYPE ==='
SELECT
    a.model ->> 'en'                            AS aircraft,
    COUNT(DISTINCT f.flight_id)                 AS flights,
    COUNT(tf.ticket_no)                         AS total_passengers,
    TO_CHAR(SUM(tf.amount), 'FM999,999,999,999') AS total_revenue_rub,
    ROUND(SUM(tf.amount) / COUNT(DISTINCT f.flight_id), 2) AS revenue_per_flight,
    ROUND(AVG(tf.amount), 2)                    AS avg_ticket_rub
FROM ticket_flights tf
JOIN flights f ON f.flight_id = tf.flight_id
JOIN aircrafts_data a ON a.aircraft_code = f.aircraft_code
WHERE f.status = 'Arrived'
GROUP BY a.model
ORDER BY SUM(tf.amount) DESC;

-- ---------------------------------------------------------------------------
-- 4. Booking lead time analysis
--    How far in advance are tickets booked, and does lead time affect price?
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== BOOKING LEAD TIME vs PRICE ==='
WITH booking_lead AS (
    SELECT
        tf.fare_conditions,
        tf.amount,
        EXTRACT(DAY FROM (f.scheduled_departure - b.book_date)) AS lead_days
    FROM ticket_flights tf
    JOIN flights f ON f.flight_id = tf.flight_id
    JOIN tickets t ON t.ticket_no = tf.ticket_no
    JOIN bookings b ON b.book_ref = t.book_ref
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
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount))::numeric, 2) AS median_price_rub
FROM booking_lead
GROUP BY lead_time_bucket
ORDER BY lead_time_bucket;

-- ---------------------------------------------------------------------------
-- 5. Pareto analysis: what percentage of routes generate 80% of revenue?
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== PARETO: REVENUE CONCENTRATION BY ROUTE ==='
WITH route_revenue AS (
    SELECT
        f.departure_airport || '-' || f.arrival_airport AS route,
        SUM(tf.amount) AS revenue
    FROM ticket_flights tf
    JOIN flights f ON f.flight_id = tf.flight_id
    WHERE f.status = 'Arrived'
    GROUP BY f.departure_airport, f.arrival_airport
),
ranked AS (
    SELECT
        route,
        revenue,
        SUM(revenue) OVER (ORDER BY revenue DESC) AS cumulative_revenue,
        SUM(revenue) OVER ()                       AS total_revenue,
        ROW_NUMBER() OVER (ORDER BY revenue DESC)  AS rank,
        COUNT(*) OVER ()                           AS total_routes
    FROM route_revenue
)
SELECT
    rank,
    route,
    TO_CHAR(revenue, 'FM999,999,999,999')     AS revenue_rub,
    ROUND(100.0 * cumulative_revenue / total_revenue, 1) AS cumul_pct,
    ROUND(100.0 * rank / total_routes, 1)     AS route_pct
FROM ranked
WHERE rank <= 30
   OR cumulative_revenue <= total_revenue * 0.8
ORDER BY rank;

-- Show the Pareto summary
\echo ''
\echo '=== PARETO SUMMARY ==='
WITH route_revenue AS (
    SELECT
        f.departure_airport || '-' || f.arrival_airport AS route,
        SUM(tf.amount) AS revenue
    FROM ticket_flights tf
    JOIN flights f ON f.flight_id = tf.flight_id
    WHERE f.status = 'Arrived'
    GROUP BY f.departure_airport, f.arrival_airport
),
ranked AS (
    SELECT
        revenue,
        SUM(revenue) OVER (ORDER BY revenue DESC) AS cumulative_revenue,
        SUM(revenue) OVER ()                       AS total_revenue,
        ROW_NUMBER() OVER (ORDER BY revenue DESC)  AS rank,
        COUNT(*) OVER ()                           AS total_routes
    FROM route_revenue
)
SELECT
    total_routes,
    (SELECT rank FROM ranked WHERE cumulative_revenue >= total_revenue * 0.5 ORDER BY rank LIMIT 1)  AS routes_for_50pct,
    (SELECT rank FROM ranked WHERE cumulative_revenue >= total_revenue * 0.8 ORDER BY rank LIMIT 1)  AS routes_for_80pct,
    TO_CHAR(total_revenue, 'FM999,999,999,999') AS total_revenue_rub
FROM ranked
LIMIT 1;

-- ---------------------------------------------------------------------------
-- 6. Monthly revenue trend
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== MONTHLY REVENUE TREND ==='
SELECT
    TO_CHAR(f.scheduled_departure, 'YYYY-MM')   AS month,
    COUNT(DISTINCT f.flight_id)                  AS flights,
    COUNT(tf.ticket_no)                          AS passengers,
    TO_CHAR(SUM(tf.amount), 'FM999,999,999,999') AS revenue_rub,
    ROUND(AVG(tf.amount), 2)                     AS avg_ticket_rub,
    LAG(SUM(tf.amount)) OVER (ORDER BY TO_CHAR(f.scheduled_departure, 'YYYY-MM')) AS prev_month_revenue,
    ROUND(
        100.0 * (SUM(tf.amount) - LAG(SUM(tf.amount)) OVER (ORDER BY TO_CHAR(f.scheduled_departure, 'YYYY-MM')))
        / NULLIF(LAG(SUM(tf.amount)) OVER (ORDER BY TO_CHAR(f.scheduled_departure, 'YYYY-MM')), 0), 1
    )                                            AS mom_change_pct
FROM ticket_flights tf
JOIN flights f ON f.flight_id = tf.flight_id
WHERE f.status = 'Arrived'
GROUP BY TO_CHAR(f.scheduled_departure, 'YYYY-MM')
ORDER BY month;
