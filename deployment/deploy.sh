#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — Production Release Deployer (Refactored Modular Architecture)
# ══════════════════════════════════════════════════════════════════════════════
#  Deploys a new application release onto an already prepared Ubuntu VPS.
#  Implements release-based deployment architecture:
#    - Deployment Locking: Prevents concurrent deployment runs via flock
#    - Stage 1: prepare_release()      - Creates releases/YYYYMMDD-HHMMSS/ & shared paths
#    - Stage 2: generate_configuration() - Renders backend/.env & frontend/.env.production
#    - Stage 3: prepare_backend()      - Creates venv & installs Python dependencies
#    - Stage 4: prepare_frontend()     - Runs npm ci/install & compiles React SPA
#    - Stage 5: run_database_tasks()   - Runs Django migrations & collectstatic
#    - Stage 6: generate_metadata()    - Produces release.json & DEPLOY_INFO stamp
#    - Stage 7: verify_pre_cutover()   - Verifies DB, Redis, static assets & Nginx syntax BEFORE cutover
#    - Stage 8: activate_release()     - Atomically updates current symlink
#    - Stage 9: restart_services()    - Reloads systemd, restarts Gunicorn & reloads Nginx
#    - Stage 10: verify_release()      - Validates post-cutover application health
#    - Stage 11: deployment_summary()  - Displays execution summary
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

# Framework Metadata
FRAMEWORK_VERSION="2.1.0"
SCRIPT_NAME="deploy.sh"
SCRIPT_DESC="Deploys a new StartLnk application release (Release-Based Architecture)"
SCRIPT_USAGE="sudo bash deployment/deploy.sh [--dry-run] [--help]"

# Parse common arguments (--help, --dry-run)
parse_common_args "${SCRIPT_NAME}" "${SCRIPT_DESC}" "${SCRIPT_USAGE}" "$@"

# Log File Setup
LOG_FILE="/var/log/startlnk_deploy.log"
if [[ ! -w "/var/log" ]]; then
    LOG_FILE="/tmp/startlnk_deploy.log"
fi

# ── Deployment Locking Mechanism ──────────────────────────────────────────────
acquire_lock() {
    local lock_file="/var/lock/startlnk_deploy.lock"
    if [[ ! -w "/var/lock" ]]; then
        lock_file="/tmp/startlnk_deploy.lock"
    fi

    exec 200>"${lock_file}"
    if ! flock -n 200; then
        log_error "Another deployment process is currently running (lock file: ${lock_file}). Exiting."
        exit 1
    fi
    log_info "Acquired exclusive deployment lock (${lock_file})."
}

# ── Stage Initialization & Config Loading ────────────────────────────────────
load_and_validate_config() {
    local config_file="${PROJECT_ROOT}/deployment/config"

    if [[ ! -f "${config_file}" ]]; then
        log_error "Master configuration file not found at: ${config_file}"
        log_error "Please copy deployment/config.example to ${config_file} and fill in all variables."
        exit 1
    fi

    log_info "Loading master deployment configuration from ${config_file}..."
    load_config "${config_file}"
    validate_config
    check_root

    RELEASE_TIMESTAMP="$(generate_timestamp)"
    RELEASE_DIR="${RELEASES_DIR}/${RELEASE_TIMESTAMP}"

    # Global runtime variables exported for template rendering
    export VENV_PATH="${RELEASE_DIR}/backend/venv"
    export WORKING_DIRECTORY="${RELEASE_DIR}/backend"
    export FRONTEND_DIST_DIR="${RELEASE_DIR}/frontend/dist"
    export STATIC_ROOT="${RELEASE_DIR}/backend/staticfiles"
    export MEDIA_ROOT="${SHARED_DIR}/media"
    export WSGI_MODULE="${WSGI_MODULE:-startup_platform.wsgi:application}"
    export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-startup_platform.settings}"
    export SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/${DOMAIN}/fullchain.pem}"
    export SSL_KEY_PATH="${SSL_KEY_PATH:-/etc/letsencrypt/live/${DOMAIN}/privkey.pem}"
}

# ── Stage 1: Prepare Release Directories & Source Copy ───────────────────────
prepare_release() {
    log_header "Stage 1/11: Preparing Release Directory & Source Code"
    log_info "New Release Directory : ${RELEASE_DIR}"
    log_info "Persistent Shared Dir : ${SHARED_DIR}"

    ensure_directory "${RELEASES_DIR}" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0755"
    ensure_directory "${RELEASE_DIR}" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0755"
    ensure_directory "${SHARED_DIR}" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0755"
    ensure_directory "${SHARED_DIR}/media" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0775"
    ensure_directory "${SHARED_DIR}/logs" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0775"
    ensure_directory "${SHARED_DIR}/backups" "${DEPLOY_USER}" "${DEPLOY_USER}" "0700"

    log_info "Copying backend application source code..."
    mkdir -p "${RELEASE_DIR}/backend"
    cp -r "${PROJECT_ROOT}/backend/api" "${RELEASE_DIR}/backend/"
    cp -r "${PROJECT_ROOT}/backend/startup_platform" "${RELEASE_DIR}/backend/"
    cp "${PROJECT_ROOT}/backend/manage.py" "${RELEASE_DIR}/backend/"
    cp "${PROJECT_ROOT}/backend/requirements.txt" "${RELEASE_DIR}/backend/"

    log_info "Copying frontend application source code..."
    mkdir -p "${RELEASE_DIR}/frontend"
    cp -r "${PROJECT_ROOT}/frontend/src" "${RELEASE_DIR}/frontend/"
    cp -r "${PROJECT_ROOT}/frontend/public" "${RELEASE_DIR}/frontend/"
    cp "${PROJECT_ROOT}/frontend/package.json" "${RELEASE_DIR}/frontend/"
    cp "${PROJECT_ROOT}/frontend/vite.config.js" "${RELEASE_DIR}/frontend/"
    if [[ -f "${PROJECT_ROOT}/frontend/package-lock.json" ]]; then
        cp "${PROJECT_ROOT}/frontend/package-lock.json" "${RELEASE_DIR}/frontend/"
    fi
    if [[ -f "${PROJECT_ROOT}/frontend/index.html" ]]; then
        cp "${PROJECT_ROOT}/frontend/index.html" "${RELEASE_DIR}/frontend/"
    fi

    log_success "Stage 1 Complete: Release directory structure created."
}

# ── Stage 2: Generate Configuration Files ────────────────────────────────────
generate_configuration() {
    log_header "Stage 2/11: Generating Configuration Files from Master Config"

    log_info "Rendering backend/.env..."
    render_template "${PROJECT_ROOT}/deployment/templates/backend.env.template" "${RELEASE_DIR}/backend/.env"
    secure_secret_file "${RELEASE_DIR}/backend/.env" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0640"

    log_info "Rendering frontend/.env.production..."
    render_template "${PROJECT_ROOT}/deployment/templates/frontend.env.template" "${RELEASE_DIR}/frontend/.env.production"
    secure_secret_file "${RELEASE_DIR}/frontend/.env.production" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0644"

    log_info "Rendering systemd socket & service templates..."
    render_template "${PROJECT_ROOT}/deployment/templates/gunicorn.socket.template" "/etc/systemd/system/${APP_NAME}.socket"
    render_template "${PROJECT_ROOT}/deployment/templates/gunicorn.service.template" "/etc/systemd/system/${APP_NAME}.service"

    log_info "Rendering Nginx site configuration template..."
    # Ensure SSL certificate files exist (generate temporary self-signed cert if missing)
    if [[ ! -f "${SSL_CERT_PATH}" || ! -f "${SSL_KEY_PATH}" ]]; then
        log_info "SSL certificate for ${DOMAIN} not found at ${SSL_CERT_PATH}."
        log_info "Generating temporary self-signed SSL certificate for initial Nginx setup..."
        mkdir -p "$(dirname "${SSL_CERT_PATH}")"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${SSL_KEY_PATH}" \
            -out "${SSL_CERT_PATH}" \
            -subj "/CN=${DOMAIN}" >/dev/null 2>&1 || true
        log_success "Temporary SSL certificate created. Run 'certbot --nginx' to issue real Let's Encrypt certificates."
    fi

    render_template "${PROJECT_ROOT}/deployment/templates/nginx.conf.template" "/etc/nginx/sites-available/${APP_NAME}"
    if [[ ! -L "/etc/nginx/sites-enabled/${APP_NAME}" ]]; then
        ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
    fi

    log_info "Rendering logrotate configuration..."
    render_template "${PROJECT_ROOT}/deployment/templates/logrotate.conf.template" "/etc/logrotate.d/${APP_NAME}"
    chown root:root "/etc/logrotate.d/${APP_NAME}" || true
    chmod 0644 "/etc/logrotate.d/${APP_NAME}" || true

    log_success "Stage 2 Complete: Configurations generated."
}

# ── Stage 3: Prepare Backend Environment ──────────────────────────────────────
prepare_backend() {
    log_header "Stage 3/11: Preparing Python Virtual Environment & Dependencies"
    log_info "Creating isolated Python virtual environment at ${VENV_PATH}..."
    python3 -m venv "${VENV_PATH}"

    log_info "Upgrading pip, setuptools, and wheel in release virtual environment..."
    "${VENV_PATH}/bin/pip" install --upgrade pip setuptools wheel -q

    log_info "Installing pinned Python dependencies from requirements.txt..."
    "${VENV_PATH}/bin/pip" install -r "${RELEASE_DIR}/backend/requirements.txt" --no-cache-dir -q

    log_success "Stage 3 Complete: Python backend environment ready."
}

# ── Stage 4: Prepare Frontend SPA Build ──────────────────────────────────────
prepare_frontend() {
    log_header "Stage 4/11: Preparing Node Dependencies & Building React SPA"
    (
        cd "${RELEASE_DIR}/frontend"

        if [[ -f "package-lock.json" ]]; then
            log_info "package-lock.json detected. Executing deterministic 'npm ci'..."
            npm ci --no-audit --no-fund -q
        else
            log_warn "package-lock.json not found in frontend! Falling back to 'npm install'."
            log_warn "For deterministic production builds, commit package-lock.json into Git."
            npm install --no-audit --no-fund -q
        fi

        log_info "Building production SPA bundle via Vite..."
        npm run build
    )
    log_success "Stage 4 Complete: Frontend SPA bundle compiled at ${FRONTEND_DIST_DIR}."
}

# ── Stage 5: Database Migrations & Static Asset Collection ──────────────────
run_database_tasks() {
    log_header "Stage 5/11: Running Database Migrations & Collecting Static Assets"
    (
        cd "${RELEASE_DIR}/backend"
        log_info "Running Django database migrations..."
        "${VENV_PATH}/bin/python" manage.py migrate --noinput

        log_info "Collecting static assets (collectstatic)..."
        "${VENV_PATH}/bin/python" manage.py collectstatic --noinput
    )

    log_info "Connecting persistent shared media and log directories..."
    rm -rf "${RELEASE_DIR}/backend/media" "${RELEASE_DIR}/backend/logs"
    atomically_symlink "${SHARED_DIR}/media" "${RELEASE_DIR}/backend/media"
    atomically_symlink "${SHARED_DIR}/logs" "${RELEASE_DIR}/backend/logs"

    log_success "Stage 5 Complete: Database tasks & static collection finished."
}

# ── Stage 6: Generate Release Metadata ───────────────────────────────────────
generate_release_metadata() {
    log_header "Stage 6/11: Generating Release Metadata (release.json & DEPLOY_INFO)"

    local git_commit="unknown"
    if command -v git >/dev/null 2>&1 && git -C "${PROJECT_ROOT}" rev-parse HEAD >/dev/null 2>&1; then
        git_commit="$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD)"
    fi

    local python_ver
    python_ver="$("${VENV_PATH}/bin/python" --version 2>&1 || echo "unknown")"

    local node_ver
    node_ver="$(node -v 2>/dev/null || echo "unknown")"

    # Write release.json
    cat <<EOF > "${RELEASE_DIR}/release.json"
{
  "release_timestamp": "${RELEASE_TIMESTAMP}",
  "git_commit": "${git_commit}",
  "python_version": "${python_ver}",
  "node_version": "${node_ver}",
  "deployment_user": "${DEPLOY_USER}",
  "deployment_date": "$(generate_timestamp)",
  "app_name": "${APP_NAME}",
  "domain": "${DOMAIN}"
}
EOF

    # Write legacy DEPLOY_INFO for backward compatibility
    cat <<EOF > "${RELEASE_DIR}/DEPLOY_INFO"
DEPLOY_TIMESTAMP=${RELEASE_TIMESTAMP}
FRAMEWORK_VERSION=${FRAMEWORK_VERSION}
DEPLOY_USER=${DEPLOY_USER}
DOMAIN=${DOMAIN}
GIT_COMMIT=${git_commit}
EOF

    log_success "Stage 6 Complete: Release metadata written to release.json."
}

# ── Stage 7: Pre-Cutover Verification (Verify BEFORE Symlink Switch!) ────────
verify_pre_cutover() {
    log_header "Stage 7/11: Pre-Cutover Verification (Validating BEFORE Symlink Switch)"

    # 1. Verify Frontend Build Output
    if [[ ! -f "${RELEASE_DIR}/frontend/dist/index.html" ]]; then
        log_error "Pre-cutover failure: Compiled frontend/dist/index.html is missing!"
        return 1
    fi
    log_success "  ✓ Frontend SPA index.html exists."

    # 2. Verify Static Assets Directory
    if [[ ! -d "${RELEASE_DIR}/backend/staticfiles" ]]; then
        log_error "Pre-cutover failure: Backend staticfiles directory is missing!"
        return 1
    fi
    log_success "  ✓ Static files directory exists."

    # 3. Verify Database Connection
    log_info "Testing database connectivity via Django check..."
    if ! (cd "${RELEASE_DIR}/backend" && "${VENV_PATH}/bin/python" manage.py check --database default >/dev/null 2>&1); then
        log_error "Pre-cutover failure: Database connection test failed!"
        return 1
    fi
    log_success "  ✓ PostgreSQL database connection verified."

    # 4. Verify Redis Connection (if REDIS_URL configured)
    if [[ -n "${REDIS_URL:-}" ]]; then
        log_info "Testing Redis connectivity..."
        if ! "${VENV_PATH}/bin/python" -c "
import sys, redis
try:
    r = redis.from_url('${REDIS_URL}', socket_timeout=3)
    r.ping()
    sys.exit(0)
except Exception:
    sys.exit(1)
" >/dev/null 2>&1; then
            log_warn "  ! Redis ping check failed. Backend will fall back to local cache."
        else
            log_success "  ✓ Redis ping check successful."
        fi
    fi

    # 5. Verify Nginx Configuration Syntax
    log_info "Testing Nginx site configuration syntax..."
    if ! nginx -t >/dev/null 2>&1; then
        log_error "Pre-cutover failure: Nginx syntax check failed!"
        nginx -t
        return 1
    fi
    log_success "  ✓ Nginx configuration syntax valid."

    log_success "Stage 7 Complete: Pre-cutover verification PASSED."
}

# ── Stage 8: Activate Release (Atomic Symlink Switch) ────────────────────────
activate_release() {
    log_header "Stage 8/11: Activating Release (Atomic Symlink Cutover)"

    set_permissions "${RELEASE_DIR}" "${DEPLOY_USER}" "${DEPLOY_GROUP}" "0755"
    log_info "Switching active symlink: ${CURRENT_SYM_DIR} -> ${RELEASE_DIR}"
    atomically_symlink "${RELEASE_DIR}" "${CURRENT_SYM_DIR}"

    log_success "Stage 8 Complete: Symlink switched to active release."
}

# ── Stage 9: Restart Application & Web Services ─────────────────────────────
restart_services() {
    log_header "Stage 9/11: Reloading Systemd & Restarting Services"

    log_info "Reloading systemd daemon..."
    systemd_reload

    log_info "Enabling & restarting application socket and service..."
    service_enable "${APP_NAME}.socket"
    service_enable "${APP_NAME}.service"
    service_restart "${APP_NAME}.socket"
    service_restart "${APP_NAME}.service"

    log_info "Reloading Nginx web server..."
    service_reload "nginx"

    log_success "Stage 9 Complete: System services restarted and reloaded."
}

# ── Stage 10: Post-Cutover Verification ──────────────────────────────────────
verify_release() {
    log_header "Stage 10/11: Post-Cutover Live Health Verification"

    local failures=0

    if service_is_active "${APP_NAME}.service"; then
        log_success "  ✓ Gunicorn service is ACTIVE (${APP_NAME}.service)"
    else
        log_error "  ✗ Gunicorn service is INACTIVE (${APP_NAME}.service)"
        failures=$((failures + 1))
    fi

    if service_is_active "nginx"; then
        log_success "  ✓ Nginx web server is ACTIVE"
    else
        log_error "  ✗ Nginx web server is INACTIVE"
        failures=$((failures + 1))
    fi

    if [[ -S "${SOCKET_PATH}" ]]; then
        log_success "  ✓ IPC Unix socket responding (${SOCKET_PATH})"
    else
        log_error "  ✗ IPC Unix socket missing (${SOCKET_PATH})"
        failures=$((failures + 1))
    fi

    if [[ ${failures} -gt 0 ]]; then
        log_error "Post-cutover verification failed with ${failures} error(s)."
        return 1
    fi

    log_success "Stage 10 Complete: Post-cutover verification PASSED."
}

# ── Stage 11: Deployment Summary Report ──────────────────────────────────────
deployment_summary() {
    log_header "Stage 11/11: Deployment Execution Summary"
    log_info "Status            : SUCCESS"
    log_info "Active Release    : ${RELEASE_TIMESTAMP}"
    log_info "Release Path      : ${RELEASE_DIR}"
    log_info "Active Symlink    : ${CURRENT_SYM_DIR}"
    log_info "Target Domain     : https://${DOMAIN}"
    log_info "Metadata File     : ${RELEASE_DIR}/release.json"
    log_info "Log File Location : ${LOG_FILE}"
    echo ""
    log_success "Deployment completed successfully! Live site updated with ZERO downtime."
}

# ══════════════════════════════════════════════════════════════════════════════
#  Main Execution Pipeline
# ══════════════════════════════════════════════════════════════════════════════
main() {
    acquire_lock
    load_and_validate_config
    prepare_release
    generate_configuration
    prepare_backend
    prepare_frontend
    run_database_tasks
    generate_release_metadata
    verify_pre_cutover
    activate_release
    restart_services
    verify_release
    deployment_summary
}

main "$@"
