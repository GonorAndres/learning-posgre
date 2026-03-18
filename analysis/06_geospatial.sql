-- =============================================================================
-- 06_geospatial.sql -- Geospatial Analysis
-- =============================================================================
-- Business question: "How does geography affect delays, revenue, and
-- connectivity across Russia's 104-airport network?"
--
-- PostgreSQL stores airport locations as `point` (lon, lat). We use a
-- PL/pgSQL haversine function to calculate great-circle distances, since
-- the built-in `<->` operator computes Euclidean distance (useless for
-- geographic coordinates on a sphere).
--
-- Run: docker exec -i learning_pg psql -U app_user -d demo < analysis/06_geospatial.sql
-- =============================================================================

SET search_path = bookings, public;

-- ---------------------------------------------------------------------------
-- 0. Create haversine distance function (great-circle distance in km)
--    point stores (longitude, latitude) -- note: lon first, lat second.
-- ---------------------------------------------------------------------------
\echo '=== SETUP: Haversine distance function ==='
CREATE OR REPLACE FUNCTION haversine_km(p1 point, p2 point)
RETURNS double precision
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    lat1 double precision := radians(p1[1]);
    lon1 double precision := radians(p1[0]);
    lat2 double precision := radians(p2[1]);
    lon2 double precision := radians(p2[0]);
    dlat double precision := lat2 - lat1;
    dlon double precision := lon2 - lon1;
    a double precision;
BEGIN
    a := sin(dlat/2)^2 + cos(lat1) * cos(lat2) * sin(dlon/2)^2;
    RETURN 6371.0 * 2 * asin(sqrt(a));
END;
$$;
\echo 'haversine_km(point, point) created.'

-- ---------------------------------------------------------------------------
-- 1. Top 20 longest routes by great-circle distance
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== TOP 20 LONGEST ROUTES BY DISTANCE ==='
WITH route_distances AS (
    SELECT
        d.airport_code AS dep_code, d.airport_name ->> 'en' AS dep_name,
        d.city ->> 'en' AS dep_city,
        a.airport_code AS arr_code, a.airport_name ->> 'en' AS arr_name,
        a.city ->> 'en' AS arr_city,
        haversine_km(d.coordinates, a.coordinates) AS distance_km
    FROM airports_data d
    CROSS JOIN airports_data a
    WHERE d.airport_code <> a.airport_code
)
SELECT
    rd.dep_name                                     AS departure,
    rd.dep_city,
    rd.arr_name                                     AS arrival,
    rd.arr_city,
    ROUND(rd.distance_km::numeric, 0)               AS distance_km,
    COUNT(*)                                        AS total_flights
FROM flights f
JOIN route_distances rd ON rd.dep_code = f.departure_airport
                       AND rd.arr_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY rd.dep_name, rd.dep_city, rd.arr_name, rd.arr_city, rd.distance_km
ORDER BY distance_km DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- 2. Delay rate vs distance: do longer routes have higher delay rates?
--    Bucket routes by distance range and show delay stats.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== DELAY RATE BY DISTANCE BUCKET ==='
WITH pair_distances AS (
    SELECT
        d.airport_code AS dep_code, a.airport_code AS arr_code,
        haversine_km(d.coordinates, a.coordinates) AS distance_km
    FROM airports_data d CROSS JOIN airports_data a
    WHERE d.airport_code <> a.airport_code
),
route_stats AS (
    SELECT
        f.departure_airport,
        f.arrival_airport,
        pd.distance_km,
        COUNT(*)                                       AS flights,
        COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        )                                              AS delayed
    FROM flights f
    JOIN pair_distances pd ON pd.dep_code = f.departure_airport
                          AND pd.arr_code = f.arrival_airport
    WHERE f.status = 'Arrived'
    GROUP BY f.departure_airport, f.arrival_airport, pd.distance_km
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
    ROUND(AVG(distance_km)::numeric, 0)            AS avg_distance_km
FROM route_stats
GROUP BY distance_bucket
ORDER BY distance_bucket;

-- ---------------------------------------------------------------------------
-- 3. Airport connectivity: destinations and traffic volume
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== AIRPORT CONNECTIVITY (top 20 by destinations) ==='
SELECT
    f.departure_airport                              AS code,
    dep.airport_name ->> 'en'                        AS airport,
    dep.city ->> 'en'                                AS city,
    COUNT(DISTINCT f.arrival_airport)                 AS destinations,
    COUNT(*)                                         AS total_departures,
    ROUND(AVG(haversine_km(dep.coordinates, arr.coordinates))::numeric, 0) AS avg_route_km
FROM flights f
JOIN airports_data dep ON dep.airport_code = f.departure_airport
JOIN airports_data arr ON arr.airport_code = f.arrival_airport
WHERE f.status = 'Arrived'
GROUP BY f.departure_airport, dep.airport_name, dep.city
ORDER BY destinations DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- 4. Revenue per kilometer: most profitable routes per unit distance
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== REVENUE PER KILOMETER (top 20 routes, 50+ flights) ==='
WITH route_revenue AS (
    SELECT
        f.departure_airport,
        f.arrival_airport,
        SUM(tf.amount) AS total_revenue,
        COUNT(DISTINCT f.flight_id) AS flights,
        COUNT(tf.ticket_no) AS passengers
    FROM ticket_flights tf
    JOIN flights f ON f.flight_id = tf.flight_id
    WHERE f.status = 'Arrived'
    GROUP BY f.departure_airport, f.arrival_airport
    HAVING COUNT(DISTINCT f.flight_id) >= 50
)
SELECT
    dep.airport_name ->> 'en'                         AS departure,
    arr.airport_name ->> 'en'                         AS arrival,
    ROUND(haversine_km(dep.coordinates, arr.coordinates)::numeric, 0) AS distance_km,
    rr.flights,
    rr.passengers,
    ROUND(rr.total_revenue::numeric, 0)               AS revenue_rub,
    ROUND((rr.total_revenue / haversine_km(dep.coordinates, arr.coordinates))::numeric, 0) AS revenue_per_km
FROM route_revenue rr
JOIN airports_data dep ON dep.airport_code = rr.departure_airport
JOIN airports_data arr ON arr.airport_code = rr.arrival_airport
WHERE haversine_km(dep.coordinates, arr.coordinates) > 0
ORDER BY revenue_per_km DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- 5. Geographic extremes: easternmost, westernmost, northernmost flights
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== GEOGRAPHIC EXTREMES ==='
SELECT 'Easternmost airport' AS label,
       airport_code, airport_name ->> 'en' AS name,
       city ->> 'en' AS city,
       coordinates[0] AS longitude, coordinates[1] AS latitude
FROM airports_data ORDER BY coordinates[0] DESC LIMIT 1;

SELECT 'Westernmost airport' AS label,
       airport_code, airport_name ->> 'en' AS name,
       city ->> 'en' AS city,
       coordinates[0] AS longitude, coordinates[1] AS latitude
FROM airports_data ORDER BY coordinates[0] ASC LIMIT 1;

SELECT 'Northernmost airport' AS label,
       airport_code, airport_name ->> 'en' AS name,
       city ->> 'en' AS city,
       coordinates[0] AS longitude, coordinates[1] AS latitude
FROM airports_data ORDER BY coordinates[1] DESC LIMIT 1;

SELECT 'Southernmost airport' AS label,
       airport_code, airport_name ->> 'en' AS name,
       city ->> 'en' AS city,
       coordinates[0] AS longitude, coordinates[1] AS latitude
FROM airports_data ORDER BY coordinates[1] ASC LIMIT 1;
