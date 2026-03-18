# Schema Translation: PostgreSQL -> BigQuery

Side-by-side mapping of every column in the airlines demo database.

## Type Mapping

| PostgreSQL Type | BigQuery Type | Notes |
|:---------------|:-------------|:------|
| `character(N)` | `STRING` | BQ has no fixed-length strings; PG pads with spaces (stripped in ETL) |
| `varchar(N)` | `STRING` | No length constraint in BQ |
| `text` | `STRING` | Identical semantics |
| `integer` | `INT64` | BQ only has 64-bit integers |
| `bigint` | `INT64` | Same representation |
| `numeric(10,2)` | `FLOAT64` | BQ NUMERIC exists but FLOAT64 is simpler for analytics |
| `timestamp with time zone` | `TIMESTAMP` | BQ TIMESTAMP is always UTC; timezone stripped in ETL |
| `jsonb` | Flattened `STRING` columns | `model->>'en'` becomes `model_en` column |
| `point` | `FLOAT64` x2 | `coordinates` becomes `longitude` + `latitude` columns |
| `SERIAL` / `SEQUENCE` | `INT64` | No auto-increment in BQ; values preserved from source |
| `boolean` | `BOOL` | Direct mapping |

## Table-by-Table Translation

### aircrafts_data

| PG Column | PG Type | BQ Column | BQ Type | Transform |
|:----------|:--------|:----------|:--------|:----------|
| aircraft_code | char(3) | aircraft_code | STRING | Strip whitespace |
| model | jsonb | model_en | STRING | Extract `->>'en'` |
| | | model_ru | STRING | Extract `->>'ru'` |
| range | integer | range | INT64 | Direct |

### airports_data

| PG Column | PG Type | BQ Column | BQ Type | Transform |
|:----------|:--------|:----------|:--------|:----------|
| airport_code | char(3) | airport_code | STRING | Strip whitespace |
| airport_name | jsonb | airport_name_en | STRING | Extract `->>'en'` |
| | | airport_name_ru | STRING | Extract `->>'ru'` |
| city | jsonb | city_en | STRING | Extract `->>'en'` |
| | | city_ru | STRING | Extract `->>'ru'` |
| coordinates | point | longitude | FLOAT64 | Parse point x-value |
| | | latitude | FLOAT64 | Parse point y-value |
| timezone | text | timezone | STRING | Direct |

### flights

| PG Column | PG Type | BQ Column | BQ Type | Transform |
|:----------|:--------|:----------|:--------|:----------|
| flight_id | serial | flight_id | INT64 | Direct |
| flight_no | char(6) | flight_no | STRING | Strip whitespace |
| scheduled_departure | timestamptz | scheduled_departure | TIMESTAMP | Convert to UTC |
| scheduled_arrival | timestamptz | scheduled_arrival | TIMESTAMP | Convert to UTC |
| departure_airport | char(3) | departure_airport | STRING | Strip whitespace |
| arrival_airport | char(3) | arrival_airport | STRING | Strip whitespace |
| status | varchar(20) | status | STRING | Direct |
| aircraft_code | char(3) | aircraft_code | STRING | Strip whitespace |
| actual_departure | timestamptz | actual_departure | TIMESTAMP | Convert to UTC, nullable |
| actual_arrival | timestamptz | actual_arrival | TIMESTAMP | Convert to UTC, nullable |

### tickets

| PG Column | PG Type | BQ Column | BQ Type | Transform |
|:----------|:--------|:----------|:--------|:----------|
| ticket_no | char(13) | ticket_no | STRING | Strip whitespace |
| book_ref | char(6) | book_ref | STRING | Strip whitespace |
| passenger_id | varchar(20) | passenger_id | STRING | Direct |
| passenger_name | text | passenger_name | STRING | Direct |
| contact_data | jsonb | contact_data | STRING | JSON serialized (flexible schema) |

### bookings, ticket_flights, boarding_passes, seats

Direct column mapping with type translations as shown in the type mapping table above.

## What Gets Lost in Translation

| PostgreSQL Feature | BigQuery Equivalent | Impact |
|:-------------------|:-------------------|:-------|
| CHECK constraints | None | Enforce in pipeline code or BQ data validation |
| FOREIGN KEYS | None | No referential integrity in BQ; enforce in ETL |
| ENUM types | STRING | No type safety; use `WHERE status IN (...)` |
| Partial indexes | Partition pruning + clustering | Different optimization paradigm |
| Triggers | Scheduled queries / Cloud Functions | No row-level triggers in BQ |
| SEQUENCE / SERIAL | No equivalent | Use source values or generate in pipeline |
| VACUUM / MVCC | Not applicable | BQ is append-only with snapshot isolation |

## What BigQuery Adds

| BQ Feature | Benefit |
|:-----------|:--------|
| Automatic sharding | No manual partitioning for parallelism |
| Columnar storage | Only reads columns used in query |
| Slot-based execution | Massively parallel query processing |
| Clustering | Physical ordering by specified columns |
| Partitioning (date) | Prune data by date range automatically |
| Nested/Repeated fields | STRUCT and ARRAY types for denormalization |
