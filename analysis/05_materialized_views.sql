-- =============================================================================
-- 05_materialized_views.sql -- Pre-Computed Dashboard Views
-- =============================================================================
-- Business question: "How do we make dashboard-speed queries over millions
-- of rows?"
--
-- Materialized views store the result of a query on disk. Unlike regular views,
-- they don't re-execute the query every time -- they serve pre-computed results.
-- Trade-off: data can be stale until you REFRESH.
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < analysis/05_materialized_views.sql
-- =============================================================================

SET search_path = bookings, public;

-- ---------------------------------------------------------------------------
-- 1. Materialized view: Route delay summary
-- ---------------------------------------------------------------------------
\echo '=== CREATING mv_route_delay_summary ==='
DROP MATERIALIZED VIEW IF EXISTS mv_route_delay_summary;
CREATE MATERIALIZED VIEW mv_route_delay_summary AS
SELECT
    f.departure_airport,
    dep.airport_name ->> 'en'           AS departure_name,
    f.arrival_airport,
    arr.airport_name ->> 'en'           AS arrival_name,
    COUNT(*)                            AS total_flights,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
    )                                   AS delayed_flights,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1
    )                                   AS delay_pct,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (f.actual_departure - f.scheduled_departure)) / 60.0), 1
    )                                   AS avg_offset_min
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
JOIN airports_data arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY f.departure_airport, dep.airport_name,
         f.arrival_airport, arr.airport_name
WITH DATA;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX ON mv_route_delay_summary (departure_airport, arrival_airport);

-- Dashboard filter index
CREATE INDEX ON mv_route_delay_summary (delay_pct DESC);

\echo 'mv_route_delay_summary created with indexes.'

-- ---------------------------------------------------------------------------
-- 2. Materialized view: Daily revenue
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== CREATING mv_daily_revenue ==='
DROP MATERIALIZED VIEW IF EXISTS mv_daily_revenue;
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
    f.scheduled_departure::date          AS flight_date,
    tf.fare_conditions                   AS fare_class,
    COUNT(DISTINCT f.flight_id)          AS flights,
    COUNT(tf.ticket_no)                  AS passengers,
    SUM(tf.amount)                       AS total_revenue,
    ROUND(AVG(tf.amount), 2)             AS avg_ticket_price
FROM ticket_flights tf
JOIN flights f ON f.flight_id = tf.flight_id
WHERE f.status = 'Arrived'
GROUP BY f.scheduled_departure::date, tf.fare_conditions
WITH DATA;

CREATE UNIQUE INDEX ON mv_daily_revenue (flight_date, fare_class);

-- Fast date-range filtering for dashboards
CREATE INDEX ON mv_daily_revenue (flight_date);

\echo 'mv_daily_revenue created with indexes.'

-- ---------------------------------------------------------------------------
-- 3. Materialized view: Aircraft utilization
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== CREATING mv_aircraft_utilization ==='
DROP MATERIALIZED VIEW IF EXISTS mv_aircraft_utilization;

CREATE MATERIALIZED VIEW mv_aircraft_utilization AS
WITH flight_capacity AS (
    SELECT aircraft_code, COUNT(*) AS seat_count
    FROM seats GROUP BY aircraft_code
),
flight_passengers AS (
    SELECT
        f.flight_id,
        f.aircraft_code,
        COUNT(bp.ticket_no) AS passengers,
        EXTRACT(EPOCH FROM (f.actual_arrival - f.actual_departure)) / 3600.0 AS flight_hours
    FROM flights f
    LEFT JOIN boarding_passes bp ON bp.flight_id = f.flight_id
    WHERE f.status = 'Arrived'
    GROUP BY f.flight_id, f.aircraft_code, f.actual_arrival, f.actual_departure
)
SELECT
    fp.aircraft_code,
    a.model ->> 'en'                        AS aircraft_model,
    COUNT(fp.flight_id)                     AS total_flights,
    ROUND(SUM(fp.flight_hours), 1)          AS total_flight_hours,
    ROUND(AVG(fp.passengers), 1)            AS avg_passengers,
    MAX(fc.seat_count)                      AS capacity,
    ROUND(100.0 * AVG(fp.passengers) / MAX(fc.seat_count), 1) AS avg_load_factor_pct,
    ROUND(AVG(fp.flight_hours), 2)          AS avg_flight_hours
FROM flight_passengers fp
JOIN aircrafts_data a ON a.aircraft_code = fp.aircraft_code
JOIN flight_capacity fc ON fc.aircraft_code = fp.aircraft_code
GROUP BY fp.aircraft_code, a.model
WITH DATA;

CREATE UNIQUE INDEX ON mv_aircraft_utilization (aircraft_code);

\echo 'mv_aircraft_utilization created with indexes.'

-- ---------------------------------------------------------------------------
-- 4. Performance comparison: raw query vs materialized view
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== PERFORMANCE: Raw query (scans flights + airports + aggregation) ==='
EXPLAIN ANALYZE
SELECT
    f.departure_airport,
    dep.airport_name ->> 'en' AS departure_name,
    f.arrival_airport,
    arr.airport_name ->> 'en' AS arrival_name,
    COUNT(*) AS total_flights,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1
    ) AS delay_pct
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
JOIN airports_data arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY f.departure_airport, dep.airport_name,
         f.arrival_airport, arr.airport_name;

\echo ''
\echo '=== PERFORMANCE: Materialized view (pre-computed, indexed) ==='
EXPLAIN ANALYZE
SELECT departure_name, arrival_name, total_flights, delay_pct
FROM mv_route_delay_summary;

-- ---------------------------------------------------------------------------
-- 5. Dashboard-style query on materialized view
--    "Show me the 10 most delayed routes" -- instant response
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== DASHBOARD QUERY: Top 10 delayed routes (from mat view) ==='
EXPLAIN ANALYZE
SELECT departure_name, arrival_name, total_flights, delayed_flights, delay_pct
FROM mv_route_delay_summary
WHERE total_flights >= 50
ORDER BY delay_pct DESC
LIMIT 10;

-- ---------------------------------------------------------------------------
-- 6. Materialized view sizes
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== MATERIALIZED VIEW SIZES ==='
SELECT
    relname                                        AS view_name,
    pg_size_pretty(pg_total_relation_size(oid))    AS total_size,
    (SELECT COUNT(*) FROM mv_route_delay_summary)  AS delay_rows,
    (SELECT COUNT(*) FROM mv_daily_revenue)        AS revenue_rows,
    (SELECT COUNT(*) FROM mv_aircraft_utilization) AS utilization_rows
FROM pg_class
WHERE relname = 'mv_route_delay_summary'
LIMIT 1;

-- Show individual sizes
SELECT
    relname                                       AS view_name,
    pg_size_pretty(pg_total_relation_size(oid))   AS total_size
FROM pg_class
WHERE relkind = 'm' AND relnamespace = 'bookings'::regnamespace
ORDER BY pg_total_relation_size(oid) DESC;

-- ---------------------------------------------------------------------------
-- 7. Refresh strategy
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== REFRESH: CONCURRENTLY (non-blocking) ==='
-- CONCURRENTLY allows reads during refresh (requires unique index)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_route_delay_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
-- Non-concurrent refresh (faster but locks the view)
REFRESH MATERIALIZED VIEW mv_aircraft_utilization;
\echo 'All materialized views refreshed.'
