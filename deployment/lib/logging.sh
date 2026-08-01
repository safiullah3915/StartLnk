#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — Logging & Formatting Library
# ══════════════════════════════════════════════════════════════════════════════
#  Provides colored console output, timestamps, log levels, and section headers.
# ══════════════════════════════════════════════════════════════════════════════

if [[ -n "${_STARTLNK_LIB_LOGGING_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_LOGGING_LOADED=1

# ANSI Color Definitions
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_RED="\033[0;31m"
CLR_GREEN="\033[0;32m"
CLR_YELLOW="\033[0;33m"
CLR_BLUE="\033[0;34m"
CLR_CYAN="\033[0;36m"

# Get current ISO timestamp
_log_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

# Function: log_info
# Purpose: Prints informative messages (Cyan)
log_info() {
    echo -e "${CLR_CYAN}[INFO] [$(_log_timestamp)]${CLR_RESET} $*"
}

# Function: log_success
# Purpose: Prints success confirmation messages (Green)
log_success() {
    echo -e "${CLR_GREEN}[SUCCESS] [$(_log_timestamp)]${CLR_RESET} $*"
}

# Function: log_warn
# Purpose: Prints warning messages (Yellow)
log_warn() {
    echo -e "${CLR_YELLOW}[WARNING] [$(_log_timestamp)]${CLR_RESET} $*" >&2
}

# Function: log_error
# Purpose: Prints error messages (Red)
log_error() {
    echo -e "${CLR_RED}[ERROR] [$(_log_timestamp)]${CLR_RESET} $*" >&2
}

# Function: log_header
# Purpose: Prints major section banner headers
log_header() {
    local message="$*"
    echo -e "\n${CLR_BOLD}${CLR_BLUE}══════════════════════════════════════════════════════════════════════════════${CLR_RESET}"
    echo -e "${CLR_BOLD}${CLR_BLUE}  ${message}${CLR_RESET}"
    echo -e "${CLR_BOLD}${CLR_BLUE}══════════════════════════════════════════════════════════════════════════════${CLR_RESET}\n"
}
