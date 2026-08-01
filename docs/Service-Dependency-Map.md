# StartLnk — Service Dependency & Lifecycle Map

## Component Stack Architecture

StartLnk consists of tightly coupled system and application services. Understanding component dependencies ensures proper boot sequence, graceful restart ordering, and predictable fault recovery.

```
                      ┌──────────────────────┐
                      │    Ubuntu 24.04 OS   │
                      └──────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌────────────────────┐          ┌────────────────────┐
      │ PostgreSQL Service │          │   Redis Service    │
      │  (Port 5432 / DB)  │          │ (Port 6379 / Cache)│
      └──────────┬─────────┘          └──────────┬─────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                      ┌────────────────────┐
                      │  Gunicorn Socket   │
                      │(/run/startlnk.sock)│
                      └──────────┬─────────┘
                                 │
                                 ▼
                      ┌────────────────────┐
                      │  Gunicorn Service  │
                      │  (Django Backend)  │
                      └──────────┬─────────┘
                                 │
                                 ▼
                      ┌────────────────────┐
                      │   Nginx Service    │
                      │(Web Server & Proxy)│
                      └──────────┬─────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌────────────────────┐          ┌────────────────────┐
      │ React SPA Frontend │          │    Certbot SSL     │
      │  (dist/ via Nginx) │          │(TLS Certificates)  │
      └────────────────────┘          └────────────────────┘
                                 │
                                 ▼
                      ┌────────────────────┐
                      │    Healthcheck     │
                      │  (Cron Monitoring) │
                      └────────────────────┘
```

---

## 1. Startup Sequence

When the server boots or restarts from zero state, services MUST initialize in the following strict order:

```
Step 1: Network & File Systems
        └── OS initializes networking, mounts local filesystems

Step 2: Core System Services
        ├── postgresql.service (PostgreSQL database daemon starts, opens 127.0.0.1:5432)
        └── redis-server.service (Redis caching server starts, opens 127.0.0.1:6379)

Step 3: Application IPC Layer
        └── startlnk.socket (Creates socket file /run/startlnk.sock with www-data permissions)

Step 4: Application Server Daemon
        └── startlnk.service (Gunicorn starts 2-3 workers, reads backend/.env, connects to PostgreSQL & Redis)

Step 5: Web Server & Reverse Proxy
        └── nginx.service (Nginx binds to ports 80/443, loads SSL certs, links to /run/startlnk.sock & static/dist files)

Step 6: Cron & Health Probes
        └── cron.service (Executes healthcheck.sh every 5 minutes to verify HTTP 200)
```

---

## 2. Restart & Update Sequence

During zero-downtime updates (`update.sh`) or manual service restarts, shutdown and startup must proceed in reverse/forward cascade:

```
Order for Graceful Application Reload:
1. Reload Nginx configuration:       sudo systemctl reload nginx
2. Send SIGHUP to Gunicorn workers:  sudo systemctl reload startlnk.service
                                     (Or restart: sudo systemctl restart startlnk.service)

Order for Complete Infrastructure Restart:
1. Stop Nginx:                       sudo systemctl stop nginx
2. Stop Gunicorn:                    sudo systemctl stop startlnk.service
3. Stop Gunicorn Socket:             sudo systemctl stop startlnk.socket
4. Restart Databases:                sudo systemctl restart postgresql redis-server
5. Start Gunicorn Socket:            sudo systemctl start startlnk.socket
6. Start Gunicorn Service:           sudo systemctl start startlnk.service
7. Start Nginx:                      sudo systemctl start nginx
```

---

## 3. Failure Dependency Analysis

| Failed Component | Downstream Impact | Error Exhibited to Users | Recovery Action |
|------------------|-------------------|--------------------------|-----------------|
| **PostgreSQL** | Gunicorn backend views crash on DB queries | HTTP 500 Internal Server Error | `sudo systemctl restart postgresql && sudo systemctl restart startlnk.service` |
| **Redis** | Session/cache fails (graceful degradation via LocMem fallbacks if configured) | Latency spike or auth/rate-limit errors | `sudo systemctl restart redis-server` |
| **Gunicorn Socket** | Nginx cannot forward `/api/` or `/auth/` requests | HTTP 502 Bad Gateway | `sudo systemctl restart startlnk.socket startlnk.service` |
| **Gunicorn Service** | Python processes unresponsive | HTTP 502 Bad Gateway or 504 Gateway Timeout | `sudo systemctl restart startlnk.service` |
| **Nginx** | Complete website inaccessible | Connection Refused / Cannot reach site | `sudo nginx -t && sudo systemctl restart nginx` |
| **Certbot / SSL** | Browser shows Security Warning (Expired Cert) | Privacy Error / NET::ERR_CERT_DATE_INVALID | `sudo certbot renew --force-renewal && sudo systemctl reload nginx` |

---

## 4. Systemd Dependency Declarations

To ensure systemd enforces this dependency chain natively, unit templates declare:

**gunicorn.service.template**:
```ini
[Unit]
Requires={{APP_NAME}}.socket
After=network.target postgresql.service redis-server.service
```

This guarantees systemd will never attempt to launch Gunicorn before PostgreSQL, Redis, and the IPC socket are ready.
