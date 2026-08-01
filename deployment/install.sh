#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — Production System Dependencies Installer
# ══════════════════════════════════════════════════════════════════════════════
#  Prepares a fresh Ubuntu VPS (22.04 / 24.04) by installing all required
#  system packages, Python runtimes, Node.js, database servers, web servers,
#  and security tooling.
#
#  NOTE: This installer ONLY prepares system dependencies.
#  It DOES NOT deploy code, configure databases, or build the application.
# ══════════════════════════════════════════════════════════════════════════════

set -Eeuo pipefail

# Determine framework root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source shared library modules
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/logging.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/config.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/validation.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/packages.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/permissions.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/services.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/helpers.sh"

# Script Metadata
FRAMEWORK_VERSION="2.0.0"
SCRIPT_NAME="install.sh"
SCRIPT_DESC="Prepares fresh Ubuntu VPS system dependencies for StartLnk"
SCRIPT_USAGE="sudo bash deployment/install.sh [--dry-run] [--help]"

# Parse common arguments (--help, --dry-run)
parse_common_args "${SCRIPT_NAME}" "${SCRIPT_DESC}" "${SCRIPT_USAGE}" "$@"

# Log File Setup
LOG_FILE="/var/log/startlnk_install.log"
if [[ ! -w "/var/log" ]]; then
    LOG_FILE="/tmp/startlnk_install.log"
fi

# Track execution statistics
INSTALLED_PKGS=()
SKIPPED_PKGS=()
WARNINGS=()
ERRORS=()

# Gather System Information
SYSTEM_USER="$(whoami 2>/dev/null || echo "${USER:-unknown}")"
ARCH="$(uname -m 2>/dev/null || echo "unknown")"
UBUNTU_VER="Unknown"
if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    source /etc/os-release
    UBUNTU_VER="${VERSION_ID:-${PRETTY_NAME:-Ubuntu}}"
fi

# Print System Banner
log_header "StartLnk Deployment Framework — System Installer v${FRAMEWORK_VERSION}"
log_info "Framework Version : ${FRAMEWORK_VERSION}"
log_info "Execution Date    : $(generate_timestamp)"
log_info "Operating System  : Ubuntu ${UBUNTU_VER}"
log_info "Architecture      : ${ARCH}"
log_info "Detected User     : ${SYSTEM_USER}"
log_info "Log File Location : ${LOG_FILE}"
echo ""

# Pre-flight Privilege & OS Verification
log_info "Performing pre-flight system checks..."
if ! check_root; then
    ERRORS+=("Privilege Check: Root/sudo required to install system packages.")
    log_error "Installer must be run as root or with sudo privileges."
    exit 1
fi

if ! check_ubuntu; then
    WARNINGS+=("OS Verification: System is not explicitly recognized as Ubuntu 22.04/24.04.")
fi

# Load Master Configuration (if config exists)
CONFIG_FILE="${PROJECT_ROOT}/deployment/config"
if [[ -f "${CONFIG_FILE}" ]]; then
    log_info "Loading master deployment config: ${CONFIG_FILE}"
    load_config "${CONFIG_FILE}" || true
else
    log_warn "Master config '${CONFIG_FILE}' not found. Using system defaults for installation phase."
fi

# Define Mandatory System Packages
REQUIRED_PACKAGES=(
    "git"
    "python3"
    "python3-pip"
    "python3-venv"
    "python3-dev"
    "build-essential"
    "postgresql"
    "postgresql-contrib"
    "redis-server"
    "nodejs"
    "npm"
    "nginx"
    "certbot"
    "python3-certbot-nginx"
    "curl"
    "unzip"
    "tree"
    "ufw"
)

log_header "Evaluating & Installing System Package Dependencies"

# Evaluate packages to separate installed vs missing
TO_INSTALL=()
for pkg in "${REQUIRED_PACKAGES[@]}"; do
    if pkg_is_installed "${pkg}"; then
        SKIPPED_PKGS+=("${pkg}")
        log_info "  [SKIPPED] Package already installed: ${pkg}"
    else
        TO_INSTALL+=("${pkg}")
    fi
done

# Install missing packages
if [[ ${#TO_INSTALL[@]} -gt 0 ]]; then
    log_info "Installing missing packages: ${TO_INSTALL[*]}"
    pkg_update
    for pkg in "${TO_INSTALL[@]}"; do
        if pkg_install "${pkg}"; then
            INSTALLED_PKGS+=("${pkg}")
            log_success "  [INSTALLED] Successfully installed package: ${pkg}"
        else
            ERRORS+=("Package Installation Failed: ${pkg}")
            log_error "Failed to install package: ${pkg}"
        fi
    done
else
    log_success "All mandatory system packages are already installed."
fi

# System Dependency Validation Checks
log_header "Validating Core Binary & Service Binaries"

VALIDATION_COMMANDS=(
    "git"
    "python3"
    "pip3"
    "node"
    "npm"
    "psql"
    "redis-cli"
    "nginx"
    "certbot"
    "ufw"
)

for cmd in "${VALIDATION_COMMANDS[@]}"; do
    if check_command "${cmd}"; then
        log_success "  ✓ Binary verified in PATH: ${cmd}"
    else
        WARNINGS+=("Binary Check: Command '${cmd}' not found in system PATH.")
    fi
done

# Ensure System Deploy User & Group
TARGET_USER="${DEPLOY_USER:-safi}"
TARGET_GROUP="${DEPLOY_GROUP:-www-data}"
log_info "Ensuring system deployment user '${TARGET_USER}' belongs to group '${TARGET_GROUP}'..."
ensure_user "${TARGET_USER}" "${TARGET_GROUP}"

# Installation Summary Report
log_header "Installer Execution Summary Report"

log_info "Installed Packages (${#INSTALLED_PKGS[@]}):"
if [[ ${#INSTALLED_PKGS[@]} -gt 0 ]]; then
    for pkg in "${INSTALLED_PKGS[@]}"; do
        echo -e "  - ${pkg}"
    done
else
    echo "  (None - system was already up to date)"
fi

echo ""
log_info "Skipped / Pre-existing Packages (${#SKIPPED_PKGS[@]}):"
if [[ ${#SKIPPED_PKGS[@]} -gt 0 ]]; then
    for pkg in "${SKIPPED_PKGS[@]}"; do
        echo -e "  - ${pkg}"
    done
fi

echo ""
log_info "Warnings (${#WARNINGS[@]}):"
if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    for warn in "${WARNINGS[@]}"; do
        log_warn "${warn}"
    done
else
    echo "  (None)"
fi

echo ""
log_info "Errors (${#ERRORS[@]}):"
if [[ ${#ERRORS[@]} -gt 0 ]]; then
    for err in "${ERRORS[@]}"; do
        log_error "${err}"
    done
else
    echo "  (None)"
fi

echo ""
log_info "Log File Location: ${LOG_FILE}"

if [[ ${#ERRORS[@]} -gt 0 ]]; then
    log_error "Installer completed with errors. Please check the log file."
    exit 1
else
    log_success "System dependencies installation completed successfully."
    log_info "Next Step: Proceed to application deployment (Phase 4)."
fi
