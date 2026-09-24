#!/usr/bin/env bash
# Prizy self-hosted installer.
#
# Takes a fresh Debian/Ubuntu or RHEL box to a running, TLS-terminated Prizy.
# Re-running it is the upgrade path.
#
#   curl -fsSL https://prizy.dev/install.sh | bash
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

# Reads `git ls-remote --tags --refs` output on stdin and prints the newest
# release: the highest vX.Y.Z tag in version order. A pre-release (v1.0.0-rc.1)
# or any other tag is not a release. Prints nothing when there is none, and
# always exits 0, so a caller's $(...) cannot trip errexit on an empty answer.
latest_release_tag() {
    local ref tags=()
    while read -r _ ref; do
        ref="${ref#refs/tags/}"
        if [[ "$ref" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            tags+=("$ref")
        fi
    done
    [ "${#tags[@]}" -gt 0 ] || return 0
    printf '%s\n' "${tags[@]}" | sort -V | tail -n1
}

# At least two labels: a single label like `localhost` cannot hold a workspace
# subdomain, and on-demand TLS could never get a certificate for it.
validate_domain() {
    printf '%s' "${1:-}" | grep -qE '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
}

validate_email() {
    printf '%s' "${1:-}" | grep -qE '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
}

validate_mail_choice() {
    case "${1:-}" in
        smtp|log) return 0 ;;
        *)        return 1 ;;
    esac
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

# Prints the value of key $1 in the .env at $2, or nothing when the file does
# not exist or does not set that key.
#
# Parsed exactly the way merge_env parses the same file, and last-assignment-
# wins for the same reason: the two functions read the same .env, and a prompt
# whose default disagreed with what the merge is about to preserve would show
# the operator a value the install does not actually hold.
env_value_of() {
    local key="$1" file="$2" line found=""
    [ -f "$file" ] || return 0
    while IFS= read -r line || [ -n "$line" ]; do
        line="${line%$'\r'}"
        case "$line" in ''|'#'*) continue ;; esac
        if [ "${line%%=*}" != "$line" ] && [ "$(_dotenv_trim "${line%%=*}")" = "$key" ]; then
            found="$(_dotenv_trim "${line#*=}")"
        fi
    done < "$file"
    printf '%s' "$found"
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

# Overridable so the test suite can drive a real (non-dry-run) layout into a
# temp directory. Without this the dry-run assertion is untestable on a non-root
# box: /data is root-owned, so a broken gate fails on permissions rather than
# creating anything, and the assertion passes either way.
PRIZY_ROOT="${PRIZY_ROOT:-/data/prizy}"
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

  curl -fsSL https://prizy.dev/install.sh | bash
  curl -fsSL https://prizy.dev/install.sh | bash -s -- --mail=smtp
  bash install.sh --domain example.com --email ops@example.com --mail=smtp

Run in a terminal, piped from curl or not, it asks for any of --domain, --email
and --mail that you leave out; on a re-run, Enter keeps what the install already
has. Under --yes, or with no terminal to ask on (ssh without -t, cron), they
are required. Piped, flags go after `bash -s --`.

Settings (asked for when omitted):
  --domain <domain>      Base domain. Workspaces live at <slug>.<domain>, so
                         both `A example.com` and `A *.example.com` must point
                         at this machine.
  --email <address>      Contact address for the Let's Encrypt account. Must be
                         real and deliverable; @example.com and @localhost are
                         refused by the CA.

Mail (a decision, asked for when omitted):
  --mail=smtp            Prompt for SMTP settings.
  --mail=log             Write mail to the log instead of sending it. Contact
                         portal magic-link sign-in, email verification,
                         invitations and CSAT requests will not work.

Source:
  --ref <tag|branch>     Clone the repository at this ref (default: the latest
                         release, its newest vX.Y.Z tag).
  --source-path <dir>    Install from a local directory instead of cloning.

Options:
  --with-realtime        Run Reverb and compile the WebSocket client into the
                         bundle. Without it the frontend polls.
  --http-port <port>     Default 80.
  --https-port <port>    Default 443.
  --require-dns          Treat a failed DNS check as fatal rather than a warning.
  --dry-run              Print what would happen and change nothing.
  --yes                  Never prompt; take every answer from the environment
                         below and fail if a required one is missing. An SMTP
                         relay that needs no authentication is expressed by
                         leaving PRIZY_SMTP_USERNAME and PRIZY_SMTP_PASSWORD
                         unset; only PRIZY_SMTP_HOST is required.
  --help                 This text.

Environment:
  Every prompt and every required flag has an environment variable behind it,
  so an unattended run can come from a config management tool. A flag always
  wins over its variable.

  PRIZY_DOMAIN           Same as --domain.
  PRIZY_EMAIL            Same as --email.
  PRIZY_MAIL             Same as --mail= (smtp or log).
  PRIZY_SMTP_HOST        SMTP host. Required under --yes --mail=smtp.
  PRIZY_SMTP_PORT        SMTP port (default 587).
  PRIZY_SMTP_USERNAME    SMTP username. Leave unset for an auth-less relay.
  PRIZY_SMTP_PASSWORD    SMTP password. Leave unset for an auth-less relay.
  PRIZY_SMTP_ENCRYPTION  tls, ssl or none (default tls).
  PRIZY_ROOT             Install directory (default /data/prizy).
  PRIZY_REPO_URL         Repository to clone under --ref.

  On a re-run, an SMTP setting that is not given defaults to the value already
  in the install's .env, so pressing Enter — or running with --yes and none of
  the PRIZY_SMTP_* variables — keeps the mail configuration as it is.

  Unattended example:

    PRIZY_DOMAIN=example.com PRIZY_EMAIL=ops@example.com PRIZY_MAIL=smtp \
    PRIZY_SMTP_HOST=smtp.example.com \
    bash install.sh --yes --source-path /root/prizy
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
    # Neither given: OPT_REF stays empty, and fetch_source installs the latest
    # release. Looked up there, after preflight has made sure git exists.

    # Only what was given is checked here. A setting left out is not an error
    # yet: resolve_required asks for it, or refuses when nobody can answer.
    # A value that WAS given and is wrong still stops the run — the operator
    # said something specific, so guessing past it would be worse than asking.
    if [ -n "$OPT_DOMAIN" ] && ! validate_domain "$OPT_DOMAIN"; then
        die "--domain must be a domain with at least two labels, e.g. example.com (got '${OPT_DOMAIN}')"
    fi
    if [ -n "$OPT_EMAIL" ] && ! validate_email "$OPT_EMAIL"; then
        die "--email must be a real deliverable address, e.g. ops@example.com (got '${OPT_EMAIL}')"
    fi
    if [ -n "$OPT_MAIL" ] && ! validate_mail_choice "$OPT_MAIL"; then
        die "--mail must be 'smtp' or 'log' (got '$OPT_MAIL')"
    fi
}

# The descriptor every question reads its answer from: standard input, unless
# open_prompt_input finds the terminal somewhere else.
PROMPT_FD=0

# Under `curl … | bash`, stdin is the script itself, and by the time main runs
# bash has read it to the end, so an answer read there is no answer at all.
# The terminal the pipeline runs in is still /dev/tty, and the questions are
# asked on that instead. With no controlling terminal (ssh without -t, cron,
# CI) the open fails and PROMPT_FD stays on stdin, where is_interactive then
# finds nobody to ask.
open_prompt_input() {
    [ -t 0 ] && return 0
    local fd
    # The failed open's own message is noise: the refusal that follows says
    # what matters, and how to get asked.
    if { exec {fd}</dev/tty; } 2>/dev/null; then
        PROMPT_FD="$fd"
    fi
}

# True when a person is at a terminal to answer questions. Its own function so
# the test suite, which has no terminal, can stand one in.
is_interactive() {
    [ -t "$PROMPT_FD" ]
}

# ask_value <var> <question> <validator> <complaint> [default]
#
# Asks until <validator> accepts the answer, then assigns it to <var>. Enter
# takes the default, and the default goes through the same validator as a
# typed answer does.
#
# The prompt is printed rather than left to `read -p`, which prints nothing at
# all when stdin is not a terminal — and a question nobody can see reads as a
# hung installer.
ask_value() {
    local var="$1" question="$2" validator="$3" complaint="$4" default="${5:-}" answer
    while true; do
        if [ -n "$default" ]; then
            printf '    %s [%s]: ' "$question" "$default" >&2
        else
            printf '    %s: ' "$question" >&2
        fi
        # read fails at end of input (Ctrl-D, a closed pipe). Without this the
        # loop below would ask the same question forever. A final line with no
        # newline still counts as an answer; only a truly empty read stops.
        if ! IFS= read -r -u "$PROMPT_FD" answer && [ -z "$answer" ]; then
            printf '\n' >&2
            die "no answer for '$question' (input closed)"
        fi
        answer="$(_dotenv_trim "$answer")"
        answer="${answer:-$default}"
        if "$validator" "$answer"; then
            printf -v "$var" '%s' "$answer"
            return 0
        fi
        warn "$complaint"
    done
}

# Where fetch_source parks the install's .env for the duration of a
# --source-path copy. A file here means a run was interrupted mid-copy.
parked_env_path() {
    printf '%s/.env-parked-during-copy' "$PRIZY_ROOT"
}

# The .env a re-run should take its defaults from. Normally the install's own.
# After a run interrupted mid-copy, the parked file IS that .env, and the one
# in $SOURCE_DIR came from the checkout — the same rule fetch_source applies.
current_env_file() {
    local parked; parked="$(parked_env_path)"
    if [ -f "$parked" ]; then
        printf '%s' "$parked"
    else
        printf '%s' "$SOURCE_DIR/.env"
    fi
}

# Asks for whichever of --domain, --email and --mail parse_args was not given,
# so `bash install.sh` with nothing after it is a complete first command.
#
# Under --yes, or with no terminal to ask on, a missing setting stays fatal,
# and every missing one is named at once rather than one per attempt.
#
# On a re-run, each question offers what the install's .env already holds, so
# an upgrade is Enter three times. A stored value is only offered if it passes
# the same validator as a typed answer, so Enter can never accept something the
# matching flag would have refused.
resolve_required() {
    local missing=()
    [ -n "$OPT_DOMAIN" ] || missing+=("--domain")
    [ -n "$OPT_EMAIL" ]  || missing+=("--email")
    [ -n "$OPT_MAIL" ]   || missing+=("--mail=smtp|log")
    [ "${#missing[@]}" -gt 0 ] || return 0

    if [ "$OPT_YES" -eq 1 ]; then
        die "missing ${missing[*]}. --yes never asks: pass them as flags or set PRIZY_DOMAIN, PRIZY_EMAIL and PRIZY_MAIL (see --help)"
    fi
    if ! is_interactive; then
        die "missing ${missing[*]}. Pass them as flags (see --help), or run the installer in a terminal to be asked for them; over ssh, that means ssh -t"
    fi

    local env_file current
    env_file="$(current_env_file)"

    printf '\nPrizy self-hosted installer\n\n'
    printf 'A few answers before anything is installed. Each one can also be passed\n'
    printf 'as a flag; see --help.\n'

    if [ -z "$OPT_DOMAIN" ]; then
        current="$(env_value_of APP_BASE_DOMAIN "$env_file")"
        validate_domain "$current" || current=""
        printf '\n'
        info "Workspaces live at <name>.<domain>, so point both <domain> and"
        info "*.<domain> at this server."
        ask_value OPT_DOMAIN "Domain" validate_domain \
            "enter a lowercase domain with at least two labels, e.g. example.com" "$current"
    fi

    if [ -z "$OPT_EMAIL" ]; then
        current="$(env_value_of ACME_EMAIL "$env_file")"
        validate_email "$current" || current=""
        printf '\n'
        info "Let's Encrypt sends certificate notices to this address. It must be"
        info "real: @example.com and @localhost are refused."
        ask_value OPT_EMAIL "Let's Encrypt email" validate_email \
            "enter a real, deliverable address, e.g. ops@yourcompany.com" "$current"
    fi

    if [ -z "$OPT_MAIL" ]; then
        current="$(env_value_of MAIL_MAILER "$env_file")"
        validate_mail_choice "$current" || current=""
        printf '\n'
        info "smtp  send email through your SMTP server (its settings are asked"
        info "      during configuration)"
        info "log   send no email: portal sign-in links, email verification,"
        info "      invitations and CSAT requests will not work"
        ask_value OPT_MAIL "Email delivery (smtp/log)" validate_mail_choice \
            "answer smtp or log" "$current"
    fi
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

    ensure_prerequisites
}

# Installs the tools this run needs that a minimal image may not have:
#   openssl  every generated secret (always);
#   curl     fetching Docker's install script (only when Docker is missing);
#   git      cloning the source (only without --source-path).
# Installed rather than demanded, like Docker itself: the promise is a fresh
# box. The package names are the same on every supported family.
#
# Here, in preflight, because each one used to fail late and misleadingly:
# without curl, `curl | sh` fed sh an empty script and the Docker step
# "succeeded" with nothing installed; without git, the clone step told the
# operator the repository was private.
ensure_prerequisites() {
    local needed=(openssl) missing=() tool
    command -v docker >/dev/null 2>&1 || needed+=(curl)
    [ -n "$OPT_SOURCE_PATH" ] || needed+=(git)
    for tool in "${needed[@]}"; do
        command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
    done
    [ "${#missing[@]}" -gt 0 ] || return 0

    info "installing missing tools: ${missing[*]}"
    # ca-certificates with them on Debian: a minimal image lacks it as often
    # as it lacks curl, and curl without it cannot fetch anything over https.
    case "$OS_FAMILY" in
        debian) run apt-get update -q && run apt-get install -y -q ca-certificates "${missing[@]}" ;;
        rhel)   run dnf install -y -q "${missing[@]}" ;;
        *)      warn "cannot install ${missing[*]} on this distribution; a real run would stop earlier" ;;
    esac || die "could not install ${missing[*]} with the package manager (see its output above). Install them yourself and re-run."

    [ "$OPT_DRY_RUN" -eq 0 ] || return 0
    for tool in "${missing[@]}"; do
        command -v "$tool" >/dev/null 2>&1 || \
            die "$tool is still missing after installing it. Install $tool yourself and re-run."
    done
}

# Checks the installed docker is new enough, and tells the two failures apart.
#
# `docker version --format '{{.Server.Version}}'` asks the DAEMON, so it prints
# nothing and exits non-zero when the daemon is merely stopped. The previous
# `|| echo 0` collapsed that into the string 0, which then failed the >= 24
# comparison and reported a stopped daemon as "docker 0 is too old" — a claim
# that sent the operator looking for an upgrade they did not need.
check_docker_version() {
    local have=""
    have="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"

    if [ -z "$have" ] && command -v systemctl >/dev/null 2>&1; then
        info "the docker daemon is not answering; trying to start it"
        run systemctl start docker || true
        have="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
    fi

    if [ -z "$have" ]; then
        if [ "$OPT_DRY_RUN" -eq 1 ]; then
            warn "cannot reach the docker daemon; a real run would stop here"
            return 0
        fi
        die "docker is installed but its daemon is not reachable. Start it (systemctl start docker) and re-run; if this is a rootless or remote setup, check DOCKER_HOST."
    fi

    if version_gte "$have" "24"; then
        info "docker $have"
    else
        die "docker $have is too old; this stack needs 24 or newer"
    fi
}

ensure_docker() {
    step 2 "Docker"

    if command -v docker >/dev/null 2>&1; then
        check_docker_version
    else
        info "installing docker via get.docker.com"
        # bash with pipefail, not sh: a pipeline reports its LAST command's
        # status, so a failed download handed sh an empty script, sh ran it,
        # and the step "succeeded" with no Docker installed.
        if ! run bash -c 'set -o pipefail; curl -fsSL https://get.docker.com | sh'; then
            warn "the get.docker.com script failed; trying the distribution's packages instead"
        fi
        if [ "$OPT_DRY_RUN" -eq 0 ] && ! command -v docker >/dev/null 2>&1; then
            install_docker_from_packages
        fi
        run systemctl enable --now docker
        # The fallback above can land docker.io 20.x on an older Debian, so the
        # >= 24 requirement is checked after every install path rather than
        # only for a docker that was already present.
        if [ "$OPT_DRY_RUN" -eq 0 ]; then
            check_docker_version
        fi
    fi

    if [ "$OPT_DRY_RUN" -eq 0 ] && ! docker compose version >/dev/null 2>&1; then
        die "docker compose v2 is required (the 'docker compose' subcommand, not docker-compose)"
    fi
}

# The fallback for when get.docker.com installed nothing. No package name
# works everywhere, so each family gets the names it actually ships (checked
# against the live repositories on 2026-09-23):
#   - docker-compose-plugin exists only in Docker's own repositories;
#   - Ubuntu 22.04 and 24.04 ship the compose v2 plugin as docker-compose-v2;
#   - Debian 13 ships it as docker-compose. Debian 12's docker-compose is the
#     v1 Python tool and its docker.io is 20.10; the checks after this step
#     refuse both by name, which is the most this fallback can do there;
#   - RHEL and its rebuilds ship no Docker at all, so it comes from Docker's
#     CentOS repository, the one Docker documents for them.
# Whatever still fails stops here with what to do, rather than with a raw
# package-manager error and no ERROR line.
install_docker_from_packages() {
    local manual="Install Docker Engine 24 or newer with the compose plugin (https://docs.docker.com/engine/install/), then re-run this installer."
    case "$OS_FAMILY" in
        debian)
            local compose_pkg="docker-compose-v2"
            run apt-get update -q || die "apt-get update failed, so Docker could not be installed. $manual"
            apt-cache show docker-compose-v2 >/dev/null 2>&1 || compose_pkg="docker-compose"
            info "installing docker.io and $compose_pkg from the distribution"
            run apt-get install -y docker.io "$compose_pkg" || \
                die "could not install docker.io and $compose_pkg. $manual"
            ;;
        rhel)
            info "installing Docker CE from Docker's CentOS repository"
            { run dnf install -y dnf-plugins-core \
                && run dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo \
                && run dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin; } || \
                die "could not install Docker CE from Docker's repository. $manual"
            ;;
        *)
            die "Docker could not be installed on this distribution. $manual"
            ;;
    esac
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

# Set by fetch_source to the path it parks the install's .env at, and read by
# restore_parked_env. Empty until a --source-path copy is about to start.
ENV_PARKED_PATH=""

# Puts the parked .env back where the installer expects it.
#
# fetch_source moves the install's live .env aside for the duration of the
# copy. Without this handler an interruption in that window — the SIGHUP an
# `ssh host 'bash install.sh …'` takes when the connection drops, a Ctrl-C, a
# `cp` that ran out of disk — leaves the only copy of the live secrets at the
# parked path, where the next run's guard has to find it.
#
# A no-op once fetch_source's own restore has run (the file is gone), and
# under --dry-run, where `run mv` printed rather than moved and so any file at
# the parked path belongs to some earlier real run.
#
# This is the installer's ONLY trap handler, deliberately: a second
# `trap … EXIT` would silently replace the first, so anything else that needs
# to run on exit belongs in this function rather than in a trap of its own.
restore_parked_env() {
    local rc=$?
    [ "$OPT_DRY_RUN" -eq 1 ] && return "$rc"
    [ -n "$ENV_PARKED_PATH" ] && [ -f "$ENV_PARKED_PATH" ] || return "$rc"
    if mv -f "$ENV_PARKED_PATH" "$SOURCE_DIR/.env"; then
        warn "restored the .env parked during the copy to $SOURCE_DIR/.env"
    else
        warn "could not move $ENV_PARKED_PATH back to $SOURCE_DIR/.env. That file is this install's .env: move it there by hand before re-running."
    fi
    return "$rc"
}

# Sets OPT_REF to the latest release in $REPO_URL. From its tags and not from
# GitHub's API, so PRIZY_REPO_URL can point at anything git can read. git's
# own last line goes into the refusal for the same reason as the clone's below.
resolve_latest_release() {
    local listing
    if ! listing="$(GIT_TERMINAL_PROMPT=0 git ls-remote --tags --refs "$REPO_URL" 2>&1)"; then
        die "cannot read $REPO_URL (git said: ${listing##*$'\n'}). If the repository is private or not yet published, install from a local checkout instead: --source-path /path/to/prizy"
    fi
    OPT_REF="$(printf '%s\n' "$listing" | latest_release_tag)"
    [ -n "$OPT_REF" ] || \
        die "$REPO_URL has no release tag (vX.Y.Z) to install. Pass --ref with the branch or tag to install, or use --source-path."
    info "latest release: $OPT_REF"
}

fetch_source() {
    step 4 "Source"

    # The install's own .env lives in $SOURCE_DIR and holds every secret this
    # instance has. A --source-path run parks it outside the copy's target
    # across the `cp -a` and the strip below, and puts it back afterwards;
    # without that, an upgrade regenerates POSTGRES_PASSWORD against a
    # database that still has the old one.
    #
    # A file sitting at the parked path means a previous run was interrupted
    # between the move and the restore. THAT file is this install's .env;
    # whatever is at $SOURCE_DIR/.env now came from the interrupted copy and
    # is the checkout's. Deciding this BEFORE the branch below, and not inside
    # the --source-path arm, because `cp -a` copies the checkout's .git too:
    # the re-run after an interruption can perfectly well be an update run
    # with no --source-path at all, and that arm never looked here — leaving
    # configure to generate a fresh password against the live database, the
    # same loss by another door.
    local parked had_env=0
    parked="$(parked_env_path)"
    ENV_PARKED_PATH="$parked"
    # One handler, four registrations. Verified on bash 5.2.21 that the EXIT
    # trap alone already runs when an untrapped SIGTERM arrives, so the three
    # signal lines are redundancy plus a defined exit status rather than the
    # only thing standing between a Ctrl-C and a parked .env.
    trap 'restore_parked_env' EXIT
    trap 'restore_parked_env; exit 130' INT
    trap 'restore_parked_env; exit 143' TERM
    trap 'restore_parked_env; exit 129' HUP
    if [ -f "$parked" ]; then
        had_env=1
        warn "found a .env parked by an interrupted run at $parked; that file is this install's .env and is being restored"
    fi

    if [ -n "$OPT_SOURCE_PATH" ]; then
        [ -d "$OPT_SOURCE_PATH" ] || die "--source-path '$OPT_SOURCE_PATH' is not a directory"
        [ -f "$OPT_SOURCE_PATH/docker-compose.prod.yml" ] || \
            die "--source-path '$OPT_SOURCE_PATH' does not look like a Prizy checkout (no docker-compose.prod.yml)"
        info "copying from $OPT_SOURCE_PATH"

        # Nothing to park when a previous run already did it: parking again
        # would move the checkout's .env over the live secrets, which is what
        # made the operator's recovery run the thing that destroyed them.
        if [ "$had_env" -eq 0 ] && [ -f "$SOURCE_DIR/.env" ]; then
            had_env=1
            run mv "$SOURCE_DIR/.env" "$parked"
        fi

        run sh -c "cp -a '$OPT_SOURCE_PATH/.' '$SOURCE_DIR/'"
        # `cp -a src/. dst/` copies the SOURCE directory's own mode onto dst
        # (verified: 0700 -> 0755), undoing what ensure_layout just set and
        # just announced. Put it back.
        run chmod 700 "$SOURCE_DIR"

        # A developer checkout has a .env. It is gitignored, so `git clone`
        # never carries it — but `cp -a` does, and configure() would then read
        # it as "the existing install's .env", where merge_env's existing-wins
        # rule lets development values (APP_ENV=local, APP_DEBUG=true, a dev
        # APP_KEY, REDIS_PASSWORD=null) beat this template's production ones.
        # So it is dropped before configure() ever sees it. The .env-* glob
        # covers .env backups the checkout may carry for the same reason.
        if [ -f "$OPT_SOURCE_PATH/.env" ]; then
            info "not importing the checkout's .env; a production .env is generated instead"
        fi
        # Announced whatever the checkout carries, because the glob is wider
        # than the line above: it also deletes any .env-* file sitting in the
        # source directory, including one an operator left there themselves.
        # The install's own .env is not among them — it is parked across this
        # line — and its backups are written to $PRIZY_ROOT/backups.
        info "removing $SOURCE_DIR/.env and any $SOURCE_DIR/.env-* files; this install's own .env is kept across the copy"
        run sh -c "rm -f '$SOURCE_DIR/.env' '$SOURCE_DIR'/.env-*"

        if [ "$had_env" -eq 1 ]; then
            run mv "$parked" "$SOURCE_DIR/.env"
            # The file is back; nothing left for the handler to restore. Also
            # covers --dry-run, where `run mv` printed and did not move.
            ENV_PARKED_PATH=""
        else
            # Nothing was ever parked in this run either, so the handler's
            # window is already closed; do not leave it pointed at a file
            # that was never written.
            ENV_PARKED_PATH=""
        fi
        return 0
    fi

    # Every other path leaves $SOURCE_DIR/.env alone and parks nothing, so an
    # interrupted earlier run's file goes back here. Before git runs rather
    # than after: a fetch that fails must not leave the secrets parked.
    if [ "$had_env" -eq 1 ]; then
        run mv "$parked" "$SOURCE_DIR/.env"
    fi
    # This arm parks nothing itself, so the handler's window is closed either
    # way: the file is back, or there was never one to restore.
    ENV_PARKED_PATH=""

    # No --ref: the latest release, so `curl … | bash` installs what was
    # released rather than whatever main holds, and the same command re-run
    # later upgrades to the next one. --dry-run reads no repository, as the
    # clone checks below skip theirs, so its plan names the release instead.
    if [ -z "$OPT_REF" ]; then
        if [ "$OPT_DRY_RUN" -eq 1 ]; then
            OPT_REF="<latest release>"
        else
            resolve_latest_release
        fi
    fi

    if [ -d "$SOURCE_DIR/.git" ]; then
        info "updating existing checkout to $OPT_REF"
        run git -C "$SOURCE_DIR" fetch --depth 1 origin "$OPT_REF"
        run git -C "$SOURCE_DIR" checkout --force FETCH_HEAD
        return 0
    fi

    # The remote is empty as of 2026-09-22, so this is the path most likely to
    # fail on a real box. Say why, rather than letting a raw git error land.
    #
    # git's own last line goes into the message, because "private" is only
    # one reason a read fails: DNS, a proxy or a firewall read the same, and
    # blaming the repository for those sent the operator the wrong way.
    # GIT_TERMINAL_PROMPT=0 because a private repository over https otherwise
    # asks for a username on the terminal, and the installer sits there.
    info "cloning $REPO_URL at $OPT_REF"
    if [ "$OPT_DRY_RUN" -eq 0 ]; then
        local git_err
        if ! git_err="$(GIT_TERMINAL_PROMPT=0 git ls-remote --heads "$REPO_URL" 2>&1 >/dev/null)"; then
            die "cannot read $REPO_URL (git said: ${git_err##*$'\n'}). If the repository is private or not yet published, install from a local checkout instead: --source-path /path/to/prizy"
        fi
        if ! GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code "$REPO_URL" "$OPT_REF" >/dev/null 2>&1; then
            die "$REPO_URL has no ref named '$OPT_REF'. Pass an existing tag or branch with --ref, or use --source-path."
        fi
    fi
    run git clone --depth 1 --branch "$OPT_REF" "$REPO_URL" "$SOURCE_DIR"
}

# Set by prompt_for via `printf -v "$var"`, which shellcheck cannot trace back
# to these declarations, hence the disables below (SMTP_HOST itself is read
# directly a few lines down, so it needs none).
SMTP_HOST=""
# shellcheck disable=SC2034
SMTP_PORT=""
# shellcheck disable=SC2034
SMTP_USERNAME=""
# shellcheck disable=SC2034
SMTP_PASSWORD=""
# shellcheck disable=SC2034
SMTP_ENCRYPTION=""

# prompt_for <var> <question> [default] [empty-is-an-answer] [secret]
#
# The fourth argument marks a setting whose empty value is a real answer rather
# than a missing one, so --yes accepts it: .env.production.example documents
# empty MAIL_USERNAME/MAIL_PASSWORD as the auth-less-relay case, and without
# this an unattended run could not express it.
#
# The fifth marks a secret: nothing typed is echoed, and a default is shown as
# a fixed mask instead of itself. A secret's default is the live SMTP password
# on every re-run, and everything printed from the Layout step on is also
# written to the install log — the file an operator pastes into an issue.
prompt_for() {
    local var="$1" question="$2" default="${3:-}" allow_empty="${4:-0}" secret="${5:-0}" answer=""
    if [ "$OPT_YES" -eq 1 ]; then
        if [ -z "$default" ] && [ "$allow_empty" -eq 0 ]; then
            die "--yes was given but $var has no value and no default; set PRIZY_$var (see --help, Environment)"
        fi
        printf -v "$var" '%s' "$default"
        return 0
    fi
    if [ "$secret" -eq 1 ]; then
        # Printed rather than left to `read -p`, as in ask_value: read -p shows
        # nothing when stdin is not a terminal, and a mask nobody can see is a
        # mask nobody can check. Eight asterisks whatever the length, so the
        # mask does not give the length away either.
        if [ -n "$default" ]; then
            printf '    %s [********]: ' "$question" >&2
        else
            printf '    %s: ' "$question" >&2
        fi
        # -s: nothing typed is echoed — nor is Enter, hence the newline after.
        # IFS= keeps edge whitespace, so undotenvable_reason refuses it out
        # loud; read's default trimming quietly saved a different password.
        if ! IFS= read -r -s -u "$PROMPT_FD" answer && [ -z "$answer" ]; then
            printf '\n' >&2
            die "no answer for '$question' (input closed)"
        fi
        printf '\n' >&2
        answer="${answer:-$default}"
    else
        local shown="    $question: "
        [ -z "$default" ] || shown="    $question [$default]: "
        # read fails at end of input, as in ask_value. Unchecked, errexit
        # ended the whole run right here with no ERROR line to say why.
        if ! read -r -u "$PROMPT_FD" -p "$shown" answer && [ -z "$answer" ]; then
            printf '\n' >&2
            die "no answer for '$question' (input closed)"
        fi
        answer="${answer:-$default}"
    fi
    printf -v "$var" '%s' "$answer"
}

# prompt_dotenvable <var> <question> <default> <empty-is-an-answer> <env-key> [secret]
#
# prompt_for, plus the check that the answer is one the .env can carry back out
# unchanged — the same check write_env_file makes, run where the operator can
# still do something about it. Interactively it says why and asks again. Under
# --yes there is nobody to ask, so it is fatal here exactly as it was fatal in
# write_env_file, but with the variable the operator actually set named in the
# message.
#
# Validating here and not only at write time is what makes the refusal
# survivable: write_env_file dies before it writes anything, so a fresh install
# that hit it stopped at step 5 of 8 with no .env on disk at all.
prompt_dotenvable() {
    local var="$1" question="$2" default="${3:-}" allow_empty="${4:-0}" env_key="$5" secret="${6:-0}" reason
    while true; do
        prompt_for "$var" "$question" "$default" "$allow_empty" "$secret"
        reason="$(undotenvable_reason "${!var}")"
        [ -n "$reason" ] || return 0
        [ "$OPT_YES" -eq 1 ] && die "PRIZY_$var $reason. Choose a value without it, or unset PRIZY_$var and write $env_key into $SOURCE_DIR/.env by hand — a value this installer would refuse is never offered back as a prompt default and never overwritten by an empty answer, so later runs leave a hand-written one alone."
        warn "$env_key $reason."
        info "Enter a different value, or leave it empty and write $env_key into $SOURCE_DIR/.env by hand afterwards — an empty answer never overwrites what the file already holds."
        # The refused value is not offered back as the default: accepting it
        # by pressing Enter is the one thing this loop must not allow.
        default=""
    done
}

# unseedable_default <var> <env-key>
#
# Blanks the prompt default in $var when the value it carries is one this .env
# cannot carry back out unchanged, and says why.
#
# The operator who followed the refusal's advice and wrote a `$` password into
# .env by hand would otherwise have it read straight back into the same
# refusal, and every later --mail=smtp run would die at Configuration telling
# them to do what they had already done. Dropping it means pressing Enter
# collects nothing, and write_env_file's rule that an empty collected value
# never overwrites a MAIL_* key leaves the hand-written value alone.
#
# Reaches collect_mail_settings' locals the way set_env_value reaches
# write_env_file's $merged: bash is dynamically scoped, so a called function
# sees and can assign to its caller's locals.
unseedable_default() {
    local var="$1" env_key="$2" reason
    reason="$(undotenvable_reason "${!var}")"
    [ -n "$reason" ] || return 0
    warn "$env_key in $SOURCE_DIR/.env $reason, so it is not offered here as a default; an empty answer leaves it exactly as it is."
    printf -v "$var" '%s' ""
}

collect_mail_settings() {
    case "$OPT_MAIL" in
        log)
            warn "mail is set to 'log': messages are written to the log instead of sent."
            warn "Contact-portal magic-link sign-in, email verification, workspace invitations"
            warn "and CSAT requests will not reach anyone. Re-run with --mail=smtp to fix this."
            ;;
        smtp)
            if [ "$OPT_DRY_RUN" -eq 1 ]; then
                info "DRY-RUN: would prompt for SMTP host, port, username, password and encryption"
                return 0
            fi
            # Three sources, in this order: PRIZY_SMTP_* (the operator said so
            # on this run), then whatever the install's .env already holds,
            # then a fixed default.
            #
            # The middle one is what makes a re-run safe. Without it an
            # operator pressing Enter through prompts that showed no current
            # value collected empty strings, and write_env_file then wrote them
            # over live credentials — mail failures in this application are
            # silent, so nobody would find out until a customer said so.
            local live="$SOURCE_DIR/.env" cur_host cur_port cur_user cur_pass cur_enc
            cur_host="$(env_value_of MAIL_HOST "$live")"
            cur_port="$(env_value_of MAIL_PORT "$live")"
            cur_user="$(env_value_of MAIL_USERNAME "$live")"
            cur_pass="$(env_value_of MAIL_PASSWORD "$live")"
            # Back through mail_scheme_for's mapping, so the prompt offers the
            # operator's own vocabulary rather than Laravel's.
            case "$(env_value_of MAIL_SCHEME "$live")" in
                smtps) cur_enc="ssl" ;;
                smtp)  cur_enc="tls" ;;
                null)  cur_enc="none" ;;
                *)     cur_enc="" ;;
            esac

            unseedable_default cur_host MAIL_HOST
            unseedable_default cur_port MAIL_PORT
            unseedable_default cur_user MAIL_USERNAME
            unseedable_default cur_pass MAIL_PASSWORD

            prompt_dotenvable SMTP_HOST "SMTP host" "${PRIZY_SMTP_HOST:-$cur_host}" 0 MAIL_HOST
            prompt_dotenvable SMTP_PORT "SMTP port" "${PRIZY_SMTP_PORT:-${cur_port:-587}}" 0 MAIL_PORT
            prompt_dotenvable SMTP_USERNAME "SMTP username" "${PRIZY_SMTP_USERNAME:-$cur_user}" 1 MAIL_USERNAME
            prompt_dotenvable SMTP_PASSWORD "SMTP password" "${PRIZY_SMTP_PASSWORD:-$cur_pass}" 1 MAIL_PASSWORD 1
            # Not a dotenv value: mail_scheme_for maps this answer to one of
            # three fixed strings and dies on anything else.
            prompt_for SMTP_ENCRYPTION "SMTP encryption (tls/ssl/none)" "${PRIZY_SMTP_ENCRYPTION:-${cur_enc:-tls}}"
            [ -n "$SMTP_HOST" ] || die "--mail=smtp needs an SMTP host"
            ;;
    esac
}

# Replaces the line beginning "$1=" in the file-scoped $merged with "$1=$2".
# Hoisted to file scope (rather than nested inside write_env_file, which is
# where it is only ever called from) so it reads as an ordinary top-level
# function to shellcheck; bash's dynamic scoping means it still sees and
# mutates write_env_file's local $merged either way.
set_env_value() {
    # The value travels through the environment rather than `awk -v v=...`,
    # because awk processes escape sequences in a -v assignment. Verified on
    # this machine: the five characters `pa\ts` passed with -v come out as
    # `pa`, a real tab, `s`, and `\\` comes out as a single backslash — so an
    # SMTP password containing either was silently written as a different
    # password. ENVIRON is taken byte-for-byte; same inputs, same output.
    merged="$(printf '%s' "$merged" | SET_ENV_VALUE="$2" awk -v k="$1" \
        'index($0, k "=") == 1 { print k "=" ENVIRON["SET_ENV_VALUE"]; next } { print }')"
}

# Prints why $1 cannot be written to this .env unchanged, or nothing when it
# can. The text completes the sentence "<KEY> ...".
#
# Values here are written UNQUOTED. Quoting them is not the fix: merge_env
# preserves every existing value byte-for-byte and has no unquoting step, so
# quotes added on write would be read back as part of the value and wrapped
# again on the next upgrade. Refusing is, and these are the three cases:
#
#   $  — Compose's dotenv parser expands it as an interpolation. This is the
#        same hazard gen_secret_for's comment cites as the reason generated
#        secrets are hex.
#   whitespace — merge_env's own specification (see its header) is that
#        Compose trims whitespace from a value's edges, so a password with a
#        leading or trailing space is read back as a different password. The
#        check refuses whitespace anywhere rather than at the edges only,
#        because .env.production.example's header records that Compose also
#        strips an inline `# comment` when a value precedes it on the line,
#        and a value holding both a space and a `#` risks being truncated
#        there. (A `#` on its own is safe, and stays allowed — the merge
#        tests above round-trip `p=a#ss/w+rd==`.)
#   a leading or trailing quote — written unquoted, `"abc` produces
#        MAIL_PASSWORD="abc, which Compose's dotenv parser reads as an
#        unterminated quoted value and refuses, taking the whole stack down
#        with a parse error; and `"abc"` is unquoted back to abc, a different
#        password. An interior quote is neither and stays allowed.
undotenvable_reason() {
    case "$1" in
        *'$'*)
            printf "cannot contain '\$': Compose's dotenv parser would read it as an interpolation" ;;
        *[[:space:]]*)
            printf "cannot contain whitespace: Compose's dotenv parser trims it from a value's edges" ;;
        '"'*|"'"*|*'"'|*"'")
            printf "cannot start or end with a quote: Compose's dotenv parser reads a fully quoted value as the text inside the quotes, and an unbalanced one as an unterminated value it refuses to parse at all" ;;
    esac
}

# Stops the install rather than writing a credential that quietly becomes a
# different credential. The last resort: collect_mail_settings validates the
# same values as they are typed, where the operator can still fix them.
reject_undotenvable() {
    local reason
    reason="$(undotenvable_reason "$2")"
    [ -z "$reason" ] || die "$1 $reason. Choose a value without it, or leave this setting empty and write $1 into $SOURCE_DIR/.env by hand — a value this installer would refuse is never offered back as a prompt default and never overwritten by an empty answer, so later runs leave a hand-written one alone."
}

# Laravel 13 names this MAIL_SCHEME (null|smtp|smtps), not MAIL_ENCRYPTION —
# verified against config/mail.php and .env.example. Maps the operator's
# tls/ssl/none answer into the caller's $mail_scheme. A plain case, not a
# $(...) substitution: die() calls exit, which a subshell would swallow,
# letting an invalid scheme through silently instead of stopping the install.
mail_scheme_for() {
    case "$1" in
        ssl)  mail_scheme="smtps" ;;
        tls)  mail_scheme="smtp" ;;
        none) mail_scheme="null" ;;
        *)    die "SMTP encryption must be tls, ssl or none (got '$1')" ;;
    esac
}

# Writes a complete .env at $1 from the template at $2, backing up any existing
# $1 into the directory $3 (default: alongside $1).
#
# Split out from `configure` and taking the paths explicitly so the test suite
# can drive it against a temporary directory. The ordering matters and is the
# whole point: merge FIRST (existing non-empty values win), then fill only what
# is still empty. Doing it the other way round would generate a new password
# and then "preserve" it over the live one.
write_env_file() {
    local dest="$1" template="$2" backup_dir="${3:-}" merged key value mail_scheme
    [ -n "$backup_dir" ] || backup_dir="$(dirname "$dest")"

    if [ -f "$dest" ]; then
        local backup stamp n=0
        mkdir -p "$backup_dir"
        # `date +%...S` has one-second resolution and two runs a second apart
        # are ordinary (the test suite alone produces several), so the stamp
        # alone silently overwrote the older backup. Take the first free name
        # instead of trusting the clock.
        stamp="$(date +%Y%m%d%H%M%S)"
        backup="$backup_dir/$(basename "$dest")-$stamp"
        while [ -e "$backup" ]; do
            n=$((n + 1))
            backup="$backup_dir/$(basename "$dest")-$stamp.$n"
        done
        cp "$dest" "$backup"
        chmod 600 "$backup"
        info "backed up the existing .env to $backup"
    fi

    merged="$(merge_env "$dest" "$template")"

    for key in "${SECRET_KEYS[@]}"; do
        # The literal string `null` counts as unset HERE ONLY. A four-character
        # secret is never one an operator meant, and it is what a development
        # .env carries for REDIS_PASSWORD — non-empty, so it wins the merge and
        # satisfies the compose `:?` guard, and Redis then starts with
        # `--requirepass null`. Deliberately not generalised past SECRET_KEYS:
        # .env.example uses `null` legitimately for MAIL_USERNAME/MAIL_PASSWORD.
        if printf '%s' "$merged" | grep -qxE "${key}=(null)?"; then
            value="$(gen_secret_for "$key")"
            merged="$(printf '%s' "$merged" | awk -v k="$key" -v v="$value" \
                '$0 == k "=" || $0 == k "=null" { print k "=" v; next } { print }')"
        fi
    done

    set_env_value APP_URL "https://${OPT_DOMAIN}"
    set_env_value APP_BASE_DOMAIN "$OPT_DOMAIN"
    set_env_value ACME_EMAIL "$OPT_EMAIL"
    set_env_value HTTP_PORT "$OPT_HTTP_PORT"
    set_env_value HTTPS_PORT "$OPT_HTTPS_PORT"

    if [ "$OPT_MAIL" = "smtp" ]; then
        # Defended here too, not just in collect_mail_settings: write_env_file
        # is what scripts/test-install.sh drives directly, and this is the
        # guarantee the brief asked for — --mail=smtp can never leave
        # MAIL_HOST empty, whichever caller reaches this function.
        [ -n "$SMTP_HOST" ] || die "--mail=smtp needs an SMTP host (SMTP_HOST is empty)"
        mail_scheme_for "$SMTP_ENCRYPTION"
        reject_undotenvable MAIL_HOST "$SMTP_HOST"
        reject_undotenvable MAIL_PORT "$SMTP_PORT"
        reject_undotenvable MAIL_USERNAME "$SMTP_USERNAME"
        reject_undotenvable MAIL_PASSWORD "$SMTP_PASSWORD"
        set_env_value MAIL_MAILER smtp
        set_env_value MAIL_SCHEME "$mail_scheme"
        set_env_value MAIL_HOST "$SMTP_HOST"
        # An EMPTY collected value never overwrites: merge_env has already
        # preserved whatever the live .env held, and blanking it here would
        # undo that for the three keys a re-run is most likely to leave
        # unanswered. MAIL_HOST is exempt because it is guarded non-empty
        # above, and MAIL_SCHEME because mail_scheme_for only ever yields one
        # of three fixed strings.
        if [ -n "$SMTP_PORT" ];     then set_env_value MAIL_PORT "$SMTP_PORT"; fi
        if [ -n "$SMTP_USERNAME" ]; then set_env_value MAIL_USERNAME "$SMTP_USERNAME"; fi
        if [ -n "$SMTP_PASSWORD" ]; then set_env_value MAIL_PASSWORD "$SMTP_PASSWORD"; fi
        set_env_value MAIL_FROM_ADDRESS "$OPT_EMAIL"
    fi

    if [ "$OPT_WITH_REALTIME" -eq 1 ]; then
        set_env_value BROADCAST_CONNECTION reverb
    fi

    printf '%s\n' "$merged" > "$dest"
    chmod 600 "$dest"
}

configure() {
    step 5 "Configuration"
    collect_mail_settings
    if [ "$OPT_DRY_RUN" -eq 1 ]; then
        info "DRY-RUN: would write $SOURCE_DIR/.env for $OPT_DOMAIN, generating ${#SECRET_KEYS[@]} secrets"
        return 0
    fi
    # Third argument: $PRIZY_ROOT/backups is the directory ensure_layout
    # creates and the layout message advertises, so .env backups belong there
    # rather than beside the file. Keeping them out of $SOURCE_DIR also means
    # fetch_source's .env-* strip can only ever delete a checkout's own files.
    write_env_file "$SOURCE_DIR/.env" "$SOURCE_DIR/.env.production.example" "$PRIZY_ROOT/backups"
    info "wrote $SOURCE_DIR/.env (mode 0600)"
}

# Resolves $1 to its first A record on stdout, or nothing if it doesn't
# resolve. getent when available; dig +short A as the fallback check_dns's
# own availability guard already advertises but, until now, never actually
# ran — on a box with dig and no getent that guard let execution reach a
# plain `getent` call that doesn't exist, so every lookup silently came back
# empty and a real DNS record was reported as missing. The grep on the dig
# path is deliberate: `dig +short A` prints any CNAME hops before the final
# address, so a bare `head -n1` there would hand back a hostname instead of
# an IP on a domain with a CNAME layer.
resolve_a() {
    if command -v getent >/dev/null 2>&1; then
        getent ahostsv4 "$1" 2>/dev/null | awk 'NR==1 {print $1}'
    else
        dig +short A "$1" 2>/dev/null | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | head -n1
    fi
}

# On-demand TLS asks a CA for a certificate the first time a hostname is
# requested, so BOTH records must exist. This warns rather than blocks by
# default: operators routinely install while DNS is still propagating, and a
# fatal check there wastes a working install.
check_dns() {
    step 6 "DNS"

    if ! command -v getent >/dev/null 2>&1 && ! command -v dig >/dev/null 2>&1; then
        warn "no getent or dig available; skipping the DNS check"
        return 0
    fi

    local public_ip resolved wildcard_probe wildcard_resolved problem=0
    public_ip="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo '')"
    resolved="$(resolve_a "$OPT_DOMAIN" || echo '')"
    wildcard_probe="dns-check-$(openssl rand -hex 4).${OPT_DOMAIN}"
    wildcard_resolved="$(resolve_a "$wildcard_probe" || echo '')"

    if [ -z "$resolved" ]; then
        warn "$OPT_DOMAIN does not resolve. Add an A record pointing at this machine."
        problem=1
    elif [ -n "$public_ip" ] && [ "$resolved" != "$public_ip" ]; then
        warn "$OPT_DOMAIN resolves to $resolved but this machine appears to be $public_ip."
        problem=1
    else
        info "$OPT_DOMAIN resolves to $resolved"
    fi

    if [ -z "$wildcard_resolved" ]; then
        warn "*.$OPT_DOMAIN does not resolve (probed $wildcard_probe)."
        warn "Every workspace lives at a subdomain, so without the wildcard A record"
        warn "no workspace will ever get a certificate and none will be reachable."
        problem=1
    else
        info "*.$OPT_DOMAIN resolves to $wildcard_resolved"
    fi

    if [ "$problem" -eq 1 ]; then
        if [ "$OPT_REQUIRE_DNS" -eq 1 ]; then
            die "DNS is not ready and --require-dns was given"
        fi
        warn "continuing anyway; certificates will be issued once DNS is correct"
    fi
}

compose_cmd() {
    printf 'docker compose -f docker-compose.prod.yml'
    if [ "$OPT_WITH_REALTIME" -eq 1 ]; then
        printf ' --profile realtime'
    fi
}

deploy() {
    step 7 "Build and start"

    # VITE_* are baked into the JS bundle at BUILD time, so they must be in the
    # build's environment, not the container's. They are read from .env for the
    # server side, but the browser side can only come through here. Without
    # --with-realtime they stay unset, which is what keeps the frontend polling.
    local build_env=()
    if [ "$OPT_WITH_REALTIME" -eq 1 ]; then
        local reverb_key
        if [ "$OPT_DRY_RUN" -eq 1 ]; then
            reverb_key="<generated>"
        else
            reverb_key="$(grep '^REVERB_APP_KEY=' "$SOURCE_DIR/.env" | head -n1 | cut -d= -f2-)"
            [ -n "$reverb_key" ] || die "--with-realtime needs REVERB_APP_KEY in .env, which configuration should have generated"
        fi
        build_env=(
            "VITE_REVERB_APP_KEY=$reverb_key"
            "VITE_REVERB_HOST=$OPT_DOMAIN"
            "VITE_REVERB_PORT=$OPT_HTTPS_PORT"
            "VITE_REVERB_SCHEME=https"
        )
        info "real-time enabled: compiling the WebSocket client for $OPT_DOMAIN"
    fi

    info "building the production image (this takes a few minutes on first install)"
    # ${build_env[*]} is deliberate word-splitting of KEY=VALUE pairs into
    # separate words for `env`, not array-into-string interpolation; safe
    # unquoted here because every value is domain/port/hex with no spaces.
    run sh -c "cd '$SOURCE_DIR' && env ${build_env[*]} $(compose_cmd) build"

    # `up -d --wait` is the whole deploy: the one-shot migrate service runs
    # before app/web start, and every long-running service has a real health
    # probe, so this returns only once the stack is genuinely serving.
    info "starting the stack (migrate runs first, then app and web)"
    run sh -c "cd '$SOURCE_DIR' && $(compose_cmd) up -d --wait"
}

# deploy() ran `up -d --wait`, which returns only once every service has passed
# its own healthcheck — including the web container's, which is
# `wget -qO- http://127.0.0.1:2020/health` (Dockerfile.prod). So arriving here
# IS the verification that the stack is serving, and this step says so instead
# of inventing a second, weaker one.
#
# The probe below repeats that same request by hand, for a line in the log an
# operator can read. It has to run INSIDE the container: /health is routed only
# on Caddy's :2020 listener (docker/prod/Caddyfile), which is deliberately
# never published, and the public site address defaults to `https://`, so the
# host's published HTTP port carries nothing but the ACME challenge handler.
# Probing 127.0.0.1:$OPT_HTTP_PORT from the host, as this step used to, could
# therefore never answer — it warned on every successful install.
verify_health() {
    local probe
    probe="cd '$SOURCE_DIR' && $(compose_cmd) exec -T web wget -qO- http://127.0.0.1:2020/health"

    if [ "$OPT_DRY_RUN" -eq 1 ]; then
        run sh -c "$probe"
        return 0
    fi

    info "every service passed its healthcheck, so the stack is already serving"
    if sh -c "$probe" >/dev/null 2>&1; then
        info "/health answered inside the web container"
    else
        warn "could not re-run the /health probe inside the web container. The stack is"
        warn "up — every healthcheck passed — but this check did not; look at"
        warn "  cd $SOURCE_DIR && $(compose_cmd) ps"
    fi
}

report() {
    step 8 "Ready"

    verify_health

    # /signup and NOT the bare domain: routes/web.php:19 serves / through the
    # tenant middleware with no exemption, and the tenant finder resolves no
    # tenant when the Host equals APP_BASE_DOMAIN, so https://<domain>/ raises
    # NoCurrentTenant and answers 500. /signup is exempt (routes/web.php:25).
    # The first thing an operator sees must not be a stack trace.
    printf '\n\033[0;32mPrizy is installed.\033[0m\n\n'
    printf '    Open \033[1mhttps://%s/signup\033[0m and create your first workspace.\n\n' "$OPT_DOMAIN"
    printf '    Source and configuration: %s\n' "$SOURCE_DIR"
    printf '    Logs:    cd %s && %s logs -f\n' "$SOURCE_DIR" "$(compose_cmd)"
    printf '    Upgrade: re-run this installer\n\n'

    if [ "$OPT_MAIL" = "log" ]; then
        warn "mail is set to 'log' — no email leaves this machine. See --mail=smtp."
    fi
    if [ "$OPT_WITH_REALTIME" -eq 0 ]; then
        info "real-time is off; the interface polls. Re-run with --with-realtime to enable it."
    fi
}

main() {
    parse_args "$@"
    open_prompt_input
    resolve_required
    preflight
    ensure_docker
    ensure_layout
    fetch_source
    configure
    check_dns
    deploy
    report
}

# Only run when executed, never when sourced — this is what makes the library
# above unit-testable.
#
# Piped into bash (`curl … | bash`), the script has no file: BASH_SOURCE is
# empty, and under set -u a bare ${BASH_SOURCE[0]} stopped the run right here.
# A sourced script always has a name there, even one read through a pipe
# (`source <(…)` gives /dev/fd/63), so an empty BASH_SOURCE means executed.
if [ -z "${BASH_SOURCE[0]:-}" ] || [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
