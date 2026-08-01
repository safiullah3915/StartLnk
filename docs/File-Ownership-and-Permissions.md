# StartLnk — File Ownership & Permission Security Matrix

## 1. Ownership & Security Philosophy

Principle of Least Privilege (PoLP) requires that application files are owned by an unprivileged deployment user (`DEPLOY_USER`, e.g. `safi`), while Nginx (`www-data`) has read-only access to compiled assets and write access strictly limited to designated user upload paths (`shared/media`).

### User & Group Roles

| Entity | Default Name | Role |
|--------|--------------|------|
| **Deploy User** | `safi` | Owns project repository, release builds, virtualenvs, deployment scripts, master config |
| **Web Group** | `www-data` | Nginx execution group; granted read access to static assets & write access to media uploads |
| **Database Users** | `postgres`, `redis` | Dedicated system accounts running database daemons |
| **System Root** | `root` | Systemd unit installer & Certbot SSL cert owner |

---

## 2. Component Ownership Architecture

```
/home/safi/startlnk/                                User: safi       Group: www-data
├── releases/                                       User: safi       Group: www-data
│   └── 20260801-143022/                            User: safi       Group: www-data
│       ├── backend/                                User: safi       Group: www-data
│       │   ├── staticfiles/ (755)                  User: safi       Group: www-data
│       │   └── .env (640)                          User: safi       Group: www-data
│       └── frontend/dist/ (755)                    User: safi       Group: www-data
├── current (symlink)                               User: safi       Group: www-data
├── shared/                                         User: safi       Group: www-data
│   ├── media/ (775)                                User: safi       Group: www-data
│   ├── logs/ (775)                                 User: safi       Group: www-data
│   └── backups/ (700)                              User: safi       Group: safi
└── deployment/                                     User: safi       Group: safi
    └── config (600)                                User: safi       Group: safi
```

---

## 3. Comprehensive Permission Matrix

| Path / Directory | Owner | Group | Mode (chmod) | Access Justification |
|------------------|-------|-------|--------------|----------------------|
| `${DEPLOY_ROOT}` | `safi` | `www-data` | `0755` (rwxr-xr-x) | Allows Nginx (`www-data`) to traverse into current release |
| `${DEPLOY_ROOT}/releases/` | `safi` | `www-data` | `0755` (rwxr-xr-x) | Nginx traversal to active release assets |
| `${RELEASE_DIR}/backend/` | `safi` | `www-data` | `0755` (rwxr-xr-x) | Gunicorn execution directory |
| `${RELEASE_DIR}/backend/.env` | `safi` | `www-data` | `0640` (rw-r-----) | **CRITICAL**: Contains DB & JWT secrets; unreadable by world |
| `${RELEASE_DIR}/backend/staticfiles/` | `safi` | `www-data` | `0755` (rwxr-xr-x) | Nginx serves static CSS/JS files |
| `${RELEASE_DIR}/frontend/dist/` | `safi` | `www-data` | `0755` (rwxr-xr-x) | Nginx serves React compiled index.html & assets |
| `${DEPLOY_ROOT}/shared/` | `safi` | `www-data` | `0755` (rwxr-xr-x) | Persistent data directory root |
| `${DEPLOY_ROOT}/shared/media/` | `safi` | `www-data` | `0775` (rwxrwxr-x) | **CRITICAL**: Django writes uploads; Nginx serves them |
| `${DEPLOY_ROOT}/shared/logs/` | `safi` | `www-data` | `0775` (rwxrwxr-x) | Django logger & Gunicorn write log files here |
| `${DEPLOY_ROOT}/shared/backups/` | `safi` | `safi` | `0700` (rwx------) | **CRITICAL**: Database dumps; isolated from web group |
| `${DEPLOY_ROOT}/deployment/` | `safi` | `safi` | `0750` (rwxr-x---) | Deployment scripts and templates |
| `${DEPLOY_ROOT}/deployment/config` | `safi` | `safi` | `0600` (rw-------) | **CRITICAL**: Master secrets; readable strictly by deploy user |
| `/etc/nginx/sites-available/` | `root` | `root` | `0644` (rw-r--r--) | Standard Nginx site configuration ownership |
| `/etc/systemd/system/gunicorn.*` | `root` | `root` | `0644` (rw-r--r--) | Systemd service definition ownership |
| `/run/startlnk.sock` | `safi` | `www-data` | `0660` (rw-rw----) | Gunicorn creates; Nginx reads/writes via www-data group |
| `/etc/letsencrypt/live/` | `root` | `root` | `0700` (rwx------) | Certbot private keys; managed by Certbot daemon |

---

## 4. Enforcement via `permissions.sh`

The deployment framework includes a dedicated permission enforcement script (`deployment/scripts/permissions.sh`) executed at the end of every deploy and update cycle to ensure permissions never drift:

```bash
# Core ownership reset
chown -R ${DEPLOY_USER}:${DEPLOY_GROUP} ${DEPLOY_ROOT}

# Directory & file default permissions
find ${DEPLOY_ROOT} -type d -exec chmod 755 {} +
find ${DEPLOY_ROOT} -type f -exec chmod 644 {} +

# Secure secrets
chmod 600 ${DEPLOY_ROOT}/deployment/config
find ${DEPLOY_ROOT}/releases -name ".env" -exec chmod 640 {} +

# Enable media & log write access for www-data
chmod -R 775 ${DEPLOY_ROOT}/shared/media
chmod -R 775 ${DEPLOY_ROOT}/shared/logs

# Lock down backup directory
chmod -R 700 ${DEPLOY_ROOT}/shared/backups
chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${DEPLOY_ROOT}/shared/backups
```
