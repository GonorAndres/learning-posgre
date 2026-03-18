-- =============================================================================
-- 03_utilization_bq.sql -- Aircraft Utilization (BigQuery Standard SQL)
-- =============================================================================
-- Same business questions as analysis/03_utilization.sql.
--
-- Key differences:
--   EXTRACT(EPOCH FROM interval) -> TIMESTAMP_DIFF(ts1, ts2, SECOND)
--   LATERAL join                 -> not available; use correlated subquery or JOIN
--   generate_series              -> UNNEST(GENERATE_ARRAY(...))
--
-- Run: bq query --use_legacy_sql=false < bigquery/03_utilization_bq.sql
-- =============================================================================

-- 1. Fleet overview
SELECT
    a.model_en                                           AS aircraft,
    a.`range`                                            AS max_range_km,
    COUNT(DISTINCT f.flight_id)                          AS total_flights,
    ROUND(
        SUM(TIMESTAMP_DIFF(f.actual_arrival, f.actual_departure, SECOND)) / 3600.0, 1
    )                                                    AS total_flight_hours,
    ROUND(
        AVG(TIMESTAMP_DIFF(f.actual_arrival, f.actual_departure, SECOND)) / 60.0, 1
    )                                                    AS avg_duration_min
FROM `airlines_demo.flights` f
JOIN `airlines_demo.aircrafts_data` a ON a.aircraft_code = f.aircraft_code
WHERE f.status = 'Arrived'
  AND f.actual_arrival IS NOT NULL
  AND f.actual_departure IS NOT NULL
GROUP BY a.model_en, a.`range`
ORDER BY total_flights DESC;

-- 2. Load factor by aircraft type
-- In BQ, we use a subquery instead of LATERAL
WITH flight_capacity AS (
    SELECT aircraft_code, COUNT(*) AS seat_count
    FROM `airlines_demo.seats`
    GROUP BY aircraft_code
),
flight_passengers AS (
    SELECT
        f.flight_id,
        f.aircraft_code,
        COUNT(bp.ticket_no) AS passengers
    FROM `airlines_demo.flights` f
    LEFT JOIN `airlines_demo.boarding_passes` bp ON bp.flight_id = f.flight_id
    WHERE f.status = 'Arrived'
    GROUP BY f.flight_id, f.aircraft_code
)
SELECT
    a.model_en                                           AS aircraft,
    COUNT(fp.flight_id)                                  AS flights,
    ROUND(AVG(fp.passengers), 1)                         AS avg_passengers,
    MAX(fc.seat_count)                                   AS capacity,
    ROUND(100.0 * AVG(fp.passengers) / MAX(fc.seat_count), 1) AS avg_load_factor_pct
FROM flight_passengers fp
JOIN `airlines_demo.aircrafts_data` a ON a.aircraft_code = fp.aircraft_code
JOIN flight_capacity fc ON fc.aircraft_code = fp.aircraft_code
GROUP BY a.model_en
ORDER BY avg_load_factor_pct DESC;

-- 3. Revenue per aircraft type
SELECT
    a.model_en                                           AS aircraft,
    COUNT(DISTINCT f.flight_id)                          AS flights,
    COUNT(tf.ticket_no)                                  AS passengers,
    CAST(SUM(tf.amount) AS INT64)                        AS total_revenue_rub,
    ROUND(SUM(tf.amount) / COUNT(DISTINCT f.flight_id), 2) AS revenue_per_flight,
    ROUND(AVG(tf.amount), 2)                             AS avg_ticket_rub
FROM `airlines_demo.ticket_flights` tf
JOIN `airlines_demo.flights` f ON f.flight_id = tf.flight_id
JOIN `airlines_demo.aircrafts_data` a ON a.aircraft_code = f.aircraft_code
WHERE f.status = 'Arrived'
GROUP BY a.model_en
ORDER BY total_revenue_rub DESC;
