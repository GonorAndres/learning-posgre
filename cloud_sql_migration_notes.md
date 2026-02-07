# What Changes When Moving to Cloud SQL

## What stays EXACTLY the same
- All your SQL (tables, indexes, views, triggers, functions)
- JSONB, full-text search, enums -- all PostgreSQL features work
- Role/grant model (but Cloud SQL adds IAM on top)
- pg_dump / pg_restore for migrations
- Connection string format: `host + port + user + password + dbname`

## What changes

### Connection
| Local (Docker)                        | Cloud SQL                                      |
|---------------------------------------|------------------------------------------------|
| `localhost:5432`                       | Cloud SQL Proxy -> `127.0.0.1:5432`            |
| Direct TCP                            | Proxy handles TLS + IAM auth automatically     |
| `.env` file with password             | Secret Manager or IAM database authentication  |

### Configuration
| Local                                  | Cloud SQL                                     |
|----------------------------------------|-----------------------------------------------|
| `postgresql.conf` file                 | Database Flags in console/terraform            |
| You tune `shared_buffers` manually     | Auto-tuned based on instance tier              |
| `wal_level` you set                    | Always `replica` (can't change)                |
| `max_connections` you choose           | Depends on instance RAM (auto-scaled)          |

### Backups
| Local                                  | Cloud SQL                                     |
|----------------------------------------|-----------------------------------------------|
| `pg_dump` manually                     | Automatic daily backups (7-day retention)      |
| You manage backup files                | Point-in-time recovery built in                |
| `docker compose down -v` = data loss   | Instance deletion requires explicit flag       |

### Networking
| Local                                  | Cloud SQL                                     |
|----------------------------------------|-----------------------------------------------|
| Exposed on `localhost:5432`            | Private IP inside VPC (recommended)            |
| No encryption                          | TLS enforced by default                        |
| No firewall                            | Authorized Networks whitelist                  |

### Roles & Auth
| Local                                  | Cloud SQL                                     |
|----------------------------------------|-----------------------------------------------|
| `app_user` is superuser                | `cloudsqlsuperuser` (limited vs true superuser)|
| Password in `.env`                     | IAM authentication (recommended)               |
| CREATE ROLE manually                   | `gcloud sql users create` or IAM binding       |

## Cloud SQL setup commands (for reference)

```bash
# Create instance
gcloud sql instances create my-instance \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --database-flags=log_min_duration_statement=250

# Create database
gcloud sql databases create learning_db --instance=my-instance

# Create user
gcloud sql users create app_user --instance=my-instance --password=STRONG_PASSWORD

# Connect via proxy (run in background)
cloud-sql-proxy my-project:us-central1:my-instance &

# Then connect normally
psql -h 127.0.0.1 -U app_user -d learning_db

# Import your local dump
gcloud sql import sql my-instance gs://my-bucket/backup.sql --database=learning_db
```
