# Project: learning_posgre

## Obsidian Vault
- The `docs/` folder is a symlink to the Windows Obsidian vault at `/mnt/c/Users/andre/Documents/learning-postgres-docs`
- All documentation, notes, and learning materials (.md, .sql) should be copied into `docs/` subfolders so they are visible in Obsidian
- Use subfolders inside `docs/` to keep things organized by topic/session
- Current structure:
  - `docs/first_view/` - Initial PostgreSQL fundamentals and architecture notes
  - `docs/local-docker-setup/` - Docker Compose setup, exercises, Cloud SQL migration notes
  - `docs/posgres-docs/` - General postgres docs

## Docker PostgreSQL
- Local PostgreSQL 16 runs via `docker compose up -d` (container: `learning_pg`)
- Connect: `docker exec -it learning_pg psql -U app_user -d learning_db`
- Config: `config/postgresql.conf` (production-like, modeled after Cloud SQL)
- Init scripts in `init-scripts/` run once on first volume creation (ordered by filename prefix)
