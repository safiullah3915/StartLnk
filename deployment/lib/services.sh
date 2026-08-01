#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — Systemd Service Management Library
# ══════════════════════════════════════════════════════════════════════════════
#  Provides helper functions for systemd daemon reloads, unit lifecycle management,
#  and service health checks.
# ══════════════════════════════════════════════════════════════════════════════

if [[ -n "${_STARTLNK_LIB_SERVICES_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_SERVICES_LOADED=1

# Function: systemd_reload
# Purpose: Issues systemctl daemon-reload
systemd_reload() {
    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m systemctl daemon-reload"
        return 0
    fi
    systemctl daemon-reload
}

# Function: service_is_active
# Purpose: Returns 0 if service is active/running, 1 otherwise
service_is_active() {
    local service="$1"
    systemctl is-active --quiet "${service}"
}

# Function: service_start
# Purpose: Starts systemd service
service_start() {
    local service="$1"
    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m systemctl start ${service}"
        return 0
    fi
    systemctl start "${service}"
}

# Function: service_stop
# Purpose: Stops systemd service
service_stop() {
    local service="$1"
    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m systemctl stop ${service}"
        return 0
    fi
    systemctl stop "${service}"
}

# Function: service_restart
# Purpose: Restarts systemd service
service_restart() {
    local service="$1"
    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m systemctl restart ${service}"
        return 0
    fi
    systemctl restart "${service}"
}

# Function: service_reload
# Purpose: Reloads systemd service configuration gracefully
service_reload() {
    local service="$1"
    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m systemctl reload ${service}"
        return 0
    fi
    systemctl reload "${service}"
}

# Function: service_enable
# Purpose: Enables systemd service to start at boot
service_enable() {
    local service="$1"
    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m systemctl enable ${service}"
        return 0
    fi
    systemctl enable "${service}"
}
