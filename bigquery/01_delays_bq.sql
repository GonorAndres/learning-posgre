-- =============================================================================
-- 01_delays_bq.sql -- Route Delay Analysis (BigQuery Standard SQL)
-- =============================================================================
-- Same business questions as analysis/01_delays.sql, translated to BigQuery.
--
-- Key syntax differences from PostgreSQL:
--   INTERVAL '15 min'          -> INTERVAL 15 MINUTE
--   EXTRACT(EPOCH FROM ...)    -> TIMESTAMP_DIFF(..., SECOND)
--   FILTER (WHERE ...)         -> COUNTIF(...) / SUM(IF(...))
--   ->>'en'                    -> columns are pre-flattened (airport_name_en)
--   timezone(tz, ts)           -> not needed (timestamps stored as UTC)
--
-- Run: bq query --use_legacy_sql=false < bigquery/01_delays_bq.sql
-- =============================================================================

-- 1. Top 20 routes by delay percentage
SELECT
    dep.airport_name_en         AS departure,
    arr.airport_name_en         AS arrival,
    COUNT(*)                    AS total_flights,
    COUNTIF(
        f.actual_departure > TIMESTAMP_ADD(f.scheduled_departure, INTERVAL 15 MINUTE)
    )                           AS delayed_flights,
    ROUND(
        100.0 * COUNTIF(
            f.actual_departure > TIMESTAMP_ADD(f.scheduled_departure, INTERVAL 15 MINUTE)
        ) / COUNT(*), 1
    )                           AS delay_pct,
    ROUND(
        AVG(IF(
            f.actual_departure > TIMESTAMP_ADD(f.scheduled_departure, INTERVAL 15 MINUTE),
            TIMESTAMP_DIFF(f.actual_departure, f.scheduled_departure, SECOND) / 60.0,
            NULL
        )), 1
    )                           AS avg_delay_min
FROM `airlines_demo.flights` f
JOIN `airlines_demo.airports_data` dep ON dep.airport_code = f.departure_airport
JOIN `airlines_demo.airports_data` arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY dep.airport_name_en, arr.airport_name_en
HAVING COUNT(*) >= 50
ORDER BY delay_pct DESC
LIMIT 20;

-- 2. Delay rate by hour of day
-- Note: no timezone() function in BQ; timestamps are already UTC.
-- We extract hour directly (equivalent to UTC hour).
SELECT
    EXTRACT(HOUR FROM f.scheduled_departure) AS hour_utc,
    COUNT(*)                                  AS flights,
    COUNTIF(
        f.actual_departure > TIMESTAMP_ADD(f.scheduled_departure, INTERVAL 15 MINUTE)
    )                                         AS delayed,
    ROUND(
        100.0 * COUNTIF(
            f.actual_departure > TIMESTAMP_ADD(f.scheduled_departure, INTERVAL 15 MINUTE)
        ) / COUNT(*), 1
    )                                         AS delay_pct
FROM `airlines_demo.flights` f
WHERE f.status = 'Arrived'
GROUP BY hour_utc
ORDER BY hour_utc;

-- 3. Delay rate by aircraft type
SELECT
    a.model_en                                AS aircraft,
    a.`range`                                 AS max_range_km,
    COUNT(*)                                  AS total_flights,
    ROUND(
        100.0 * COUNTIF(
            f.actual_departure > TIMESTAMP_ADD(f.scheduled_departure, INTERVAL 15 MINUTE)
        ) / COUNT(*), 1
    )                                         AS delay_pct,
    ROUND(
        AVG(TIMESTAMP_DIFF(f.actual_departure, f.scheduled_departure, SECOND) / 60.0), 1
    )                                         AS avg_offset_min
FROM `airlines_demo.flights` f
JOIN `airlines_demo.aircrafts_data` a ON a.aircraft_code = f.aircraft_code
WHERE f.status = 'Arrived'
GROUP BY a.model_en, a.`range`
ORDER BY delay_pct DESC;
