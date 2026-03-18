-- =============================================================================
-- 04_geospatial_bq.sql -- Geospatial Analysis (BigQuery Standard SQL)
-- =============================================================================
-- Same business questions as analysis/06_geospatial.sql.
--
-- Key differences from PostgreSQL:
--   PG: point type + custom haversine_km() PL/pgSQL function
--   BQ: ST_GEOGPOINT(lon, lat) + ST_DISTANCE() (built-in, meters)
--
--   PG: coordinates[0] (lon), coordinates[1] (lat) from point type
--   BQ: longitude and latitude are pre-flattened FLOAT64 columns
--
--   PG: ROUND(x::numeric, N) -- need explicit cast
--   BQ: ROUND(x, N) -- works on FLOAT64 directly
--
-- Run: bq query --use_legacy_sql=false < bigquery/04_geospatial_bq.sql
-- =============================================================================

-- 1. Top 20 longest routes by great-circle distance
-- BQ's ST_DISTANCE returns meters; divide by 1000 for km.
SELECT
    dep.airport_name_en                             AS departure,
    dep.city_en                                     AS dep_city,
    arr.airport_name_en                             AS arrival,
    arr.city_en                                     AS arr_city,
    ROUND(
        ST_DISTANCE(
            ST_GEOGPOINT(dep.longitude, dep.latitude),
            ST_GEOGPOINT(arr.longitude, arr.latitude)
        ) / 1000.0, 0
    )                                               AS distance_km,
    COUNT(*)                                        AS total_flights
FROM `airlines_demo.flights` f
JOIN `airlines_demo.airports_data` dep ON dep.airport_code = f.departure_airport
JOIN `airlines_demo.airports_data` arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY dep.airport_name_en, dep.city_en, dep.longitude, dep.latitude,
         arr.airport_name_en, arr.city_en, arr.longitude, arr.latitude
ORDER BY distance_km DESC
LIMIT 20;

-- 2. Delay rate by distance bucket
WITH route_stats AS (
    SELECT
        f.departure_airport,
        f.arrival_airport,
        ST_DISTANCE(
            ST_GEOGPOINT(dep.longitude, dep.latitude),
            ST_GEOGPOINT(arr.longitude, arr.latitude)
        ) / 1000.0                                  AS distance_km,
        COUNT(*)                                    AS flights,
        COUNTIF(
            f.actual_departure > TIMESTAMP_ADD(f.scheduled_departure, INTERVAL 15 MINUTE)
        )                                           AS delayed
    FROM `airlines_demo.flights` f
    JOIN `airlines_demo.airports_data` dep ON dep.airport_code = f.departure_airport
    JOIN `airlines_demo.airports_data` arr ON arr.airport_code = f.arrival_airport
    WHERE f.status = 'Arrived'
    GROUP BY f.departure_airport, f.arrival_airport,
             dep.longitude, dep.latitude, arr.longitude, arr.latitude
)
SELECT
    CASE
        WHEN distance_km < 500   THEN '1: <500 km'
        WHEN distance_km < 1000  THEN '2: 500-1000 km'
        WHEN distance_km < 2000  THEN '3: 1000-2000 km'
        WHEN distance_km < 4000  THEN '4: 2000-4000 km'
        ELSE                          '5: 4000+ km'
    END                             AS distance_bucket,
    COUNT(*)                        AS routes,
    SUM(flights)                    AS total_flights,
    ROUND(100.0 * SUM(delayed) / SUM(flights), 1) AS delay_pct,
    ROUND(AVG(distance_km), 0)      AS avg_distance_km
FROM route_stats
GROUP BY distance_bucket
ORDER BY distance_bucket;

-- 3. Airport connectivity
SELECT
    f.departure_airport                              AS code,
    dep.airport_name_en                              AS airport,
    dep.city_en                                      AS city,
    COUNT(DISTINCT f.arrival_airport)                 AS destinations,
    COUNT(*)                                         AS total_departures,
    ROUND(AVG(
        ST_DISTANCE(
            ST_GEOGPOINT(dep.longitude, dep.latitude),
            ST_GEOGPOINT(arr.longitude, arr.latitude)
        ) / 1000.0
    ), 0)                                            AS avg_route_km
FROM `airlines_demo.flights` f
JOIN `airlines_demo.airports_data` dep ON dep.airport_code = f.departure_airport
JOIN `airlines_demo.airports_data` arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY f.departure_airport, dep.airport_name_en, dep.city_en
ORDER BY destinations DESC
LIMIT 20;
