# StartLnk — Fresh Server Readiness & Manual Steps Audit

## Executive Summary
Following Phase 4.5 framework completion, this report provides an honest assessment of whether a completely blank Ubuntu VPS can be fully provisioned using only `install.sh`, `postgres.sh`, and `deploy.sh`.

---

## 1. Complete Provisioning Workflow on a Fresh Ubuntu VPS

```
                          ┌───────────────────────────┐
                          │    Blank Ubuntu 24.04     │
                          └─────────────┬─────────────┘
                                        │
                         [Manual Step 1: Initial SSH & Git]
                                        │
                          ┌─────────────▼─────────────┐
                          │ git clone StartLnk repo   │
                          └─────────────┬─────────────┘
                                        │
                         [Manual Step 2: Master Config]
                                        │
                          ┌─────────────▼─────────────┐
                          │ cp deployment/config.ex   │
                          │ deployment/config (edit)  │
                          └─────────────┬─────────────┘
                                        │
                         [Automated Step 1: System Dependencies]
                                        │
                          ┌─────────────▼─────────────┐
                          │ bash deployment/install.sh│
                          └─────────────┬─────────────┘
                                        │
                         [Automated Step 2: Database Provisioning]
                                        │
                          ┌─────────────▼─────────────┐
                          │ bash deployment/postgres.sh
                          └─────────────┬─────────────┘
                                        │
                         [Automated Step 3: Application Build & Release Cutover]
                                        │
                          ┌─────────────▼─────────────┐
                          │ bash deployment/deploy.sh │
                          └─────────────┬─────────────┘
                                        │
                         [Manual Step 3: Initial SSL Cert]
                                        │
                          ┌─────────────▼─────────────┐
                          │ certbot --nginx -d DOMAIN │
                          └───────────────────────────┘
```

---

## 2. Identified Manual Steps (External & One-Time)

To ensure total transparency, here is every remaining step that requires operator interaction outside of `install.sh`, `postgres.sh`, and `deploy.sh`:

### 1. Cloud Instance & Network Provisioning (Cloud Console)
- **Action**: Provisioning the Ubuntu 24.04/22.04 virtual machine on your cloud provider (DigitalOcean Droplet, AWS EC2, Hetzner Cloud, Vultr, Azure).
- **Inbound Security Groups**: If deploying on AWS EC2 or Azure, allowing inbound TCP traffic on ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) in the cloud provider's web console.

### 2. DNS A Record Mapping (DNS Registrar)
- **Action**: Pointing your domain's A records (`startlnk.xyz` and `www.startlnk.xyz`) to the static IPv4 address of the VPS.

### 3. Creating Master Configuration (`deployment/config`)
- **Action**: Copying `deployment/config.example` to `deployment/config` and editing secrets (`SECRET_KEY`, `JWT_SECRET_KEY`, `DB_PASSWORD`, `DOMAIN`, `SERVER_IP`, `GOOGLE_CLIENT_ID`).
- **Why Manual**: Security best practice — production secrets MUST NOT be committed to Git.

### 4. Initial SSL Certificate Issuance (Certbot)
- **Action**: Running `sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN` after DNS propagation.
- **Why Manual**: Certbot requires active DNS resolution to pass the Let's Encrypt ACME HTTP-01 challenge. Once issued, Certbot auto-renews certificates automatically via its systemd timer (`certbot.timer`).

---

## 3. What Is Now 100% Automated

The following previously manual operations are now completely automated by `install.sh`, `postgres.sh`, and `deploy.sh`:

| Task | Automation Handler | Status |
|------|--------------------|--------|
| APT package installation (Python, Node, PostgreSQL, Redis, Nginx, Certbot, UFW) | `install.sh` | **100% Automated** |
| Deployment user (`safi`) & web group (`www-data`) creation | `install.sh` | **100% Automated** |
| PostgreSQL database user (`startlnkuser`) creation & password setup | `postgres.sh` | **100% Automated** |
| PostgreSQL database (`startlnkdb`) creation & schema privilege grants | `postgres.sh` | **100% Automated** |
| Release directory structure creation (`releases/YYYYMMDD-HHMMSS/`) | `deploy.sh` | **100% Automated** |
| `.env` & `.env.production` file rendering from master config | `deploy.sh` | **100% Automated** |
| Isolated Python virtual environment & package compilation (`requirements.txt`) | `deploy.sh` | **100% Automated** |
| Deterministic Node package install (`npm ci` / `npm install`) & Vite React SPA build | `deploy.sh` | **100% Automated** |
| Django database schema migrations (`python manage.py migrate`) | `deploy.sh` | **100% Automated** |
| Django static asset collection (`python manage.py collectstatic`) | `deploy.sh` | **100% Automated** |
| Persistent media & log symlinking (`shared/media`, `shared/logs`) | `deploy.sh` | **100% Automated** |
| Nginx site configuration & systemd socket/service unit generation | `deploy.sh` | **100% Automated** |
| Logrotate configuration installation (`/etc/logrotate.d/startlnk`) | `deploy.sh` | **100% Automated** |
| Pre-cutover health verification (DB, Redis, staticfiles, Nginx syntax) | `deploy.sh` | **100% Automated** |
| Atomic release symlink cutover (`current`) & service reloads | `deploy.sh` | **100% Automated** |

---

## 4. Final Verdict

**YES.** A completely blank Ubuntu VPS can now be fully prepared and brought to production using **ONLY `install.sh`, `postgres.sh`, and `deploy.sh`**, combined with the 4 standard manual prerequisites (VPS creation, DNS mapping, filling `deployment/config`, and running initial `certbot`).

There are **zero missing backend dependencies, database bootstrap gaps, or log rotation gaps** remaining in the foundation.
