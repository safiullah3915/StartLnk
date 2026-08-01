# StartLnk Deployment Framework

This directory contains the production-grade deployment framework for StartLnk.
It enables zero-downtime release deployments, single-source-of-truth configuration, independent backups, and automated disaster recovery on any fresh Ubuntu VPS.

## Framework Directory Structure

```
deployment/
├── config.example          # Master deployment configuration template (Single Source of Truth)
├── project.yml             # Declarative project manifest & version requirements
├── scripts/                # Execution scripts (install.sh, deploy.sh, rollback.sh, etc.)
│   └── lib/                # Shared shell libraries (logging, config loading, checks)
├── templates/              # Configuration templates (Nginx, Systemd, Env files)
└── README.md               # This document
```

## Core Deployment Workflows

### 1. Initial VPS Setup
On a fresh Ubuntu VPS (22.04 or 24.04):
```bash
cp deployment/config.example deployment/config
# Edit deployment/config with real secrets, domain, and server identity
bash deployment/scripts/install.sh
```

### 2. Primary Release Deployment
```bash
bash deployment/scripts/deploy.sh
```

### 3. SSL Setup (after DNS propagation)
```bash
bash deployment/scripts/ssl.sh
```

### 4. Updating Application Code
```bash
bash deployment/scripts/update.sh
```

### 5. Instant Rollback (~5s switch)
```bash
bash deployment/scripts/rollback.sh
```

### 6. Checking System Version & Status
```bash
bash deployment/scripts/version.sh
bash deployment/scripts/verify.sh
```

## Migration & Safety Guarantee
- **Additive Migration Only**: No legacy files are deleted during initial framework rollout.
- **Master Config**: `deployment/config` is gitignored and contains server-specific secrets.
- **Release Isolation**: Application versions live under `releases/YYYYMMDD-HHMMSS/` with active state controlled via a `current` symlink.
