#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  StartLnk — Common Framework Initialization Library
# ══════════════════════════════════════════════════════════════════════════════
#  Provides include guards, strict shell execution settings, global flags,
#  and signal/error trap handlers.
# ══════════════════════════════════════════════════════════════════════════════

# Include guard to prevent multiple sourcing
if [[ -n "${_STARTLNK_LIB_COMMON_LOADED:-}" ]]; then
    return 0
fi
_STARTLNK_LIB_COMMON_LOADED=1

# Enforce strict Bash execution options
set -Eeuo pipefail

# Global execution flags
DRY_RUN=${DRY_RUN:-0}
VERBOSE=${VERBOSE:-0}

# System trap handler for unexpected errors
_framework_error_trap() {
    local exit_code=$?
    local line_no=$1
    local bash_command=$2
    
    # Only report if exit_code is non-zero
    if [[ ${exit_code} -ne 0 ]]; then
        echo -e "\n\033[0;31m[ERROR] Command failed with status ${exit_code} on line ${line_no}: '${bash_command}'\033[0m" >&2
    fi
    exit ${exit_code}
}

# Attach error handler
trap '_framework_error_trap $LINENO "$BASH_COMMAND"' ERR

# Function: is_dry_run
# Purpose: Returns true (0) if DRY_RUN mode is enabled, false (1) otherwise
is_dry_run() {
    [[ "${DRY_RUN}" -eq 1 ]]
}

# Function: run_cmd
# Purpose: Runs a command normally or logs it if DRY_RUN is active
run_cmd() {
    if is_dry_run; then
        echo -e "\033[0;33m[DRY-RUN]\033[0m $*"
        return 0
    else
        "$@"
    fi
}
