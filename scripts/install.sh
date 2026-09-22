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

# Trims leading and trailing [:space:] from $1. Only the two edges are
# touched — interior whitespace, =, #, quotes and backslashes are left
# exactly as given.
_dotenv_trim() {
    local s="$1"
    s="${s#"${s%%[![:space:]]*}"}"
    s="${s%"${s##*[![:space:]]}"}"
    printf '%s' "$s"
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
# Every line this function reads is parsed exactly the way Compose's own
# dotenv parser parses it — because Compose is what reads the .env this
# function writes. That means, on every line of every file it reads: (1) a
# trailing \r is stripped before anything else runs, so a file saved with
# CRLF line endings does not glue a literal \r onto every preserved value;
# (2) whitespace around the `=` is trimmed — trailing on the key, leading on
# the value; (3) trailing whitespace on the value is trimmed too, so a
# whitespace-only value (`KEY=   `) trims to empty and is treated exactly
# like an unset one, falling through to the template rather than "winning"
# as if it were real. This is a specification to match, not a style choice —
# if Compose's parsing ever changes, this must change with it.
#
# Usage: merge_env <existing-file> <template-file>
merge_env() {
    local existing="$1" template="$2"
    local line key value
    declare -A existing_values=()
    declare -A emitted=()

    if [ -f "$existing" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            line="${line%$'\r'}"
            case "$line" in ''|'#'*) continue ;; esac
            key="${line%%=*}"
            # Not a KEY=VALUE line at all.
            [ "$key" = "$line" ] && continue
            key="$(_dotenv_trim "$key")"
            # ${line#*=} and not a split on every =, so a value that itself
            # contains = (base64 padding, an SMTP password) survives whole.
            value="$(_dotenv_trim "${line#*=}")"
            existing_values["$key"]="$value"
        done < "$existing"
    fi

    while IFS= read -r line || [ -n "$line" ]; do
        line="${line%$'\r'}"
        case "$line" in ''|'#'*) printf '%s\n' "$line"; continue ;; esac
        key="${line%%=*}"
        if [ "$key" = "$line" ]; then
            printf '%s\n' "$line"
            continue
        fi
        key="$(_dotenv_trim "$key")"
        emitted["$key"]=1
        # :- so an existing-but-EMPTY (or whitespace-only, now that it has
        # been trimmed above) value falls through to the template, which is
        # what makes a half-filled .env recoverable by a re-run.
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

PRIZY_ROOT="/data/prizy"
SOURCE_DIR="$PRIZY_ROOT/source"
REPO_URL="${PRIZY_REPO_URL:-https://github.com/giacomomasseron/prizy.git}"

OPT_DOMAIN=""; OPT_EMAIL=""; OPT_MAIL=""; OPT_REF=""; OPT_SOURCE_PATH=""
OPT_DRY_RUN=0; OPT_WITH_REALTIME=0; OPT_REQUIRE_DNS=0; OPT_YES=0
OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"
# preflight sets OS_FAMILY and ensure_docker reads it; start_logging sets LOG_FILE.
OS_FAMILY=""; LOG_FILE=""

step() { printf '\n\033[0;34m==> [%s] %s\033[0m\n' "$1" "$2"; }
info() { printf '    %s\n' "$1"; }
warn() { printf '\033[0;33m    WARNING: %s\033[0m\n' "$1"; }
die()  { printf '\033[0;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

# Every machine-touching command goes through this, which is what makes
# --dry-run trustworthy: if a step does not use `run`, --dry-run does not
# cover it.
run() {
    if [ "$OPT_DRY_RUN" -eq 1 ]; then
        printf '    DRY-RUN: %s\n' "$*"
        return 0
    fi
    "$@"
}

usage() {
    cat <<'USAGE'
Prizy self-hosted installer.

  bash install.sh --domain example.com --email ops@example.com

Required:
  --domain <domain>      Base domain. Workspaces live at <slug>.<domain>, so
                         both `A example.com` and `A *.example.com` must point
                         at this machine.
  --email <address>      Contact address for the Let's Encrypt account. Must be
                         real and deliverable; @example.com and @localhost are
                         refused by the CA.

Mail (required decision):
  --mail=smtp            Prompt for SMTP settings.
  --mail=log             Write mail to the log instead of sending it. Contact
                         portal magic-link sign-in, email verification,
                         invitations and CSAT requests will not work.

Source:
  --ref <tag|branch>     Clone the repository at this ref (default: main).
  --source-path <dir>    Install from a local directory instead of cloning.

Options:
  --with-realtime        Run Reverb and compile the WebSocket client into the
                         bundle. Without it the frontend polls.
  --http-port <port>     Default 80.
  --https-port <port>    Default 443.
  --require-dns          Treat a failed DNS check as fatal rather than a warning.
  --dry-run              Print what would happen and change nothing.
  --yes                  Never prompt; fail instead if something is missing.
  --help                 This text.
USAGE
}

parse_args() {
    while [ $# -gt 0 ]; do
        # OPT_HTTP_PORT/OPT_HTTPS_PORT/OPT_WITH_REALTIME/OPT_REQUIRE_DNS/OPT_YES are
        # part of this file's public interface for tasks 4-5; nothing in this file
        # reads them yet, hence the disable (shellcheck cannot target one case item).
        # shellcheck disable=SC2034
        case "$1" in
            --domain)       OPT_DOMAIN="${2:-}"; shift 2 ;;
            --email)        OPT_EMAIL="${2:-}"; shift 2 ;;
            --mail=*)       OPT_MAIL="${1#--mail=}"; shift ;;
            --ref)          OPT_REF="${2:-}"; shift 2 ;;
            --source-path)  OPT_SOURCE_PATH="${2:-}"; shift 2 ;;
            --http-port)    OPT_HTTP_PORT="${2:-}"; shift 2 ;;
            --https-port)   OPT_HTTPS_PORT="${2:-}"; shift 2 ;;
            --with-realtime) OPT_WITH_REALTIME=1; shift ;;
            --require-dns)  OPT_REQUIRE_DNS=1; shift ;;
            --dry-run)      OPT_DRY_RUN=1; shift ;;
            --yes)          OPT_YES=1; shift ;;
            --help|-h)      usage; exit 0 ;;
            *)              die "unknown option: $1 (try --help)" ;;
        esac
    done

    # Environment fallbacks, so an unattended run can come from a config
    # management tool without assembling a command line. Flags always win.
    OPT_DOMAIN="${OPT_DOMAIN:-${PRIZY_DOMAIN:-}}"
    OPT_EMAIL="${OPT_EMAIL:-${PRIZY_EMAIL:-}}"
    OPT_MAIL="${OPT_MAIL:-${PRIZY_MAIL:-}}"

    [ -n "$OPT_REF" ] && [ -n "$OPT_SOURCE_PATH" ] && \
        die "--ref and --source-path are mutually exclusive; pick where the source comes from"
    [ -z "$OPT_REF" ] && [ -z "$OPT_SOURCE_PATH" ] && OPT_REF="main"

    validate_domain "$OPT_DOMAIN" || \
        die "--domain must be a domain with at least two labels, e.g. example.com (got '${OPT_DOMAIN}')"
    validate_email "$OPT_EMAIL" || \
        die "--email must be a real deliverable address, e.g. ops@example.com (got '${OPT_EMAIL}')"

    case "$OPT_MAIL" in
        smtp|log) ;;
        "")  die "mail is a required decision: pass --mail=smtp or --mail=log (see --help)" ;;
        *)   die "--mail must be 'smtp' or 'log' (got '$OPT_MAIL')" ;;
    esac
}

preflight() {
    step 1 "Preflight"

    if [ "$OPT_DRY_RUN" -eq 0 ] && [ "$(id -u)" -ne 0 ]; then
        die "this installer must run as root (it installs Docker and writes to $PRIZY_ROOT)"
    fi

    local family="unsupported"
    if [ -r /etc/os-release ]; then
        family="$(detect_os_family < /etc/os-release)"
    fi
    if [ "$family" = "unsupported" ]; then
        if [ "$OPT_DRY_RUN" -eq 1 ]; then
            warn "unsupported or undetectable distribution; a real run would stop here"
        else
            die "unsupported distribution. This installer supports the Debian/Ubuntu and RHEL families only."
        fi
    else
        info "distribution family: $family"
    fi
    OS_FAMILY="$family"

    local arch; arch="$(uname -m)"
    case "$arch" in
        x86_64|aarch64|arm64) info "architecture: $arch" ;;
        *) die "unsupported architecture: $arch (x86_64 and aarch64 only)" ;;
    esac

    # 4 GB RAM and 20 GB disk: the image build (Composer plus a Vite bundle) is
    # the peak, not the running stack.
    local mem_kb=0
    [ -r /proc/meminfo ] && mem_kb="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
    if [ "$mem_kb" -gt 0 ] && [ "$mem_kb" -lt 4000000 ]; then
        warn "this machine has $((mem_kb / 1024)) MB RAM; 4 GB is the minimum and the image build is the peak"
    fi

    local free_kb; free_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
    if [ "$free_kb" -lt 20000000 ]; then
        warn "only $((free_kb / 1024 / 1024)) GB free on /; 20 GB is the minimum"
    fi
}

ensure_docker() {
    step 2 "Docker"

    if command -v docker >/dev/null 2>&1; then
        local have; have="$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 0)"
        if version_gte "$have" "24"; then
            info "docker $have is already installed"
        else
            die "docker $have is too old; this stack needs 24 or newer"
        fi
    else
        info "installing docker via get.docker.com"
        run sh -c 'curl -fsSL https://get.docker.com | sh'
        if ! run command -v docker >/dev/null 2>&1 && [ "$OPT_DRY_RUN" -eq 0 ]; then
            # The convenience script does not cover every RHEL derivative.
            case "$OS_FAMILY" in
                debian) run apt-get update && run apt-get install -y docker.io docker-compose-plugin ;;
                rhel)   run dnf install -y docker docker-compose-plugin ;;
            esac
        fi
        run systemctl enable --now docker
    fi

    if [ "$OPT_DRY_RUN" -eq 0 ] && ! docker compose version >/dev/null 2>&1; then
        die "docker compose v2 is required (the 'docker compose' subcommand, not docker-compose)"
    fi
}

ensure_layout() {
    step 3 "Layout"
    # 0700: .env under here holds every secret the install has.
    run mkdir -p "$SOURCE_DIR" "$PRIZY_ROOT/backups"
    run chmod 700 "$PRIZY_ROOT" "$SOURCE_DIR" "$PRIZY_ROOT/backups"
    info "$PRIZY_ROOT/{source,backups} (mode 0700)"
    start_logging
}

# Everything from here on is tee'd to a log, because the interesting failures
# happen minutes in — a build that ran out of disk, a migration that refused —
# and by then the scrollback an operator could paste into an issue is gone.
#
# It starts only after the layout exists, so preflight and Docker are not
# captured. That is the trade for not writing anything outside $PRIZY_ROOT
# before we know the machine is even supported.
start_logging() {
    [ "$OPT_DRY_RUN" -eq 1 ] && return 0
    LOG_FILE="$PRIZY_ROOT/install-$(date +%Y%m%d%H%M%S).log"
    exec > >(tee -a "$LOG_FILE") 2>&1
    info "logging to $LOG_FILE"
}

fetch_source() {
    step 4 "Source"

    if [ -n "$OPT_SOURCE_PATH" ]; then
        [ -d "$OPT_SOURCE_PATH" ] || die "--source-path '$OPT_SOURCE_PATH' is not a directory"
        [ -f "$OPT_SOURCE_PATH/docker-compose.prod.yml" ] || \
            die "--source-path '$OPT_SOURCE_PATH' does not look like a Prizy checkout (no docker-compose.prod.yml)"
        info "copying from $OPT_SOURCE_PATH"
        run sh -c "cp -a '$OPT_SOURCE_PATH/.' '$SOURCE_DIR/'"
        return 0
    fi

    if [ -d "$SOURCE_DIR/.git" ]; then
        info "updating existing checkout to $OPT_REF"
        run git -C "$SOURCE_DIR" fetch --depth 1 origin "$OPT_REF"
        run git -C "$SOURCE_DIR" checkout --force FETCH_HEAD
        return 0
    fi

    # The remote is empty as of 2026-09-22, so this is the path most likely to
    # fail on a real box. Say why, rather than letting a raw git error land.
    info "cloning $REPO_URL at $OPT_REF"
    if [ "$OPT_DRY_RUN" -eq 0 ]; then
        if ! git ls-remote --heads "$REPO_URL" >/dev/null 2>&1; then
            die "cannot read $REPO_URL. If the repository is private or not yet published, install from a local checkout instead: --source-path /path/to/prizy"
        fi
        if ! git ls-remote --exit-code "$REPO_URL" "$OPT_REF" >/dev/null 2>&1; then
            die "$REPO_URL has no ref named '$OPT_REF'. Pass an existing tag or branch with --ref, or use --source-path."
        fi
    fi
    run git clone --depth 1 --branch "$OPT_REF" "$REPO_URL" "$SOURCE_DIR"
}

main() {
    parse_args "$@"
    preflight
    ensure_docker
    ensure_layout
    fetch_source
}

# Only run when executed, never when sourced — this is what makes the library
# above unit-testable.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
