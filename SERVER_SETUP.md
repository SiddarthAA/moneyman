# MoneyMan — Server Migration & Run Guide

Ports used:
- **Frontend:** `3999` (host) → `3000` (container)
- **Backend API:** `8999` (host) → `8000` (container)

---

## Prerequisites

Install these on your server before starting.

### Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (avoids sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### Tailscale
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate (follow the URL it prints)
sudo tailscale up

# Get your server's Tailscale IP — you'll need this in the next step
tailscale ip -4
# Example output: 100.64.10.5
```

### Git
```bash
sudo apt-get install -y git    # Debian/Ubuntu
# or
sudo dnf install -y git        # Fedora/RHEL
```

---

## 1. Copy the Code to the Server

### Option A — Git (recommended if you push to a remote repo)
```bash
git clone https://github.com/YOUR_USER/moneyman.git
cd moneyman
```

### Option B — rsync from your local machine
Run this **on your local machine** (not the server):
```bash
rsync -avz --exclude '.git' --exclude 'backend/.venv' --exclude 'frontend/node_modules' --exclude 'frontend/.next' \
  /home/sidd/Desktop/moneyman/ \
  user@<SERVER_IP_OR_HOSTNAME>:~/moneyman/
```
Then SSH into the server and `cd ~/moneyman`.

### Option C — scp
```bash
# On your local machine
scp -r /home/sidd/Desktop/moneyman user@<SERVER_IP>:~/moneyman
```

---

## 2. Configure Environment Variables

On the server, inside the project directory:

```bash
cp .env .env.backup   # keep a backup
nano .env             # or vim .env
```

Set these values:

```dotenv
# Required — get your key at https://console.groq.com
GROQ_API_KEY=gsk_YOUR_REAL_KEY_HERE

# Replace 100.64.10.5 with your actual Tailscale IP (from: tailscale ip -4)
CORS_ORIGINS=http://localhost:3999,http://127.0.0.1:3999,http://100.64.10.5:3999
```

**No other variables need to be changed.** The frontend-to-backend communication happens inside Docker's private network and is not affected by CORS.

---

## 3. (Optional) Configure Firewall

Allow the two ports through your server's firewall so Tailscale and local traffic can reach them.

### UFW (Ubuntu/Debian)
```bash
sudo ufw allow 3999/tcp comment "MoneyMan frontend"
sudo ufw allow 8999/tcp comment "MoneyMan backend API"
sudo ufw reload
sudo ufw status
```

### firewalld (Fedora/RHEL/Rocky)
```bash
sudo firewall-cmd --permanent --add-port=3999/tcp
sudo firewall-cmd --permanent --add-port=8999/tcp
sudo firewall-cmd --reload
```

### iptables (manual / minimal installs)
```bash
sudo iptables -I INPUT -p tcp --dport 3999 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8999 -j ACCEPT
# Save rules so they survive reboot (varies by distro):
sudo iptables-save > /etc/iptables/rules.v4
```

> **Tailscale note:** Tailscale traffic arrives on the `tailscale0` interface. If your firewall blocks it by default, also allow that interface:
> ```bash
> sudo ufw allow in on tailscale0
> ```

---

## 4. Build & Start

```bash
cd ~/moneyman

# Build images and start all services in the background
docker compose up -d --build

# Watch logs during startup (Ctrl+C to stop watching, containers keep running)
docker compose logs -f
```

The first build takes 3–5 minutes. Subsequent starts are fast (images are cached).

---

## 5. Verify Everything Is Running

```bash
# Check container status — both should show "healthy" after ~30s
docker compose ps

# Quick API smoke-test
curl http://localhost:8999/health
# Expected: {"status":"ok"} or similar

# Frontend smoke-test
curl -s -o /dev/null -w "%{http_code}" http://localhost:3999
# Expected: 200
```

---

## 6. Access the App

| From | URL |
|------|-----|
| On the server itself | `http://localhost:3999` |
| From another Tailscale device | `http://<SERVER_TAILSCALE_IP>:3999` |
| Direct LAN (if firewall allows) | `http://<SERVER_LAN_IP>:3999` |

Replace `<SERVER_TAILSCALE_IP>` with the IP from `tailscale ip -4` (e.g. `http://100.64.10.5:3999`).

---

## 7. Day-to-Day Management

```bash
# Stop everything
docker compose down

# Start again (no rebuild)
docker compose up -d

# Pull latest code changes and rebuild
git pull
docker compose up -d --build

# Restart a single service
docker compose restart backend
docker compose restart frontend

# View live logs
docker compose logs -f backend
docker compose logs -f frontend

# Check resource usage
docker stats
```

---

## 8. Data & Backups

Data is stored in Docker named volumes (`moneyman_data` for the SQLite DB, `moneyman_uploads` for bill images). These survive restarts and rebuilds.

```bash
# Backup the database to a local file
docker run --rm \
  -v moneyman_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/moneyman_db_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restore a backup
docker run --rm \
  -v moneyman_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/moneyman_db_backup_YYYYMMDD.tar.gz -C /data
```

---

## 9. Flush / Reset Data

If you ever want to wipe all transactions and reset account balances (like a fresh start):

```bash
# While containers are running:
docker exec -it $(docker compose ps -q backend) \
  python -c "
import sqlite3
conn = sqlite3.connect('/app/data/moneyman.db')
conn.execute('DELETE FROM transactions')
conn.execute('UPDATE accounts SET balance = 0.0')
conn.commit()
conn.close()
print('Done.')
"
```

---

## 10. Troubleshooting

### Containers won't start / exit immediately
```bash
docker compose logs backend
docker compose logs frontend
```

### Backend stuck in "starting" / health check failing
The backend health check waits up to 60 s. If it keeps failing:
```bash
docker compose logs backend | tail -50
```

### "CORS error" in browser console
Your Tailscale IP isn't in `CORS_ORIGINS`. Edit `.env`, add your IP, then:
```bash
docker compose up -d
```
(No rebuild needed for env var changes.)

### Port already in use
```bash
sudo ss -tlnp | grep -E '3999|8999'
# Kill the conflicting process, or change ports in docker-compose.yml
```

### Tailscale device can't reach the server
```bash
# On the server, check Tailscale status
tailscale status

# Ping the server from another Tailscale device
ping <SERVER_TAILSCALE_IP>

# Make sure the server's firewall allows tailscale0
sudo ufw allow in on tailscale0
```