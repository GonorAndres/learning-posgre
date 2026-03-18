# Loading the Airlines Demo Database

The analysis scripts in `analysis/` run against the [PostgresPro Demo Database](https://postgrespro.com/community/demodb) -- real flight data across 104 Russian airports.

## Quick Start

```bash
# 1. Start the container (if not running)
docker compose up -d --wait

# 2. Load the demo database (~3-8 min for medium, longer for big)
docker exec -i learning_pg psql -U app_user -d postgres < demo-medium-en-20170815.sql

# 3. Verify
docker exec -it learning_pg psql -U app_user -d demo -c \
  "SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'bookings' ORDER BY n_live_tup DESC;"
```

## Expected Row Counts (medium version)

| Table | Rows |
|:------|-----:|
| ticket_flights | ~2,360,335 |
| boarding_passes | ~1,894,295 |
| tickets | ~829,071 |
| bookings | ~593,433 |
| flights | ~65,672 |
| seats | ~1,346 |
| airports_data | 104 |
| aircrafts_data | 9 |

## Getting the Data

The dump is not committed to git (239 MB). Download it:

```bash
# Medium version (~700 MB on disk, recommended)
curl -O https://edu.postgrespro.com/demo-medium-en.zip
unzip demo-medium-en.zip

# Big version (~2.5 GB on disk)
curl -O https://edu.postgrespro.com/demo-big-en.zip
unzip demo-big-en.zip
```

## How the Dump Works

The SQL dump:
1. Creates a new database called `demo`
2. Creates a `bookings` schema inside it
3. Defines 8 tables, 3 views, and 2 helper functions
4. Loads all data via `COPY` statements

Your e-commerce schema in `learning_db` is untouched -- the airline data lives in its own database.

## Running Analysis

```bash
# Run all analysis scripts in order
for f in analysis/0*.sql; do
  echo "--- Running $f ---"
  docker exec -i learning_pg psql -U app_user -d demo < "$f"
done

# Run a single script
docker exec -i learning_pg psql -U app_user -d demo < analysis/01_delays.sql
```

## Schema Reference

```
bookings ──> tickets ──> ticket_flights ──> flights ──> airports_data
                              |                |
                              v                v
                        boarding_passes    aircrafts_data ──> seats
```

Key data types: `JSONB` for multilingual names (`->>'en'`), `point` for coordinates, `timestamptz` for all times. The function `bookings.now()` returns `2017-08-15 18:00:00 Europe/Moscow` -- the "present" in this dataset.
