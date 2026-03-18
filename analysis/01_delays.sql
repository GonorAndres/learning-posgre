-- =============================================================================
-- 01_delays.sql -- Route Delay Analysis
-- =============================================================================
-- Business question: "Which routes lose the most time to delays, and which
-- airports are the worst offenders?"
--
-- A flight is considered "delayed" when actual_departure exceeds
-- scheduled_departure by more than 15 minutes. We only analyze flights with
-- status = 'Arrived' (completed flights that have actual timestamps).
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < analysis/01_delays.sql
-- =============================================================================

SET search_path = bookings, public;

-- ---------------------------------------------------------------------------
-- 0. Dataset overview
-- ---------------------------------------------------------------------------
\echo '=== DATASET OVERVIEW ==='
SELECT
    COUNT(*)                                               AS total_flights,
    COUNT(*) FILTER (WHERE status = 'Arrived')             AS arrived,
    COUNT(*) FILTER (WHERE status = 'Cancelled')           AS cancelled,
    COUNT(*) FILTER (WHERE status = 'Scheduled')           AS scheduled,
    COUNT(*) FILTER (WHERE status IN ('Delayed','Departed','On Time')) AS in_progress
FROM flights;

-- ---------------------------------------------------------------------------
-- 1. Top 20 routes by delay percentage
--    Only routes with 50+ completed flights (statistical significance).
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== TOP 20 ROUTES BY DELAY PERCENTAGE (>50 flights) ==='
SELECT
    dep.airport_name ->> 'en'  AS departure,
    arr.airport_name ->> 'en'  AS arrival,
    COUNT(*)                   AS total_flights,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
    )                          AS delayed_flights,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1
    )                          AS delay_pct,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (f.actual_departure - f.scheduled_departure)) / 60.0)
        FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ), 1
    )                          AS avg_delay_min
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
JOIN airports_data arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY dep.airport_name, arr.airport_name
HAVING COUNT(*) >= 50
ORDER BY delay_pct DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- 2. Worst 15 departure airports by average delay (minutes)
--    Across all their completed flights.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== WORST 15 DEPARTURE AIRPORTS BY AVG DELAY ==='
SELECT
    f.departure_airport                       AS code,
    dep.airport_name ->> 'en'                 AS airport,
    dep.city ->> 'en'                         AS city,
    COUNT(*)                                  AS total_flights,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
    )                                         AS delayed,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1
    )                                         AS delay_pct,
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (f.actual_departure - f.scheduled_departure)) / 60.0
        ), 1
    )                                         AS avg_delay_all_min,
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (f.actual_departure - f.scheduled_departure)) / 60.0
        ) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ), 1
    )                                         AS avg_delay_late_min
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
WHERE f.status = 'Arrived'
GROUP BY f.departure_airport, dep.airport_name, dep.city
HAVING COUNT(*) >= 100
ORDER BY avg_delay_all_min DESC
LIMIT 15;

-- ---------------------------------------------------------------------------
-- 3. Delay distribution by hour of day (local departure time)
--    Are evening flights really worse than morning flights?
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== DELAY RATE BY HOUR OF DAY (LOCAL TIME) ==='
SELECT
    EXTRACT(HOUR FROM timezone(dep.timezone, f.scheduled_departure))::int AS hour_local,
    COUNT(*)                                  AS flights,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
    )                                         AS delayed,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1
    )                                         AS delay_pct,
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (f.actual_departure - f.scheduled_departure)) / 60.0
        ), 1
    )                                         AS avg_offset_min
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
WHERE f.status = 'Arrived'
GROUP BY hour_local
ORDER BY hour_local;

-- ---------------------------------------------------------------------------
-- 4. Delay rate by day of week (1=Monday, 7=Sunday)
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== DELAY RATE BY DAY OF WEEK ==='
SELECT
    EXTRACT(ISODOW FROM f.scheduled_departure)::int AS day_of_week,
    CASE EXTRACT(ISODOW FROM f.scheduled_departure)::int
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
        WHEN 7 THEN 'Sunday'
    END                                        AS day_name,
    COUNT(*)                                   AS flights,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1
    )                                          AS delay_pct
FROM flights f
WHERE f.status = 'Arrived'
GROUP BY day_of_week
ORDER BY day_of_week;

-- ---------------------------------------------------------------------------
-- 5. Cascading delays: flights where both departure AND arrival were late
--    vs flights that departed late but recovered time in the air.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== DELAY RECOVERY: LATE DEPARTURES THAT MADE UP TIME ==='
SELECT
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
    )                                          AS departed_late,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
          AND f.actual_arrival <= f.scheduled_arrival + INTERVAL '15 min'
    )                                          AS recovered_on_arrival,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
              AND f.actual_arrival <= f.scheduled_arrival + INTERVAL '15 min'
        ) / NULLIF(COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ), 0), 1
    )                                          AS recovery_pct,
    COUNT(*) FILTER (
        WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
          AND f.actual_arrival > f.scheduled_arrival + INTERVAL '15 min'
    )                                          AS stayed_late
FROM flights f
WHERE f.status = 'Arrived';

-- ---------------------------------------------------------------------------
-- 6. Aircraft type and delay correlation
--    Do certain aircraft models have inherently higher delay rates?
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== DELAY RATE BY AIRCRAFT TYPE ==='
SELECT
    a.model ->> 'en'                           AS aircraft,
    a.range                                    AS max_range_km,
    COUNT(*)                                   AS total_flights,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1
    )                                          AS delay_pct,
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (f.actual_departure - f.scheduled_departure)) / 60.0
        ), 1
    )                                          AS avg_offset_min
FROM flights f
JOIN aircrafts_data a ON a.aircraft_code = f.aircraft_code
WHERE f.status = 'Arrived'
GROUP BY a.model, a.range
ORDER BY delay_pct DESC;
