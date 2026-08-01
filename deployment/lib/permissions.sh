#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — File Ownership & Permission Library
# ══════════════════════════════════════════════════════════════════════════════
#  Provides functions to manage user/group creation, directory security,
#  and file permission matrices.
# ══════════════════════════════════════════════════════════════════════════════

if [[ -n "${_STARTLNK_LIB_PERMISSIONS_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_PERMISSIONS_LOADED=1

# Function: ensure_user
# Purpose: Creates system deployment user and adds user to web group
ensure_user() {
    local username="${1:-safi}"
    local groupname="${2:-www-data}"

    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m Ensure user '${username}' exists and belongs to group '${groupname}'"
        return 0
    fi

    if ! id -u "${username}" >/dev/null 2>&1; then
        if declare -f log_info >/dev/null; then
            log_info "Creating deployment user: ${username}"
        fi
        useradd -m -s /bin/bash "${username}"
    fi

    if getent group "${groupname}" >/dev/null 2>&1; then
        usermod -aG "${groupname}" "${username}"
    fi

    return 0
}

# Function: set_permissions
# Purpose: Sets owner, group, and mode permissions on target path
set_permissions() {
    local target="$1"
    local owner="${2:-safi}"
    local group="${3:-www-data}"
    local mode="${4:-0755}"

    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m chown ${owner}:${group} ${target} && chmod ${mode} ${target}"
        return 0
    fi

    if [[ -e "${target}" ]]; then
        chown "${owner}:${group}" "${target}"
        chmod "${mode}" "${target}"
    fi
    return 0
}

# Function: ensure_directory
# Purpose: Creates directory if missing, setting owner, group, and permissions
ensure_directory() {
    local dir="$1"
    local owner="${2:-safi}"
    local group="${3:-www-data}"
    local mode="${4:-0755}"

    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m mkdir -p ${dir} && chown ${owner}:${group} ${dir} && chmod ${mode} ${dir}"
        return 0
    fi

    if [[ ! -d "${dir}" ]]; then
        mkdir -p "${dir}"
    fi
    set_permissions "${dir}" "${owner}" "${group}" "${mode}"
}

# Function: secure_secret_file
# Purpose: Sets mode 600 or 640 on sensitive configuration files
secure_secret_file() {
    local file="$1"
    local owner="${2:-safi}"
    local group="${3:-safi}"
    local mode="${4:-0600}"

    if [[ -f "${file}" ]]; then
        set_permissions "${file}" "${owner}" "${group}" "${mode}"
    fi
}
