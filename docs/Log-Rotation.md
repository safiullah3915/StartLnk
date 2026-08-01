# StartLnk — Log Rotation Specification & Documentation

## Overview
Application logs (`django.log`) and web server logs (`startlnk_access.log`, `startlnk_error.log`) grow continuously in production. Without structured log rotation, disk space on a 20–50 GB VPS could be exhausted over time.

The deployment framework manages log retention via Linux `logrotate` using the template `deployment/templates/logrotate.conf.template`.

---

## Log Rotation Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Installation Path** | `/etc/logrotate.d/${APP_NAME}` | System logrotate directory monitored daily by cron (`/etc/cron.daily/logrotate`) |
| **Owner & Group** | `root:root` | Standard system owner for logrotate definitions |
| **File Permissions** | `0644` (`rw-r--r--`) | Readable by root and system logrotate daemon |
| **Rotation Frequency** | `daily` | Logs are evaluated and rotated once every 24 hours |
| **Retention Policy** | `14` (`rotate 14`) | Retains 14 compressed historical logs (14 days of log history) |
| **Compression** | `compress` + `delaycompress` | Gzip compresses rotated logs (`.1.gz`), delaying compression by one cycle to prevent lock contention |
| **Empty Logs** | `notifempty` | Does not rotate log files if they are empty |
| **Missing Files** | `missingok` | Ignores missing log files without throwing system errors |

---

## Targeted Log Streams

### 1. Application Logs (`${DEPLOY_ROOT}/shared/logs/*.log`)
- **Location**: `${DEPLOY_ROOT}/shared/logs/django.log`
- **Created Mode**: `0664` (`rw-rw-r--`)
- **Owner:Group**: `DEPLOY_USER:DEPLOY_GROUP` (`safi:www-data`)
- **Post-Rotate Hook**: Issues `systemctl reload startlnk.service` to instruct Gunicorn workers to reopen log file descriptors gracefully.

### 2. Nginx Web Server Logs (`/var/log/nginx/${APP_NAME}_*.log`)
- **Location**: `/var/log/nginx/startlnk_access.log`, `/var/log/nginx/startlnk_error.log`
- **Created Mode**: `0640` (`rw-r-----`)
- **Owner:Group**: `www-data:adm`
- **Post-Rotate Hook**: Issues `systemctl reload nginx` to re-open Nginx log file descriptors without dropping active HTTPS connections.

---

## Installation Method

During `install.sh` / `deploy.sh`, the template is rendered into the active system logrotate location:

```bash
render_template "deployment/templates/logrotate.conf.template" "/etc/logrotate.d/${APP_NAME}"
chown root:root "/etc/logrotate.d/${APP_NAME}"
chmod 0644 "/etc/logrotate.d/${APP_NAME}"
```

## Manual Testing & Verification

To verify logrotate syntax and run a dry-run execution:

```bash
# Test logrotate configuration syntax
sudo logrotate -d /etc/logrotate.d/startlnk

# Force immediate log rotation test
sudo logrotate -f /etc/logrotate.d/startlnk
```
