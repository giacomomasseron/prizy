#!/usr/bin/env bash
# Prizy self-hosted installer.
#
# Takes a fresh Debian/Ubuntu or RHEL box to a running, TLS-terminated Prizy.
# Re-running it is the upgrade path.
#
#   bash scripts/install.sh --domain example.com --email ops@example.com
#
# This file is split in two. Everything above `main` is pure: no network, no
# filesystem writes, no package manager — which is what lets
# scripts/test-install.sh source this file and call the functions directly.
# Everything the machine can feel lives below, and is exercised with --dry-run.
set -euo pipefail

# --- pure library ----------------------------------------------------------

# Keys this installer knows how to generate. ACME_EMAIL is deliberately absent:
# it ships empty too, but it is operator-supplied, not generated.
# Part of this file's public interface (task 3's main() iterates it); nothing
# in this file consumes it directly, hence the disable below.
# shellcheck disable=SC2034
SECRET_KEYS=(
    APP_KEY
    POSTGRES_PASSWORD
    PRIZY_APP_DB_PASSWORD
    REDIS_PASSWORD
    REVERB_APP_ID
    REVERB_APP_KEY
    REVERB_APP_SECRET
)

# Reads /etc/os-release CONTENT on stdin rather than taking a path, so tests
# drive it with fixtures and the caller decides where the content comes from.
# Prints exactly one of: debian, rhel, unsupported.
detect_os_family() {
    local line id="" id_like=""
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ID=*)      id="${line#ID=}" ;;
            ID_LIKE=*) id_like="${line#ID_LIKE=}" ;;
        esac
    done
    id="${id//\"/}"
    id_like="${id_like//\"/}"
    case " $id $id_like " in
        *" debian "*|*" ubuntu "*)                printf 'debian' ;;
        *" rhel "*|*" fedora "*|*" centos "*)     printf 'rhel' ;;
        *)                                        printf 'unsupported' ;;
    esac
}

# Exit 0 when $1 >= $2 under version ordering. `sort -V` and not a string
# compare, because lexically "9.9" sorts after "24".
version_gte() {
    [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# At least two labels: a single label like `localhost` cannot hold a workspace
# subdomain, and on-demand TLS could never get a certificate for it.
validate_domain() {
    printf '%s' "${1:-}" | grep -qE '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
}

validate_email() {
    printf '%s' "${1:-}" | grep -qE '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
}

# Hex for everything except APP_KEY, which Laravel requires as base64: + 32
# raw bytes. Hex matters: a password containing $ or # would be re-read by
# Compose's dotenv parser as an interpolation or a comment.
gen_secret_for() {
    case "$1" in
        APP_KEY)        printf 'base64:%s' "$(openssl rand -base64 32)" ;;
        REVERB_APP_ID)  openssl rand -hex 8 ;;
        *)              openssl rand -hex 32 ;;
    esac
}

# Merges a template into an existing .env and prints the result on stdout.
#
# THE RULE: an existing NON-EMPTY value always wins. Everything else follows
# from it. Getting this wrong overwrites a live database password on an
# upgrade and takes the instance down with no obvious cause, so the tests for
# this function are the most important ones in the repository.
#
# Output keeps the template's order and comments, so an upgraded .env still
# reads like the shipped template. Keys the operator added that the template
# does not know about are appended rather than dropped.
#
# Usage: merge_env <existing-file> <template-file>
merge_env() {
    local existing="$1" template="$2"
    local line key
    declare -A existing_values=()
    declare -A emitted=()

    if [ -f "$existing" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            case "$line" in ''|'#'*) continue ;; esac
            key="${line%%=*}"
            # Not a KEY=VALUE line at all.
            [ "$key" = "$line" ] && continue
            # ${line#*=} and not a split on every =, so a value that itself
            # contains = (base64 padding, an SMTP password) survives whole.
            existing_values["$key"]="${line#*=}"
        done < "$existing"
    fi

    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in ''|'#'*) printf '%s\n' "$line"; continue ;; esac
        key="${line%%=*}"
        if [ "$key" = "$line" ]; then
            printf '%s\n' "$line"
            continue
        fi
        emitted["$key"]=1
        # :- so an existing-but-EMPTY value falls through to the template,
        # which is what makes a half-filled .env recoverable by a re-run.
        if [ -n "${existing_values[$key]:-}" ]; then
            printf '%s=%s\n' "$key" "${existing_values[$key]}"
        else
            printf '%s\n' "$line"
        fi
    done < "$template"

    local extra=""
    for key in "${!existing_values[@]}"; do
        [ -n "${emitted[$key]:-}" ] && continue
        extra+="$key=${existing_values[$key]}"$'\n'
    done
    if [ -n "$extra" ]; then
        printf '\n# Preserved from the previous .env; not part of the shipped template.\n'
        # Sorted because bash associative arrays have no useful iteration order,
        # and an upgrade that reshuffles these lines produces a confusing diff.
        printf '%s' "$extra" | sort
    fi
}

# --- steps -----------------------------------------------------------------

main() {
    printf 'scripts/install.sh: not implemented yet\n' >&2
    return 1
}

# Only run when executed, never when sourced — this is what makes the library
# above unit-testable.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
