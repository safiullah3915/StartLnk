# StartLnk — Configuration Mapping Reference

## Single Source of Truth Architecture

To prevent configuration drift, credentials mismatch, and manual duplication across multiple environments, the deployment framework relies on a **Single Source of Truth** model.

The operator modifies only one file:
`deployment/config`

During deployment or update execution, `generate-config.sh` parses `deployment/config` against templates in `deployment/templates/` to produce all operational configuration files automatically.

```
                         ┌──────────────────┐
                         │ deployment/config│
                         └────────┬─────────┘
                                  │
                       generate-config.sh
                                  │
       ┌──────────────────────────┼──────────────────────────┬──────────────────────────┐
       ▼                          ▼                          ▼                          ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ backend/.env │          │  frontend/   │          │ Nginx Config │          │ Systemd Unit │
│              │          │.env.production│         │(site.conf)   │          │ (gunicorn)   │
└──────────────┘          └──────────────┘          └──────────────┘          └──────────────┘
```

---

## Detailed Mapping Specification

### 1. `backend/.env` (Django Environment File)
- **Source Template**: `deployment/templates/backend.env.template`
- **Output Location**: `${RELEASE_DIR}/backend/.env`
- **Purpose**: Provides runtime secrets, database connection parameters, security flags, and SMTP settings to Django via `python-decouple`.

| `deployment/config` Variable | `backend/.env` Key | Purpose |
|-----------------------------|-------------------|---------|
| `SECRET_KEY` | `SECRET_KEY` | Django cryptographic signing key |
| `DEBUG` | `DEBUG` | Enables/disables debug mode (set to `False` in production) |
| `DOMAIN`, `SERVER_IP` | `ALLOWED_HOSTS` | Host HTTP header validation (`${DOMAIN},www.${DOMAIN},${SERVER_IP}`) |
| `DB_ENGINE` | `DB_ENGINE` | Database backend engine (`django.db.backends.postgresql`) |
| `DB_NAME` | `DB_NAME` | PostgreSQL database name (`startlnkdb`) |
| `DB_USER` | `DB_USER` | PostgreSQL user (`startlnkuser`) |
| `DB_PASSWORD` | `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | `DB_HOST` | Database host (`localhost`) |
| `DB_PORT` | `DB_PORT` | Database port (`5432`) |
| `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` | OAuth Client ID for Google Auth |
| `JWT_SECRET_KEY` | `JWT_SECRET_KEY` | Secret key for JWT token generation |
| `JWT_COOKIE_SECURE` | `JWT_COOKIE_SECURE` | Secure flag for JWT cookies (`True` for HTTPS) |
| `DOMAIN` | `CORS_ALLOWED_ORIGINS` | Allowed CORS origins (`https://${DOMAIN},https://www.${DOMAIN}`) |
| `EMAIL_*` | `EMAIL_*` | SMTP credentials and backend settings |
| `REDIS_URL` | `REDIS_URL` | Redis connection string (`redis://127.0.0.1:6379/0`) |

---

### 2. `frontend/.env.production` (React / Vite Build Environment File)
- **Source Template**: `deployment/templates/frontend.env.template`
- **Output Location**: `${RELEASE_DIR}/frontend/.env.production`
- **Purpose**: Injected during `npm run build` so Vite bakes production URLs into the static bundle.

| `deployment/config` Variable | `frontend/.env.production` Key | Value / Behavior |
|-----------------------------|--------------------------------|------------------|
| *(none)* | `VITE_API_BASE_URL` | Empty string (forces relative `/api/` calls proxied by Nginx) |
| `GOOGLE_CLIENT_ID` | `VITE_GOOGLE_CLIENT_ID` | Public OAuth Client ID |
| `DOMAIN` | `VITE_APP_URL` | Canonical site URL (`https://${DOMAIN}`) |
| *(static)* | `VITE_ENV` | `production` |

---

### 3. Nginx Site Configuration (`/etc/nginx/sites-available/${APP_NAME}`)
- **Source Template**: `deployment/templates/nginx.conf.template`
- **Output Location**: `/etc/nginx/sites-available/${APP_NAME}` (symlinked to `/etc/nginx/sites-enabled/`)
- **Purpose**: Defines reverse proxy rules, static/media file aliases, SSL certificates, Gzip compression, and security headers.

| `deployment/config` Variable | Nginx Placeholder | Resulting Directive |
|-----------------------------|-------------------|--------------------|
| `DOMAIN`, `SERVER_IP` | `{{DOMAIN}}`, `{{SERVER_IP}}` | `server_name startlnk.xyz www.startlnk.xyz 64.227.180.47;` |
| `DEPLOY_ROOT` | `{{FRONTEND_DIST_DIR}}` | `root ${DEPLOY_ROOT}/current/frontend/dist;` |
| `DEPLOY_ROOT` | `{{STATIC_ROOT}}` | `alias ${DEPLOY_ROOT}/current/backend/staticfiles/;` |
| `DEPLOY_ROOT` | `{{MEDIA_ROOT}}` | `alias ${DEPLOY_ROOT}/shared/media/;` |
| `APP_NAME` | `{{SOCKET_PATH}}` | `proxy_pass http://unix:/run/${APP_NAME}.sock;` |
| `DOMAIN` | `{{SSL_CERT_PATH}}` | `ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;` |
| `DOMAIN` | `{{SSL_KEY_PATH}}` | `ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;` |

---

### 4. Gunicorn Systemd Unit (`/etc/systemd/system/${APP_NAME}.service`)
- **Source Template**: `deployment/templates/gunicorn.service.template`
- **Output Location**: `/etc/systemd/system/${APP_NAME}.service`
- **Purpose**: Systemd daemon definition for managing Gunicorn WSGI processes.

| `deployment/config` Variable | Service Placeholder | Resulting Directive |
|-----------------------------|--------------------|--------------------|
| `DEPLOY_USER` | `{{DEPLOY_USER}}` | `User=safi` |
| `DEPLOY_GROUP` | `{{DEPLOY_GROUP}}` | `Group=www-data` |
| `DEPLOY_ROOT` | `{{WORKING_DIRECTORY}}` | `WorkingDirectory=${DEPLOY_ROOT}/current/backend` |
| `DEPLOY_ROOT` | `{{VENV_PATH}}` | `ExecStart=${DEPLOY_ROOT}/current/backend/venv/bin/gunicorn ...` |
| `GUNICORN_WORKERS` | `{{GUNICORN_WORKERS}}` | Worker process count (e.g. `3`) |
| `GUNICORN_TIMEOUT` | `{{GUNICORN_TIMEOUT}}` | Worker timeout in seconds (e.g. `60`) |
| `APP_NAME` | `{{SOCKET_PATH}}` | `--bind unix:/run/${APP_NAME}.sock` |

---

### 5. Gunicorn Systemd Socket (`/etc/systemd/system/${APP_NAME}.socket`)
- **Source Template**: `deployment/templates/gunicorn.socket.template`
- **Output Location**: `/etc/systemd/system/${APP_NAME}.socket`
- **Purpose**: Manages Unix socket creation and permission mapping (`0660`).

| `deployment/config` Variable | Socket Placeholder | Resulting Directive |
|-----------------------------|-------------------|--------------------|
| `APP_NAME` | `{{SOCKET_PATH}}` | `ListenStream=/run/${APP_NAME}.sock` |
| `DEPLOY_USER` | `{{DEPLOY_USER}}` | `SocketUser=safi` |
| `DEPLOY_GROUP` | `{{DEPLOY_GROUP}}` | `SocketGroup=www-data` |
