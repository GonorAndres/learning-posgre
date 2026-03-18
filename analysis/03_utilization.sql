-- =============================================================================
-- 03_utilization.sql -- Aircraft Utilization Analysis
-- =============================================================================
-- Business question: "Which aircraft types are being used most efficiently,
-- and where is there slack in the schedule?"
--
-- Load factor = boarding passes issued / seats available on that aircraft.
-- Turnaround = gap between arrival and next departure for the same aircraft.
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < analysis/03_utilization.sql
-- =============================================================================

SET search_path = bookings, public;

-- ---------------------------------------------------------------------------
-- 1. Fleet overview: flights, flight hours, and avg duration per aircraft type
-- ---------------------------------------------------------------------------
\echo '=== FLEET OVERVIEW ==='
SELECT
    a.model ->> 'en'                                      AS aircraft,
    a.range                                               AS max_range_km,
    COUNT(DISTINCT f.flight_id)                           AS total_flights,
    ROUND(
        SUM(EXTRACT(EPOCH FROM (f.actual_arrival - f.actual_departure))) / 3600.0, 1
    )                                                     AS total_flight_hours,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (f.actual_arrival - f.actual_departure))) / 60.0, 1
    )                                                     AS avg_duration_min,
    ROUND(
        SUM(EXTRACT(EPOCH FROM (f.actual_arrival - f.actual_departure))) / 3600.0
        / COUNT(DISTINCT f.flight_id), 2
    )                                                     AS avg_hours_per_flight
FROM flights f
JOIN aircrafts_data a ON a.aircraft_code = f.aircraft_code
WHERE f.status = 'Arrived'
GROUP BY a.model, a.range
ORDER BY total_flights DESC;

-- ---------------------------------------------------------------------------
-- 2. Seat capacity per aircraft type
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== SEAT CAPACITY BY AIRCRAFT AND CLASS ==='
SELECT
    a.model ->> 'en'                           AS aircraft,
    COUNT(*) FILTER (WHERE s.fare_conditions = 'Economy')  AS economy_seats,
    COUNT(*) FILTER (WHERE s.fare_conditions = 'Comfort')  AS comfort_seats,
    COUNT(*) FILTER (WHERE s.fare_conditions = 'Business') AS business_seats,
    COUNT(*)                                               AS total_seats
FROM seats s
JOIN aircrafts_data a ON a.aircraft_code = s.aircraft_code
GROUP BY a.model
ORDER BY total_seats DESC;

-- ---------------------------------------------------------------------------
-- 3. Load factor by aircraft type
--    boarding_passes count = actual passengers boarded
--    seats count for that aircraft_code = capacity
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== LOAD FACTOR BY AIRCRAFT TYPE ==='
WITH flight_capacity AS (
    SELECT
        s.aircraft_code,
        COUNT(*) AS seat_count
    FROM seats s
    GROUP BY s.aircraft_code
),
flight_passengers AS (
    SELECT
        f.flight_id,
        f.aircraft_code,
        COUNT(bp.ticket_no) AS passengers
    FROM flights f
    LEFT JOIN boarding_passes bp ON bp.flight_id = f.flight_id
    WHERE f.status = 'Arrived'
    GROUP BY f.flight_id, f.aircraft_code
)
SELECT
    a.model ->> 'en'                             AS aircraft,
    COUNT(fp.flight_id)                          AS flights,
    ROUND(AVG(fp.passengers), 1)                 AS avg_passengers,
    MAX(fc.seat_count)                           AS capacity,
    ROUND(100.0 * AVG(fp.passengers) / MAX(fc.seat_count), 1) AS avg_load_factor_pct,
    ROUND(100.0 * MIN(fp.passengers) / MAX(fc.seat_count), 1) AS min_load_factor_pct,
    ROUND(100.0 * MAX(fp.passengers) / MAX(fc.seat_count), 1) AS max_load_factor_pct
FROM flight_passengers fp
JOIN aircrafts_data a ON a.aircraft_code = fp.aircraft_code
JOIN flight_capacity fc ON fc.aircraft_code = fp.aircraft_code
GROUP BY a.model
ORDER BY avg_load_factor_pct DESC;

-- ---------------------------------------------------------------------------
-- 4. Routes with consistently low load factor (underperformers)
--    Only routes with 30+ completed flights.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== ROUTES WITH LOWEST LOAD FACTOR (30+ flights) ==='
WITH flight_capacity AS (
    SELECT aircraft_code, COUNT(*) AS seat_count
    FROM seats
    GROUP BY aircraft_code
),
flight_load AS (
    SELECT
        f.flight_id,
        f.departure_airport,
        f.arrival_airport,
        f.aircraft_code,
        COUNT(bp.ticket_no) AS passengers,
        fc.seat_count
    FROM flights f
    LEFT JOIN boarding_passes bp ON bp.flight_id = f.flight_id
    JOIN flight_capacity fc ON fc.aircraft_code = f.aircraft_code
    WHERE f.status = 'Arrived'
    GROUP BY f.flight_id, f.departure_airport, f.arrival_airport,
             f.aircraft_code, fc.seat_count
)
SELECT
    dep.airport_name ->> 'en'                    AS departure,
    arr.airport_name ->> 'en'                    AS arrival,
    COUNT(*)                                     AS flights,
    ROUND(AVG(100.0 * fl.passengers / fl.seat_count), 1) AS avg_load_pct,
    ROUND(AVG(fl.passengers), 1)                 AS avg_passengers,
    MAX(fl.seat_count)                           AS capacity
FROM flight_load fl
JOIN airports_data dep ON dep.airport_code = fl.departure_airport
JOIN airports_data arr ON arr.airport_code = fl.arrival_airport
GROUP BY dep.airport_name, arr.airport_name
HAVING COUNT(*) >= 30
ORDER BY avg_load_pct ASC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- 5. Aircraft turnaround time
--    Gap between landing (actual_arrival) and next takeoff (actual_departure)
--    for the same physical aircraft_code on consecutive flights.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== AIRCRAFT TURNAROUND TIME ==='
WITH ordered_flights AS (
    SELECT
        f.aircraft_code,
        f.flight_id,
        f.actual_arrival,
        f.actual_departure,
        f.departure_airport,
        LEAD(f.actual_departure) OVER (
            PARTITION BY f.aircraft_code
            ORDER BY f.actual_departure
        ) AS next_departure,
        LEAD(f.departure_airport) OVER (
            PARTITION BY f.aircraft_code
            ORDER BY f.actual_departure
        ) AS next_dep_airport
    FROM flights f
    WHERE f.status = 'Arrived'
      AND f.actual_arrival IS NOT NULL
),
turnarounds AS (
    SELECT
        aircraft_code,
        EXTRACT(EPOCH FROM (next_departure - actual_arrival)) / 60.0 AS turnaround_min
    FROM ordered_flights
    WHERE next_departure IS NOT NULL
      AND next_departure > actual_arrival
      -- Same aircraft doing consecutive flights
      AND EXTRACT(EPOCH FROM (next_departure - actual_arrival)) / 3600.0 < 24
)
SELECT
    a.model ->> 'en'                              AS aircraft,
    COUNT(*)                                      AS turnaround_count,
    ROUND(AVG(t.turnaround_min)::numeric, 1)               AS avg_turnaround_min,
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.turnaround_min))::numeric, 1) AS median_turnaround_min,
    ROUND(MIN(t.turnaround_min)::numeric, 1)               AS min_turnaround_min,
    ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY t.turnaround_min))::numeric, 1) AS p90_turnaround_min
FROM turnarounds t
JOIN aircrafts_data a ON a.aircraft_code = t.aircraft_code
GROUP BY a.model
ORDER BY avg_turnaround_min;

-- ---------------------------------------------------------------------------
-- 6. Utilization by day of week: are weekends underutilized?
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== FLIGHTS AND LOAD FACTOR BY DAY OF WEEK ==='
WITH flight_capacity AS (
    SELECT aircraft_code, COUNT(*) AS seat_count
    FROM seats
    GROUP BY aircraft_code
)
SELECT
    EXTRACT(ISODOW FROM f.scheduled_departure)::int AS dow,
    CASE EXTRACT(ISODOW FROM f.scheduled_departure)::int
        WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed'
        WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat' WHEN 7 THEN 'Sun'
    END                                         AS day_name,
    COUNT(DISTINCT f.flight_id)                 AS flights,
    ROUND(AVG(sub.passengers), 1)               AS avg_passengers,
    ROUND(AVG(100.0 * sub.passengers / fc.seat_count), 1) AS avg_load_pct
FROM flights f
JOIN flight_capacity fc ON fc.aircraft_code = f.aircraft_code
JOIN LATERAL (
    SELECT COUNT(*) AS passengers
    FROM boarding_passes bp
    WHERE bp.flight_id = f.flight_id
) sub ON TRUE
WHERE f.status = 'Arrived'
GROUP BY dow
ORDER BY dow;
