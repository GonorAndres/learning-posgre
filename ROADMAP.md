# Roadmap: Future Improvements

Tracked improvements for future sessions. Each item builds on the existing project (5.74M rows, PG analytics, BQ pipeline, notebook visualizations).

---

## 4. dbt Layer on BigQuery

**Why:** dbt is the industry-standard analytics engineering tool. Adding it connects this project to the data-engineering-platform narrative and shows a tool hiring managers specifically look for.

**What to build:**
- `dbt_project/` directory with `dbt_project.yml`
- `models/staging/` -- thin SQL models over raw BQ tables (type casting, renaming, deduplication)
- `models/marts/` -- analytical-ready models: `fct_flights`, `dim_airports`, `dim_aircraft`, `mart_route_delays`, `mart_revenue_by_route`
- `models/schema.yml` -- column descriptions, tests (`not_null`, `unique`, `accepted_values`)
- `dbt docs generate` -- documentation site showing lineage graph
- Add dbt results to README and blog post

**Dependencies:** BigQuery dataset already loaded (`airlines_demo`), `gcloud` auth active.

**Estimated effort:** 3-4 hours.

---

## 5. CI Pipeline (GitHub Actions)

**Why:** Shows production mindset -- automated validation that every script runs correctly.

**What to build:**
- `.github/workflows/validate.yml`
- Steps: spin up Docker PG, load demo DB, run all `analysis/*.sql`, run all `internals/*.sql`, validate outputs (row counts, no errors)
- Optional: SQL linting with `sqlfluff`
- Badge in README: "Analysis scripts: passing"

**Dependencies:** Demo DB download (~62MB zip) in CI. Consider caching.

**Estimated effort:** 2-3 hours.

---

## 6. Streaming Project

**Why:** Completes the "batch vs streaming" narrative started in data-engineering-platform (P03/P05).

**What to build:**
- Pub/Sub topic for simulated flight events
- Cloud Run subscriber writing to both PG and BQ simultaneously
- Windowed aggregation: delay counts per hour, updating in near-real-time
- Compare latency: PG INSERT vs BQ streaming insert

**Dependencies:** GCP project, Pub/Sub API enabled.

**Estimated effort:** 6-8 hours (new project scope).

---

## 7. ML Delay Prediction Model

**Why:** Bridges data-engineering work with actuarial/ML profile. Uses features already analyzed.

**What to build:**
- `models/` directory with a Jupyter notebook
- Features: hour, day_of_week, departure_airport, arrival_airport, aircraft_type, distance_km, booking_lead_days
- Target: binary (delayed > 15 min or not)
- Models: logistic regression baseline, then gradient boosting (XGBoost or LightGBM)
- Metrics: AUC, precision/recall, feature importance
- Compare: model trained on PG-extracted data vs BQ ML (`CREATE MODEL` in BigQuery)
- Add to README and blog post

**Dependencies:** scikit-learn, xgboost. Data already extracted via pipeline.

**Estimated effort:** 4-5 hours.
