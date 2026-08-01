# StartLnk — Production Directory Structure & Release Architecture

## Overview
To achieve zero-downtime deployments, atomic rollbacks, and isolation of transient code from persistent user data, StartLnk uses a release-based directory hierarchy on the production VPS.

```
/home/safi/startlnk/                        ← DEPLOY_ROOT
├── releases/
│   ├── 20260801-143022/                     ← Release timestamp directory
│   │   ├── backend/
│   │   │   ├── api/
│   │   │   ├── startup_platform/
│   │   │   ├── manage.py
│   │   │   ├── requirements.txt
│   │   │   ├── venv/                        ← Isolated Python virtual environment
│   │   │   ├── staticfiles/                 ← Release static assets (collectstatic)
│   │   │   └── .env                         ← Auto-generated from deployment/config
│   │   ├── frontend/
│   │   │   ├── src/
│   │   │   ├── dist/                        ← Production SPA build (npm run build)
│   │   │   ├── node_modules/
│   │   │   ├── .env.production              ← Auto-generated from deployment/config
│   │   │   └── package.json
│   │   └── DEPLOY_INFO                      # Deployment stamp metadata
│   │
│   ├── 20260730-091500/                     ← Previous release
│   └── 20260728-180045/                     ← Older release
│
├── current -> releases/20260801-143022/     ← SYMLINK to active release
│
├── shared/                                  ← Persistent data surviving releases
│   ├── media/                               ← User uploads (profiles/, uploads/)
│   ├── logs/                                ← Persistent application logs (django.log)
│   └── backups/                             ← Automated backup archives
│       ├── database/
│       ├── media/
│       ├── config/
│       └── pre-deploy/
│
└── deployment/                              ← Deployment Framework
    ├── config                               # SINGLE SOURCE OF TRUTH (Operator edited)
    ├── config.example                       # Master config template
    ├── project.yml                          # Project manifest
    ├── templates/                           # Nginx, Systemd, Env templates
    └── scripts/                             # Framework automation scripts
```

## Directory Purpose Definitions

### 1. `releases/`
- **Purpose**: Stores immutable timestamped release directories (`YYYYMMDD-HHMMSS`).
- **Characteristics**: Each release contains a fresh git clone, its own isolated Python `venv`, its own `dist/` production frontend build, and its own `staticfiles/` collection.
- **Lifecycle**: Managed by `deploy.sh` and `update.sh`. Up to `KEEP_RELEASES` (default: 5) historical releases are retained. Older releases are automatically pruned.

### 2. `current` (Symlink)
- **Purpose**: An atomic symbolic link pointing to the active release directory (`releases/YYYYMMDD-HHMMSS/`).
- **Characteristics**: Systemd service units and Nginx configuration files point exclusively to `current`.
- **Atomic Cutover**: When `deploy.sh` finishes building a release, or when `rollback.sh` is invoked, changing this single symlink instantly switches the running code in ~5 seconds.

### 3. `shared/`
- **Purpose**: Contains data that MUST persist across multiple releases.
- **Components**:
  - `shared/media/`: User profile images, uploaded resumes, startup pitch attachments. Each release symlinks `backend/media` → `shared/media`.
  - `shared/logs/`: Persistent log files (`django.log`). Symlinked from `backend/logs`.
  - `shared/backups/`: Independent backup storage split into `database/`, `media/`, `config/`, and `pre-deploy/`.

### 4. `deployment/`
- **Purpose**: Framework controller directory containing version-controlled templates, operational scripts, and project manifests.
- **Key Asset**: `deployment/config` (gitignored master configuration) resides here.

## Data Persistence & Symlink Map

```
Release Path                                    Target Path
-----------------------------------------       ------------------------------------
{{DEPLOY_ROOT}}/current                     →   {{DEPLOY_ROOT}}/releases/20260801-143022
{{DEPLOY_ROOT}}/current/backend/media       →   {{DEPLOY_ROOT}}/shared/media
{{DEPLOY_ROOT}}/current/backend/logs        →   {{DEPLOY_ROOT}}/shared/logs
```
