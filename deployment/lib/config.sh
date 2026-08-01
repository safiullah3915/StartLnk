#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — Configuration Loader & Resolver Library
# ══════════════════════════════════════════════════════════════════════════════
#  Loads deployment/config, validates required variables, and resolves derived paths.
# ══════════════════════════════════════════════════════════════════════════════

if [[ -n "${_STARTLNK_LIB_CONFIG_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_CONFIG_LOADED=1

# Function: load_config
# Purpose: Sources the master deployment config file and exports derived variables
load_config() {
    local config_file="${1:-deployment/config}"

    if [[ ! -f "${config_file}" ]]; then
        if declare -f log_error >/dev/null; then
            log_error "Configuration file not found: ${config_file}"
            log_error "Please copy deployment/config.example to ${config_file} and fill in all variables."
        else
            echo "[ERROR] Configuration file not found: ${config_file}" >&2
        fi
        return 1
    fi

    # Source the config file safely
    # shellcheck disable=SC1090
    source "${config_file}"

    # Export derived paths based on DEPLOY_ROOT
    DEPLOY_ROOT="${DEPLOY_ROOT:-/home/${DEPLOY_USER:-safi}/${APP_NAME:-startlnk}}"
    RELEASES_DIR="${DEPLOY_ROOT}/releases"
    SHARED_DIR="${DEPLOY_ROOT}/shared"
    CURRENT_SYM_DIR="${DEPLOY_ROOT}/current"
    SOCKET_PATH="${SOCKET_PATH:-/run/${APP_NAME:-startlnk}.sock}"

    # Resolve GUNICORN_WORKERS if "auto" or non-numeric
    if [[ -z "${GUNICORN_WORKERS:-}" || "${GUNICORN_WORKERS:-}" == "auto" || ! "${GUNICORN_WORKERS}" =~ ^[0-9]+$ ]]; then
        local cores
        cores=$(nproc 2>/dev/null || echo 1)
        GUNICORN_WORKERS=$((cores * 2 + 1))
    fi

    export DEPLOY_ROOT RELEASES_DIR SHARED_DIR CURRENT_SYM_DIR SOCKET_PATH GUNICORN_WORKERS
    return 0
}

# Function: validate_config
# Purpose: Ensures all mandatory variables are present in the config
validate_config() {
    local missing_vars=()
    local required_vars=(
        "APP_NAME"
        "DOMAIN"
        "DEPLOY_USER"
        "DEPLOY_GROUP"
        "DEPLOY_ROOT"
        "SECRET_KEY"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("${var}")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        if declare -f log_error >/dev/null; then
            log_error "Missing required configuration variables: ${missing_vars[*]}"
        else
            echo "[ERROR] Missing required configuration variables: ${missing_vars[*]}" >&2
        fi
        return 1
    fi

    return 0
}
