#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — CLI & Utilities Helper Library
# ══════════════════════════════════════════════════════════════════════════════
#  Provides CLI argument parsers (--help, --dry-run), template rendering engine,
#  timestamp generation, and atomic symlink helpers.
# ══════════════════════════════════════════════════════════════════════════════

if [[ -n "${_STARTLNK_LIB_HELPERS_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_HELPERS_LOADED=1

# Function: generate_timestamp
# Purpose: Returns timestamp in YYYYMMDD-HHMMSS format
generate_timestamp() {
    date +"%Y%m%d-%H%M%S"
}

# Function: atomically_symlink
# Purpose: Atomically updates a symbolic link (e.g. current -> releases/YYYYMMDD-HHMMSS)
atomically_symlink() {
    local target="$1"
    local link_name="$2"

    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m ln -sfn ${target} ${link_name}"
        return 0
    fi

    ln -sfn "${target}" "${link_name}"
}

# Function: render_template
# Purpose: Renders a template file by substituting {{KEY}} placeholders with variable values
# Usage: render_template template_file output_file
render_template() {
    local template_file="$1"
    local output_file="$2"

    if [[ ! -f "${template_file}" ]]; then
        if declare -f log_error >/dev/null; then
            log_error "Template file missing: ${template_file}"
        fi
        return 1
    fi

    if declare -f is_dry_run >/dev/null && is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m Render template '${template_file}' -> '${output_file}'"
        return 0
    fi

    # Read template content into memory
    local content
    content=$(<"${template_file}")

    # Replace known Mustache placeholders using sed or bash expansion
    # We substitute all defined environment variables into {{VAR}}
    local sed_script=""
    
    # Commonly substituted variables
    local vars=(
        "APP_NAME" "DOMAIN" "SERVER_IP" "DEPLOY_USER" "DEPLOY_GROUP"
        "DEPLOY_ROOT" "VENV_PATH" "WORKING_DIRECTORY" "FRONTEND_DIST_DIR"
        "STATIC_ROOT" "MEDIA_ROOT" "SOCKET_PATH" "SSL_CERT_PATH" "SSL_KEY_PATH"
        "GUNICORN_WORKERS" "GUNICORN_TIMEOUT" "WSGI_MODULE" "SECRET_KEY"
        "DEBUG" "ALLOWED_HOSTS" "DB_ENGINE" "DB_NAME" "DB_USER" "DB_PASSWORD"
        "DB_HOST" "DB_PORT" "GOOGLE_CLIENT_ID" "JWT_SECRET_KEY" "JWT_COOKIE_SECURE"
        "CORS_ALLOWED_ORIGINS" "EMAIL_BACKEND" "EMAIL_HOST" "EMAIL_PORT"
        "EMAIL_USE_TLS" "EMAIL_HOST_USER" "EMAIL_HOST_PASSWORD" "REDIS_URL"
    )

    for var in "${vars[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            # Escape slashes for sed replacement
            local val="${!var}"
            val=$(echo "${val}" | sed 's/[\/&]/\\&/g')
            content=$(echo "${content}" | sed "s/{{${var}}}/${val}/g")
        fi
    done

    # Ensure parent directory exists
    local parent_dir
    parent_dir=$(dirname "${output_file}")
    mkdir -p "${parent_dir}"

    # Write output file
    echo "${content}" > "${output_file}"
}

# Function: show_help_banner
# Purpose: Prints standard CLI help banner
show_help_banner() {
    local script_name="$1"
    local description="$2"
    local usage="$3"

    echo -e "══════════════════════════════════════════════════════════════════════════════"
    echo -e "  StartLnk Framework — ${script_name}"
    echo -e "══════════════════════════════════════════════════════════════════════════════"
    echo -e "Description: ${description}\n"
    echo -e "Usage:"
    echo -e "  ${usage}\n"
    echo -e "Options:"
    echo -e "  --dry-run    Simulate execution without modifying the system"
    echo -e "  --help       Show this help documentation"
    echo -e "══════════════════════════════════════════════════════════════════════════════"
}

# Function: parse_common_args
# Purpose: Parses global flags (--help, --dry-run) from script parameters
parse_common_args() {
    local script_name="$1"
    local description="$2"
    local usage="$3"
    shift 3

    for arg in "$@"; do
        case "${arg}" in
            --help|-h)
                show_help_banner "${script_name}" "${description}" "${usage}"
                exit 0
                ;;
            --dry-run)
                DRY_RUN=1
                export DRY_RUN
                if declare -f log_info >/dev/null; then
                    log_info "DRY-RUN mode enabled. No changes will be committed."
                fi
                ;;
        esac
    done
}
