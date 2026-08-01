#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — APT Package Management Helper Library
# ══════════════════════════════════════════════════════════════════════════════
#  Provides clean wrappers for Debian/Ubuntu package management (dpkg/apt).
# ══════════════════════════════════════════════════════════════════════════════

if [[ -n "${_STARTLNK_LIB_PACKAGES_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_PACKAGES_LOADED=1

# Function: pkg_is_installed
# Purpose: Checks if an APT package is installed
pkg_is_installed() {
    local pkg="$1"
    dpkg -s "${pkg}" 2>/dev/null | grep -q "Status: install ok installed"
}

# Function: pkg_update
# Purpose: Runs apt-get update in non-interactive mode
pkg_update() {
    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m DEBIAN_FRONTEND=noninteractive apt-get update -qq"
        return 0
    fi

    if declare -f log_info >/dev/null; then
        log_info "Updating APT package index..."
    fi
    DEBIAN_FRONTEND=noninteractive apt-get update -qq
}

# Function: pkg_install
# Purpose: Installs list of APT packages in non-interactive mode
pkg_install() {
    local pkgs=("$@")
    if [[ ${#pkgs[@]} -eq 0 ]]; then
        return 0
    fi

    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ${pkgs[*]}"
        return 0
    fi

    if declare -f log_info >/dev/null; then
        log_info "Installing packages: ${pkgs[*]}"
    fi
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${pkgs[@]}"
}

# Function: pkg_ensure
# Purpose: Installs packages ONLY if they are not already installed
pkg_ensure() {
    local missing=()
    for pkg in "$@"; do
        if ! pkg_is_installed "${pkg}"; then
            missing+=("${pkg}")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        pkg_update
        pkg_install "${missing[@]}"
    else
        if declare -f log_info >/dev/null; then
            log_info "All required packages are already installed: $*"
        fi
    fi
    return 0
}
