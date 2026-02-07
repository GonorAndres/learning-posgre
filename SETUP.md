# PostgreSQL Local Setup

## 1. Install Docker Engine in WSL2

```bash
# Add Docker's official GPG key and repo
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Let your user run docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Start PostgreSQL

```bash
cd ~/learning_posgre
docker compose up -d
```

## 3. Connect

```bash
# Using docker exec (no local psql needed)
docker exec -it learning_pg psql -U app_user -d learning_db

# Or install psql client only
sudo apt-get install -y postgresql-client
psql -h localhost -U app_user -d learning_db
```

## 4. Try the cheatsheet queries

```bash
docker exec -it learning_pg psql -U app_user -d learning_db -f /docker-entrypoint-initdb.d/../queries_cheatsheet.sql
```

## 5. Stop / Reset

```bash
docker compose down          # Stop (data preserved)
docker compose down -v       # Stop AND delete all data (fresh start)
```
