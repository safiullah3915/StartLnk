#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — PostgreSQL Database Bootstrap Helper
# ══════════════════════════════════════════════════════════════════════════════
#  Idempotently provisions PostgreSQL database user, database, and grants
#  access privileges based on master configuration in deployment/config.
# ══════════════════════════════════════════════════════════════════════════════

set -Eeuo pipefail

# Determine framework paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source shared framework library modules
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
FRAMEWORK_VERSION="2.1.0"
SCRIPT_NAME="postgres.sh"
SCRIPT_DESC="Provisions PostgreSQL database user and database schema idempotently"
SCRIPT_USAGE="sudo bash deployment/postgres.sh [--dry-run] [--help]"

# Parse common arguments (--help, --dry-run)
parse_common_args "${SCRIPT_NAME}" "${SCRIPT_DESC}" "${SCRIPT_USAGE}" "$@"

# Load & Validate Configuration
CONFIG_FILE="${PROJECT_ROOT}/deployment/config"
log_header "StartLnk PostgreSQL Database Bootstrapper v${FRAMEWORK_VERSION}"

if [[ ! -f "${CONFIG_FILE}" ]]; then
    log_error "Master configuration file not found at: ${CONFIG_FILE}"
    log_error "Please copy deployment/config.example to ${CONFIG_FILE} and fill in all variables."
    exit 1
fi

log_info "Loading master deployment configuration from ${CONFIG_FILE}..."
load_config "${CONFIG_FILE}"
check_root

# Ensure PostgreSQL service is active
log_info "Verifying PostgreSQL system service status..."
pkg_ensure "postgresql" "postgresql-contrib"

if ! service_is_active "postgresql"; then
    log_info "Starting PostgreSQL service..."
    service_start "postgresql"
fi

# Function: user_exists
user_exists() {
    sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null | grep -q 1
}

# Function: db_exists
db_exists() {
    sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | grep -q 1
}

# Step 1: Idempotently Create or Update Database User
log_header "Step 1/3: Provisioning Database User '${DB_USER}'"

if is_dry_run; then
    echo -e "\033[0;33m[DRY-RUN]\033[0m Ensure PostgreSQL user '${DB_USER}' exists with specified password"
else
    if user_exists; then
        log_info "Database user '${DB_USER}' already exists. Updating password..."
        sudo -u postgres psql -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD}';" >/dev/null
        log_success "  ✓ Database user '${DB_USER}' password updated."
    else
        log_info "Creating PostgreSQL user '${DB_USER}'..."
        sudo -u postgres psql -c "CREATE USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD}';" >/dev/null
        log_success "  ✓ PostgreSQL user '${DB_USER}' created."
    fi
fi

# Step 2: Idempotently Create Database
log_header "Step 2/3: Provisioning Database '${DB_NAME}'"

if is_dry_run; then
    echo -e "\033[0;33m[DRY-RUN]\033[0m Ensure PostgreSQL database '${DB_NAME}' exists owned by '${DB_USER}'"
else
    if db_exists; then
        log_info "Database '${DB_NAME}' already exists."
    else
        log_info "Creating PostgreSQL database '${DB_NAME}' owned by '${DB_USER}'..."
        sudo -u postgres psql -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\" ENCODING 'UTF8';" >/dev/null
        log_success "  ✓ Database '${DB_NAME}' created."
    fi

    log_info "Granting privileges on database '${DB_NAME}' to user '${DB_USER}'..."
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"${DB_NAME}\" TO \"${DB_USER}\";" >/dev/null
    sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO \"${DB_USER}\";" >/dev/null 2>&1 || true
    log_success "  ✓ Privileges granted to '${DB_USER}'."
fi

# Step 3: Verify Connection & Privileges
log_header "Step 3/3: Verifying PostgreSQL Connectivity"

if is_dry_run; then
    echo -e "\033[0;33m[DRY-RUN]\033[0m Test connection to database '${DB_NAME}' as user '${DB_USER}'"
else
    log_info "Testing database query as user '${DB_USER}'..."
    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "  ✓ Direct TCP connection to database '${DB_NAME}' verified."
    elif sudo -u postgres psql -d "${DB_NAME}" -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "  ✓ Local socket connection to database '${DB_NAME}' verified."
    else
        log_error "Failed to connect to database '${DB_NAME}' with user '${DB_USER}'."
        exit 1
    fi
fi

log_header "PostgreSQL Bootstrap Summary"
log_success "Database '${DB_NAME}' and user '${DB_USER}' are fully provisioned and ready."
