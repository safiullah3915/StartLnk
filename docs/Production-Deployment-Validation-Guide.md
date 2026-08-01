# StartLnk — Production Deployment Validation Guide & Test Plan

> **Document Purpose**: End-to-end operational guide for testing and validating `deployment/install.sh` and `deployment/deploy.sh` on a completely clean Ubuntu VPS.  
> **Target Environment**: Fresh Ubuntu 24.04 LTS / 22.04 LTS VPS (DigitalOcean, AWS, Azure, Hetzner, Vultr, Linode, Oracle Cloud).

---

## 1. Test VM Specifications & Requirements

Before initiating testing on a fresh VPS, ensure the cloud instance meets these minimum specifications:

| Resource | Minimum Requirement | Recommended Specification | Rationale |
|----------|---------------------|---------------------------|-----------|
| **Operating System** | Ubuntu 22.04 LTS (x86_64) | Ubuntu 24.04 LTS (x86_64) | Tested kernel 6.8+ & systemd daemons |
| **CPU** | 1 vCPU | 2 vCPUs | Accelerates Node.js `vite build` compilation |
| **RAM** | 1.5 GiB | 2.0 GiB | Django + Gunicorn + Redis + PostgreSQL footprint |
| **Swap** | 1.0 GiB file swap | 2.0 GiB file swap (`/swapfile`) | Prevents OOM kills during `npm run build` |
| **Disk Storage** | 20 GB SSD | 30–50 GB NVMe/SSD | Retains node_modules, static files & releases |
| **Network IPv4** | Public static IPv4 | Public static IPv4 + DNS A record | Required for Let's Encrypt SSL validation |
| **Inbound Firewall** | TCP 22, 80, 443 | TCP 22, 80, 443 | Port 8000 MUST be blocked in production |

---

## 2. End-to-End Deployment Test Plan

Follow this exact sequence on a brand-new VPS containing only a base Ubuntu operating system.

### Step 1: Initial VPS Connection & Environment Setup
Connect to the fresh server as root or a sudo user:
```bash
ssh root@YOUR_SERVER_IP
# Or ssh ubuntu@YOUR_SERVER_IP
```

Ensure basic SSH and Git are available:
```bash
sudo apt-get update -qq && sudo apt-get install -y -qq git curl
```

### Step 2: Clone Project Repository
Clone the repository into a temporary bootstrap path or directly to the project root:
```bash
sudo git clone https://github.com/safiullah3915/StartLnk.git /home/safi/StartLnk
cd /home/safi/StartLnk
```

### Step 3: Initialize Master Configuration (`deployment/config`)
Copy the master config template and populate server identity, domain, and secrets:
```bash
sudo cp deployment/config.example deployment/config
sudo nano deployment/config
```

**Required Edits in `deployment/config`**:
- `APP_NAME=startlnk`
- `DOMAIN=startlnk.xyz` (or your test domain / IP)
- `SERVER_IP=YOUR_SERVER_IP`
- `DEPLOY_USER=safi`
- `DEPLOY_GROUP=www-data`
- `SECRET_KEY=generate-a-secure-50-character-secret`
- `JWT_SECRET_KEY=generate-a-secure-jwt-secret`
- `DB_PASSWORD=choose-a-strong-postgres-password`
- `GOOGLE_CLIENT_ID=your-google-oauth-client-id`
- `ADMIN_EMAIL=your-email@example.com`

### Step 4: Run System Installer (`install.sh`)
Execute `install.sh` to install system packages, Node.js, Python, PostgreSQL, Redis, Nginx, Certbot, and set up the deploy user:
```bash
sudo bash deployment/install.sh
```

### Step 5: Run Primary Application Deployer (`deploy.sh`)
Execute `deploy.sh` to create the initial release, compile frontend assets, run database migrations, render configs, and start systemd services:
```bash
sudo bash deployment/deploy.sh
```

### Step 6: Configure DNS & Issue SSL Certificate
Point your domain's DNS A Record to `YOUR_SERVER_IP`. Once DNS propagates:
```bash
sudo certbot --nginx --non-interactive --agree-tos -m admin@your-domain.com -d your-domain.com -d www.your-domain.com
sudo systemctl reload nginx
```

---

## 3. Stage-by-Stage Deployment Checklist

| Stage | Objective | Execution Command | Expected Result | Verification Check | Failure Recovery |
|-------|-----------|-------------------|-----------------|--------------------|------------------|
| **1. Server Prep** | Verify OS & root access | `uname -a && id` | Ubuntu 22.04/24.04 (uid=0) | Exit status 0 | Upgrade OS / login via sudo |
| **2. Repo Clone** | Fetch deployment framework | `git clone ...` | Code checked out at target path | `ls -la deployment/` | Check git URL & SSH keys |
| **3. Master Config** | Define single source of truth | `cp deployment/config.example deployment/config` | File created with mode `0600` | `test -f deployment/config` | Fill required variables |
| **4. System Install** | Install system dependencies | `sudo bash deployment/install.sh` | All APT packages installed | `node -v && python3 -V && psql -V` | Inspect `/var/log/startlnk_install.log` |
| **5. App Deploy** | Build release & switch symlink | `sudo bash deployment/deploy.sh` | Release active at `current` | `ls -l current` | Inspect `/var/log/startlnk_deploy.log` |
| **6. SSL Setup** | Enable HTTPS certificate | `sudo certbot --nginx ...` | Let's Encrypt cert installed | `curl -I https://DOMAIN` | Check DNS propagation |

---

## 4. Post-Deployment Functional Validation Checklist

Execute this checklist after `deploy.sh` completes to verify 100% operational functionality:

```markdown
- [ ] 1. Gunicorn Active: `systemctl is-active startlnk.service` returns `active`
- [ ] 2. Gunicorn Socket: `test -S /run/startlnk.sock` returns exit status 0
- [ ] 3. Nginx Active: `systemctl is-active nginx` returns `active`
- [ ] 4. Nginx Syntax: `nginx -t` returns `syntax is ok`
- [ ] 5. PostgreSQL Connected: `sudo -u postgres psql -d startlnkdb -c '\dt'` lists Django tables
- [ ] 6. Redis Connected: `redis-cli ping` returns `PONG`
- [ ] 7. React SPA Loading: `curl -sL http://localhost/ | grep "<div id=\"root\">"` matches React mount
- [ ] 8. Backend API Responding: `curl -s http://localhost/api/ | grep -i "detail\|startups\|url"` returns valid JSON
- [ ] 9. Django Admin Portal: Browser opens `https://YOUR_DOMAIN/admin/login/` cleanly with CSS styles
- [ ] 10. Static Files Served: `curl -I http://localhost/static/admin/css/base.css` returns HTTP 200 OK
- [ ] 11. Media Uploads Working: Profile picture upload in app writes to `shared/media/profiles/`
- [ ] 12. HTTPS / SSL Valid: `openssl s_client -connect YOUR_DOMAIN:443` returns valid chain
- [ ] 13. Google OAuth Enabled: Login modal renders Google sign-in button without CORS errors
```

---

## 5. Failure Scenarios & Diagnostics

### 1. Gunicorn Service Fails to Start (`startlnk.service`)
- **Symptoms**: HTTP 502 Bad Gateway from Nginx; `systemctl status startlnk.service` shows `failed`.
- **Possible Causes**: Missing virtualenv, uninstalled Python package, syntax error in Django `settings.py`, or `.env` unreadable.
- **Diagnosis Commands**:
  ```bash
  sudo systemctl status startlnk.service
  sudo journalctl -u startlnk.service -n 50 --no-pager
  /home/safi/startlnk/current/backend/venv/bin/python /home/safi/startlnk/current/backend/manage.py check
  ```
- **Resolution**: Fix syntax error or missing `.env` variable, then restart: `sudo systemctl restart startlnk.service`.

---

### 2. Nginx Fails to Start or Reload
- **Symptoms**: Connection Refused on port 80/443; `nginx -t` reports error.
- **Possible Causes**: Duplicate `server_name`, syntax error in template, missing SSL cert path.
- **Diagnosis Commands**:
  ```bash
  sudo nginx -t
  sudo journalctl -u nginx -n 30 --no-pager
  ```
- **Resolution**: Edit template, fix placeholder values, re-render, and test: `sudo nginx -t && sudo systemctl reload nginx`.

---

### 3. `collectstatic` Fails During Deployment
- **Symptoms**: `deploy.sh` halts at Stage 5 with `Permission denied` or `Missing static folder`.
- **Possible Causes**: Incorrect `STATIC_ROOT` permissions or invalid path in `settings.py`.
- **Diagnosis Commands**:
  ```bash
  cd /home/safi/startlnk/releases/CURRENT_RELEASE/backend
  ./venv/bin/python manage.py collectstatic --noinput --traceback
  ```
- **Resolution**: Ensure `STATIC_ROOT` is inside the release directory and owned by `safi:www-data`.

---

### 4. Database Migrations Fail (`manage.py migrate`)
- **Symptoms**: `deploy.sh` fails at Stage 5; PostgreSQL throws auth error or missing table error.
- **Possible Causes**: Database credentials in `deployment/config` incorrect, PostgreSQL daemon stopped, or conflicting migration files.
- **Diagnosis Commands**:
  ```bash
  sudo systemctl status postgresql
  sudo -u postgres psql -c "\l"
  cd /home/safi/startlnk/current/backend && ./venv/bin/python manage.py showmigrations
  ```
- **Resolution**: Correct `DB_PASSWORD` in `deployment/config`, restart PostgreSQL, re-run `deploy.sh`.

---

### 5. Redis Service Unavailable
- **Symptoms**: Django backend logs show `redis.exceptions.ConnectionError`; presence tracking degrades.
- **Possible Causes**: Redis daemon stopped, bound to wrong port/IP, or out of memory.
- **Diagnosis Commands**:
  ```bash
  sudo systemctl status redis-server
  redis-cli ping
  redis-cli info memory
  ```
- **Resolution**: Start Redis (`sudo systemctl start redis-server`), ensure `127.0.0.1:6379` binding.

---

### 6. PostgreSQL Database Connection Refused
- **Symptoms**: Django crashes with `psycopg2.OperationalError: could not connect to server`.
- **Possible Causes**: PostgreSQL service crashed, database user `startlnkuser` does not exist, or `pg_hba.conf` misconfigured.
- **Diagnosis Commands**:
  ```bash
  sudo systemctl status postgresql
  sudo -u postgres psql -c "\du"
  ```
- **Resolution**: Create user and database via `postgres.sh` helper or manually:
  ```bash
  sudo -u postgres psql -c "CREATE USER startlnkuser WITH PASSWORD 'password';"
  sudo -u postgres psql -c "CREATE DATABASE startlnkdb OWNER startlnkuser;"
  ```

---

### 7. SSL / Certbot Challenge Fails
- **Symptoms**: Certbot output reports `Could not connect to http://your-domain.com/.well-known/acme-challenge/`.
- **Possible Causes**: DNS A record not pointing to server IP, port 80 blocked by cloud firewall, or Nginx not listening on port 80.
- **Diagnosis Commands**:
  ```bash
  dig +short YOUR_DOMAIN
  curl -I http://YOUR_DOMAIN/.well-known/acme-challenge/test
  sudo ufw status
  ```
- **Resolution**: Verify DNS record, open port 80 in cloud security groups (AWS/DigitalOcean/Azure), re-run Certbot.

---

### 8. Permission Denied on Media or Static Directories
- **Symptoms**: HTTP 403 Forbidden on `/media/profiles/image.png` or uploaded files fail to save.
- **Possible Causes**: Directory owned by `root` instead of `safi:www-data`, or permissions set to `0700`.
- **Diagnosis Commands**:
  ```bash
  ls -ld /home/safi/startlnk/shared/media
  namei -l /home/safi/startlnk/shared/media/profiles
  ```
- **Resolution**: Reset ownership & permissions:
  ```bash
  sudo chown -R safi:www-data /home/safi/startlnk/shared/media
  sudo chmod -R 775 /home/safi/startlnk/shared/media
  ```

---

### 9. Missing or Unreadable `.env` File
- **Symptoms**: Django uses default insecure keys or sqlite database instead of PostgreSQL.
- **Possible Causes**: `generate-config.sh` or template rendering failed; file permissions restricted.
- **Diagnosis Commands**:
  ```bash
  ls -la /home/safi/startlnk/current/backend/.env
  head -n 5 /home/safi/startlnk/current/backend/.env
  ```
- **Resolution**: Re-render config template:
  ```bash
  sudo bash deployment/deploy.sh
  ```

---

### 10. Frontend `npm build` or `npm ci` Fails
- **Symptoms**: `deploy.sh` Stage 4 fails with `JavaScript heap out of memory` or `npm ERR!`.
- **Possible Causes**: VPS RAM < 1.5 GB without swap; node package conflict.
- **Diagnosis Commands**:
  ```bash
  free -h
  cd /home/safi/startlnk/releases/CURRENT_RELEASE/frontend && npm run build
  ```
- **Resolution**: Add 2 GB swap file:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  ```

---

### 11. Python `pip install` Dependency Compilation Fails
- **Symptoms**: `pip install -r requirements.txt` fails compiling C-extensions (e.g. `psycopg2`, `Pillow`).
- **Possible Causes**: Missing `python3-dev`, `build-essential`, or `libpq-dev`.
- **Diagnosis Commands**:
  ```bash
  dpkg -s build-essential python3-dev
  ```
- **Resolution**: Run `install.sh` to ensure build headers exist:
  ```bash
  sudo apt-get install -y build-essential python3-dev libpq-dev
  ```

---

## 6. Operations Validation Matrix

Use this matrix during testing on every deployment run:

| Step # | Operation / Command | Target Component | Expected Output | Pass/Fail Criteria |
|--------|---------------------|------------------|-----------------|-------------------|
| **V-01** | `check_root` | System | Exit code 0 | PASS if EUID=0 |
| **V-02** | `check_ubuntu` | OS | `Ubuntu 22.04` or `24.04` | PASS if supported |
| **V-03** | `python3 --version` | Python | `Python 3.12.x` or `3.11.x` | PASS if >= 3.11 |
| **V-04** | `node -v` | Node.js | `v20.x.x` | PASS if >= 18 |
| **V-05** | `psql --version` | PostgreSQL | `psql 16.x` | PASS if >= 14 |
| **V-06** | `redis-cli ping` | Redis | `PONG` | PASS if PONG returned |
| **V-07** | `systemctl is-active startlnk.service` | Gunicorn | `active` | PASS if active |
| **V-08** | `systemctl is-active nginx` | Nginx | `active` | PASS if active |
| **V-09** | `test -S /run/startlnk.sock` | Socket | Exit code 0 | PASS if socket file exists |
| **V-10** | `curl -s -o /dev/null -w "%{http_code}" http://localhost/` | React SPA | `200` | PASS if HTTP 200 |
| **V-11** | `curl -s -o /dev/null -w "%{http_code}" http://localhost/api/` | Django API | `200` or `401` | PASS if API responds |
| **V-12** | `nginx -t` | Nginx Config | `syntax is ok` | PASS if no syntax errors |

---

## 7. Framework Review & Comprehensive Audit

A thorough audit of all framework files implemented so far (`deployment/config.example`, `deployment/project.yml`, `deployment/templates/*`, `deployment/lib/*`, `install.sh`, `deploy.sh`) reveals the following findings:

### 1. Missing Items
- **No Database Helper Script**: `install.sh` currently does not run automated PostgreSQL database/user creation commands (`postgres.sh` placeholder). The database user and schema must be created manually before `deploy.sh` can migrate.
- **No Log Rotation Config Installed**: `logrotate.conf.template` exists in theory, but neither `install.sh` nor `deploy.sh` currently installs a file into `/etc/logrotate.d/startlnk`.
- **No Backup Helper Script**: Scheduled database dumps (`backup.sh`) are not yet created.

### 2. Risky Assumptions
- **Pre-existing User `safi`**: Scripts assume `safi` is the deploy user. If run on AWS EC2 (`ubuntu` user) or Azure (`azureuser`), `install.sh` correctly creates `safi`, but permissions must ensure the user has appropriate home directory permissions.
- **Node.js System Package Version**: `apt-get install nodejs` on stock Ubuntu 24.04 installs Node 18 or 20, but on minimal OS images it might install Node 12/14 unless NodeSource repository is added.

### 3. Portability Considerations
- **AWS Security Groups**: `install.sh` configures `ufw`, but AWS EC2 and Azure require inbound HTTP (80) and HTTPS (443) rules enabled in their cloud security groups outside the OS.

### 4. Remaining Hardcoded Values Check
- **Zero hardcoded paths found**: All templates in `deployment/templates/` use `{{MUSTACHE}}` placeholders.
- **Zero hardcoded domains found**: Domains and IPs are injected strictly from `deployment/config`.

### 5. Security Concerns
- **Master Secrets File (`deployment/config`)**: Must remain mode `0600` owned by `safi:safi`. Verified that `.gitignore` excludes `deployment/config`.
- **`client_secret.json`**: Verified that `client_secret.json` is gitignored.

### 6. Documentation Gaps
- Operational runbooks for database backup/restore and SSL certificate manual renewal are scheduled for Phase 6 & Phase 8.

---

> [!NOTE]
> **Validation Guide Complete.** Proceed to test `install.sh` and `deploy.sh` on a fresh Ubuntu VPS using this guide.
