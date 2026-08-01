#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — Pre-flight Validation Library
# ══════════════════════════════════════════════════════════════════════════════
#  Provides assertion functions for system requirements, user privileges, OS version,
#  commands, services, directories, and files.
# ══════════════════════════════════════════════════════════════════════════════

if [[ -n "${_STARTLNK_LIB_VALIDATION_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_VALIDATION_LOADED=1

# Function: check_root
# Purpose: Ensures script is running as root or via sudo
check_root() {
    if [[ "${EUID}" -ne 0 ]]; then
        if declare -f log_error >/dev/null; then
            log_error "This operation requires root or sudo privileges."
        else
            echo "[ERROR] This operation requires root or sudo privileges." >&2
        fi
        return 1
    fi
    return 0
}

# Function: check_ubuntu
# Purpose: Verifies target OS is supported Ubuntu version (22.04 or 24.04)
check_ubuntu() {
    if [[ ! -f /etc/os-release ]]; then
        if declare -f log_error >/dev/null; then
            log_error "Cannot determine OS version (/etc/os-release missing)."
        fi
        return 1
    fi

    # shellcheck disable=SC1091
    source /etc/os-release

    if [[ "${ID:-}" != "ubuntu" ]]; then
        if declare -f log_error >/dev/null; then
            log_error "Unsupported OS: ${NAME:-Linux}. StartLnk requires Ubuntu Linux."
        fi
        return 1
    fi

    local version_id="${VERSION_ID:-}"
    if [[ "${version_id}" != "22.04" && "${version_id}" != "24.04" ]]; then
        if declare -f log_warn >/dev/null; then
            log_warn "Target OS version Ubuntu ${version_id} is not explicitly verified (supported: 22.04, 24.04)."
        fi
    fi

    return 0
}

# Function: check_command
# Purpose: Verifies a command/binary exists in PATH
check_command() {
    local cmd="$1"
    if ! command -v "${cmd}" >/dev/null 2>&1; then
        if declare -f log_error >/dev/null; then
            log_error "Required command not found in PATH: ${cmd}"
        fi
        return 1
    fi
    return 0
}

# Function: check_service
# Purpose: Checks if a systemd service is active (running)
check_service() {
    local service="$1"
    if ! systemctl is-active --quiet "${service}"; then
        if declare -f log_warn >/dev/null; then
            log_warn "Systemd service '${service}' is not active."
        fi
        return 1
    fi
    return 0
}

# Function: check_directory
# Purpose: Checks if a directory exists
check_directory() {
    local dir="$1"
    if [[ ! -d "${dir}" ]]; then
        if declare -f log_error >/dev/null; then
            log_error "Directory does not exist: ${dir}"
        fi
        return 1
    fi
    return 0
}

# Function: check_file
# Purpose: Checks if a file exists
check_file() {
    local file="$1"
    if [[ ! -f "${file}" ]]; then
        if declare -f log_error >/dev/null; then
            log_error "File does not exist: ${file}"
        fi
        return 1
    fi
    return 0
}
