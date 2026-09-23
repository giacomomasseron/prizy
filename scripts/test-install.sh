#!/usr/bin/env bash
# Unit tests for the pure functions in scripts/install.sh.
#
# The installer sources cleanly (its `main` is guarded by a BASH_SOURCE check),
# so these call its functions directly rather than driving a whole install.
# What cannot be unit-tested — installing Docker, cloning, `compose up` — is
# covered by --dry-run assertions in a later task and by a real VM by hand.
#
# Usage: bash scripts/test-install.sh
set -euo pipefail

FAILED=0
SKIPPED=0

log()  { printf '\033[0;34m==>\033[0m %s\n' "$1"; }
pass() { printf '  \033[0;32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[0;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }
# A third outcome, for the two checks that need something this machine may not
# have (working DNS, dig). Reported, and counted in the closing line, so an
# unrunnable check is visible rather than passing quietly.
skip() { printf '  \033[0;33mskip\033[0m %s\n' "$1"; SKIPPED=$((SKIPPED + 1)); }

assert_eq() {
    local description="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        pass "$description"
    else
        fail "$description (expected '$expected', got '$actual')"
    fi
}

# Sourcing must not run the installer.
# shellcheck source=scripts/install.sh
source "$(dirname "$0")/install.sh"

log "OS family detection"
assert_eq "Ubuntu is the debian family" "debian" \
    "$(printf 'ID=ubuntu\nID_LIKE=debian\n' | detect_os_family)"
assert_eq "Debian itself is the debian family" "debian" \
    "$(printf 'ID=debian\n' | detect_os_family)"
assert_eq "Rocky is the rhel family" "rhel" \
    "$(printf 'ID="rocky"\nID_LIKE="rhel centos fedora"\n' | detect_os_family)"
assert_eq "Fedora is the rhel family" "rhel" \
    "$(printf 'ID=fedora\n' | detect_os_family)"
assert_eq "Alpine is refused, not guessed at" "unsupported" \
    "$(printf 'ID=alpine\n' | detect_os_family)"
assert_eq "an empty os-release is refused" "unsupported" \
    "$(printf '' | detect_os_family)"

log "Version comparison"
if version_gte "24.0.7" "24"; then pass "24.0.7 satisfies >= 24"; else fail "24.0.7 satisfies >= 24"; fi
if version_gte "27.1.1" "24"; then pass "27.1.1 satisfies >= 24"; else fail "27.1.1 satisfies >= 24"; fi
if version_gte "24" "24"; then pass "24 satisfies >= 24"; else fail "24 satisfies >= 24"; fi
if version_gte "23.0.1" "24"; then fail "23.0.1 does NOT satisfy >= 24"; else pass "23.0.1 does NOT satisfy >= 24"; fi
# Lexical comparison would call 9.9 newer than 24; sort -V must not.
if version_gte "9.9" "24"; then fail "9.9 does NOT satisfy >= 24 (not a string compare)"; else pass "9.9 does NOT satisfy >= 24 (not a string compare)"; fi

log "Input validation"
if validate_domain "example.com"; then pass "example.com is a domain"; else fail "example.com is a domain"; fi
if validate_domain "my-prizy.co.uk"; then pass "my-prizy.co.uk is a domain"; else fail "my-prizy.co.uk is a domain"; fi
if validate_domain "localhost"; then fail "a single label is not a domain"; else pass "a single label is not a domain"; fi
if validate_domain "https://example.com"; then fail "a URL is not a domain"; else pass "a URL is not a domain"; fi
if validate_domain "exam ple.com"; then fail "a domain cannot contain a space"; else pass "a domain cannot contain a space"; fi
if validate_email "ops@example.com"; then pass "ops@example.com is an email"; else fail "ops@example.com is an email"; fi
if validate_email "ops@localhost"; then fail "an address with no TLD is refused"; else pass "an address with no TLD is refused"; fi
if validate_email "not-an-email"; then fail "a bare word is not an email"; else pass "a bare word is not an email"; fi

log "Secret generation"
key_a="$(gen_secret_for APP_KEY || true)"
key_b="$(gen_secret_for APP_KEY || true)"
case "$key_a" in
    base64:*) pass "APP_KEY carries the base64: prefix Laravel requires" ;;
    *)        fail "APP_KEY carries the base64: prefix Laravel requires" ;;
esac
if [ "$key_a" != "$key_b" ]; then
    pass "two APP_KEYs differ (not a constant)"
else
    fail "two APP_KEYs differ (not a constant)"
fi
pw="$(gen_secret_for POSTGRES_PASSWORD || true)"
if [ "${#pw}" -ge 32 ]; then
    pass "a generated password is at least 32 characters"
else
    fail "a generated password is at least 32 characters (got ${#pw})"
fi
# A password containing $ or # would be re-read by Compose's dotenv parser as
# an interpolation or a comment; hex cannot.
if printf '%s' "$pw" | grep -qE '^[0-9a-f]+$'; then
    pass "a generated password is hex, so no dotenv metacharacters"
else
    fail "a generated password is hex, so no dotenv metacharacters"
fi

log "The .env merge — an existing value must survive a re-run"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/template" <<'TPL'
# A comment that must survive.
APP_NAME=Prizy
# GENERATED
APP_KEY=
POSTGRES_PASSWORD=
NEW_KEY_ADDED_BY_UPGRADE=default-value
TPL

cat > "$TMP/existing" <<'EXI'
APP_NAME=Prizy
APP_KEY=base64:LIVE_KEY_DO_NOT_TOUCH
POSTGRES_PASSWORD=live-database-password
OPERATOR_ADDED=keep-me
EXI

merged="$(merge_env "$TMP/existing" "$TMP/template" || true)"

if printf '%s' "$merged" | grep -qx 'POSTGRES_PASSWORD=live-database-password'; then
    pass "a live POSTGRES_PASSWORD survives the merge"
else
    fail "a live POSTGRES_PASSWORD survives the merge"
fi
if printf '%s' "$merged" | grep -qx 'APP_KEY=base64:LIVE_KEY_DO_NOT_TOUCH'; then
    pass "a live APP_KEY survives the merge"
else
    fail "a live APP_KEY survives the merge"
fi
if printf '%s' "$merged" | grep -qx 'NEW_KEY_ADDED_BY_UPGRADE=default-value'; then
    pass "a key new in the template is added with its default"
else
    fail "a key new in the template is added with its default"
fi
if printf '%s' "$merged" | grep -qx 'OPERATOR_ADDED=keep-me'; then
    pass "a key the operator added survives the merge"
else
    fail "a key the operator added survives the merge"
fi
if printf '%s' "$merged" | grep -q '^# A comment that must survive.$'; then
    pass "the template's comments survive the merge"
else
    fail "the template's comments survive the merge"
fi
assert_eq "no key is emitted twice" "1" \
    "$(printf '%s' "$merged" | grep -c '^POSTGRES_PASSWORD=')"

log "The .env merge — a fresh install fills from the template"
merged_fresh="$(merge_env "$TMP/does-not-exist" "$TMP/template" || true)"
if printf '%s' "$merged_fresh" | grep -qx 'POSTGRES_PASSWORD='; then
    pass "with no existing file, a GENERATED key stays empty for the caller to fill"
else
    fail "with no existing file, a GENERATED key stays empty for the caller to fill"
fi

log "The .env merge — an EMPTY existing value is not treated as a real value"
printf 'POSTGRES_PASSWORD=\n' > "$TMP/empty-existing"
merged_empty="$(merge_env "$TMP/empty-existing" "$TMP/template" || true)"
if printf '%s' "$merged_empty" | grep -qx 'POSTGRES_PASSWORD='; then
    pass "an empty existing value does not win over the template"
else
    fail "an empty existing value does not win over the template"
fi

log "The .env merge — values containing = and # are preserved whole"
printf 'MAIL_PASSWORD=p=a#ss/w+rd==\n' > "$TMP/tricky"
merged_tricky="$(merge_env "$TMP/tricky" "$TMP/template" || true)"
if printf '%s' "$merged_tricky" | grep -qx 'MAIL_PASSWORD=p=a#ss/w+rd=='; then
    pass "a value containing = and # round-trips unchanged"
else
    fail "a value containing = and # round-trips unchanged"
fi

log "The .env merge — parsed the way Compose's own dotenv parser parses it"
# Compose trims whitespace around the =, so an existing line saved with
# stray spaces (a hand-edited .env) must still be recognised under its
# canonical, unpadded key rather than being lost under a key with a
# trailing space that the template never matches.
printf 'POSTGRES_PASSWORD = live-database-password\n' > "$TMP/padded-existing"
merged_padded="$(merge_env "$TMP/padded-existing" "$TMP/template" || true)"
if printf '%s' "$merged_padded" | grep -qx 'POSTGRES_PASSWORD=live-database-password'; then
    pass "a space-padded KEY = value survives the merge under its canonical key"
else
    fail "a space-padded KEY = value survives the merge under its canonical key"
fi

# Compose strips a trailing \r, so a .env saved with CRLF line endings (an
# editor default on Windows) must not glue a literal \r onto every
# preserved value on every re-run.
printf 'POSTGRES_PASSWORD=live-database-password\r\n' > "$TMP/crlf-existing"
merged_crlf="$(merge_env "$TMP/crlf-existing" "$TMP/template" || true)"
if printf '%s' "$merged_crlf" | grep -qx 'POSTGRES_PASSWORD=live-database-password'; then
    pass "a CRLF existing file's value arrives without a trailing CR"
else
    fail "a CRLF existing file's value arrives without a trailing CR"
fi

# A whitespace-only value trims to empty under Compose's rules, so it must
# fall through to the template exactly like a truly empty value does — not
# "win" the merge as if it were a real secret.
printf 'POSTGRES_PASSWORD=   \n' > "$TMP/whitespace-only-existing"
merged_ws="$(merge_env "$TMP/whitespace-only-existing" "$TMP/template" || true)"
if printf '%s' "$merged_ws" | grep -qx 'POSTGRES_PASSWORD='; then
    pass "a whitespace-only existing value falls through to the template"
else
    fail "a whitespace-only existing value falls through to the template"
fi

log "Argument parsing and --dry-run"
INSTALL_SH="$(dirname "$0")/install.sh"

# --dry-run must be safe to run as an ordinary user on a developer's machine:
# it is the only end-to-end path the test suite can drive. PRIZY_ROOT is
# overridable specifically so this can point at a directory this test can
# actually write to: real /data is root-owned, so on a non-root box a broken
# `run` gate would fail with Permission denied rather than creating anything,
# letting a before/after comparison against /data/prizy pass whether the gate
# works or not. A `mktemp -d` under the suite's own $TMP (already cleaned up
# by the trap above) has no such blind spot — this user can always write to it.
fake_prizy_root="$(mktemp -d -p "$TMP")"
dry_out="$(PRIZY_ROOT="$fake_prizy_root" bash "$INSTALL_SH" --dry-run --domain example.com --email ops@example.com --mail=log 2>&1 || true)"

if printf '%s' "$dry_out" | grep -q 'DRY-RUN'; then
    pass "--dry-run announces what it would do"
else
    fail "--dry-run announces what it would do"
fi
if [ -z "$(ls -A "$fake_prizy_root" 2>/dev/null)" ]; then
    pass "--dry-run did not write into PRIZY_ROOT"
else
    fail "--dry-run did not write into PRIZY_ROOT"
fi

bad_domain_rc=0
bash "$INSTALL_SH" --dry-run --domain "not a domain" --email ops@example.com --mail=log >/dev/null 2>&1 || bad_domain_rc=$?
if [ "$bad_domain_rc" -ne 0 ]; then
    pass "an invalid --domain is refused"
else
    fail "an invalid --domain is refused"
fi

bad_email_rc=0
bash "$INSTALL_SH" --dry-run --domain example.com --email nope --mail=log >/dev/null 2>&1 || bad_email_rc=$?
if [ "$bad_email_rc" -ne 0 ]; then
    pass "an invalid --email is refused"
else
    fail "an invalid --email is refused"
fi

both_sources_rc=0
# A valid checkout (this repo itself), not /tmp: /tmp has no
# docker-compose.prod.yml, so fetch_source's own --source-path validation
# would refuse it independently of --ref/--source-path being mutually
# exclusive, masking a removed guard behind an unrelated nonzero exit.
bash "$INSTALL_SH" --dry-run --domain example.com --email ops@example.com --mail=log \
    --ref main --source-path "$(dirname "$0")/.." >/dev/null 2>&1 || both_sources_rc=$?
if [ "$both_sources_rc" -ne 0 ]; then
    pass "--ref and --source-path together are refused as ambiguous"
else
    fail "--ref and --source-path together are refused as ambiguous"
fi

if bash "$INSTALL_SH" --help >/dev/null 2>&1; then
    pass "--help exits 0"
else
    fail "--help exits 0"
fi

log "Generated .env"
GEN_TMP="$(mktemp -d)"
cp "$(dirname "$0")/../.env.production.example" "$GEN_TMP/.env.production.example"
touch "$GEN_TMP/docker-compose.prod.yml"

# write_env_file is called with an explicit destination so it can be driven
# here without a real install.
OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="log"
OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
# write_env_file itself never reads these; set for parity with a real run.
# shellcheck disable=SC2034
SMTP_HOST=""
# shellcheck disable=SC2034
SMTP_PORT=""
# shellcheck disable=SC2034
SMTP_USERNAME=""
# shellcheck disable=SC2034
SMTP_PASSWORD=""
# shellcheck disable=SC2034
SMTP_ENCRYPTION=""
write_env_file "$GEN_TMP/.env" "$GEN_TMP/.env.production.example"

for key in APP_KEY POSTGRES_PASSWORD PRIZY_APP_DB_PASSWORD REDIS_PASSWORD \
           REVERB_APP_ID REVERB_APP_KEY REVERB_APP_SECRET ACME_EMAIL; do
    value="$(grep "^${key}=" "$GEN_TMP/.env" | head -n1 | cut -d= -f2- || true)"
    if [ -n "$value" ]; then
        pass "$key is filled in the generated .env"
    else
        fail "$key is filled in the generated .env"
    fi
done

assert_eq "APP_BASE_DOMAIN is the operator's domain" "example.com" \
    "$(grep '^APP_BASE_DOMAIN=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "APP_URL is https on that domain" "https://example.com" \
    "$(grep '^APP_URL=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "ACME_EMAIL is the operator's address" "ops@example.com" \
    "$(grep '^ACME_EMAIL=' "$GEN_TMP/.env" | cut -d= -f2-)"

# The guard added in P-3 rejects empty and unset alike, so a generated .env
# that leaves ACME_EMAIL blank would stop the deploy.
if grep -qE '^[A-Z_]+= *#' "$GEN_TMP/.env"; then
    fail "no key in the generated .env has a comment as its value"
else
    pass "no key in the generated .env has a comment as its value"
fi

log "SMTP mail settings are written under --mail=smtp"
OPT_MAIL="smtp"
SMTP_HOST="smtp.example.com"; SMTP_PORT="2525"; SMTP_USERNAME="postmaster"
SMTP_PASSWORD="s3cret"; SMTP_ENCRYPTION="tls"
write_env_file "$GEN_TMP/.env" "$GEN_TMP/.env.production.example"

assert_eq "MAIL_MAILER is smtp" "smtp" \
    "$(grep '^MAIL_MAILER=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_SCHEME is filled from the collected encryption" "smtp" \
    "$(grep '^MAIL_SCHEME=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_HOST is the collected SMTP host" "smtp.example.com" \
    "$(grep '^MAIL_HOST=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_PORT is the collected SMTP port" "2525" \
    "$(grep '^MAIL_PORT=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_USERNAME is the collected SMTP username" "postmaster" \
    "$(grep '^MAIL_USERNAME=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_PASSWORD is the collected SMTP password" "s3cret" \
    "$(grep '^MAIL_PASSWORD=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_FROM_ADDRESS is the operator's address under smtp" "ops@example.com" \
    "$(grep '^MAIL_FROM_ADDRESS=' "$GEN_TMP/.env" | cut -d= -f2-)"

log "SMTP encryption maps to Laravel's MAIL_SCHEME, not MAIL_ENCRYPTION"
for pair in "ssl:smtps" "tls:smtp" "none:null"; do
    enc="${pair%%:*}"
    want="${pair##*:}"
    SMTP_ENCRYPTION="$enc"
    write_env_file "$GEN_TMP/.env" "$GEN_TMP/.env.production.example"
    assert_eq "SMTP encryption '$enc' maps to MAIL_SCHEME '$want'" "$want" \
        "$(grep '^MAIL_SCHEME=' "$GEN_TMP/.env" | cut -d= -f2-)"
done
SMTP_ENCRYPTION="tls"

log "An invalid SMTP encryption answer is refused, not written"
SMTP_ENCRYPTION="rot13"
invalid_enc_rc=0
( write_env_file "$GEN_TMP/.env" "$GEN_TMP/.env.production.example" ) >/dev/null 2>&1 || invalid_enc_rc=$?
if [ "$invalid_enc_rc" -ne 0 ]; then
    pass "an invalid SMTP encryption answer is refused"
else
    fail "an invalid SMTP encryption answer is refused"
fi
SMTP_ENCRYPTION="tls"

log "--mail=smtp can never leave MAIL_HOST empty"
SMTP_HOST=""
empty_host_rc=0
( write_env_file "$GEN_TMP/.env" "$GEN_TMP/.env.production.example" ) >/dev/null 2>&1 || empty_host_rc=$?
if [ "$empty_host_rc" -ne 0 ]; then
    pass "--mail=smtp with an empty SMTP host is refused"
else
    fail "--mail=smtp with an empty SMTP host is refused"
fi

log "PRIZY_SMTP_* environment fallbacks satisfy --yes --mail=smtp"
# Mirrors the PRIZY_DOMAIN/PRIZY_EMAIL/PRIZY_MAIL fallback shape in
# parse_args. Without this, --yes --mail=smtp dies inside prompt_for because
# SMTP_HOST has no default — the one path the spec requires for unattended
# runs. Isolated in a subshell so none of these overrides leak into the rest
# of the suite (collect_mail_settings itself is what's under test here, not
# write_env_file).
if (
    OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    PRIZY_SMTP_HOST="smtp.env.example"; PRIZY_SMTP_PORT="2526"
    PRIZY_SMTP_USERNAME="envuser"; PRIZY_SMTP_PASSWORD="envpass"
    PRIZY_SMTP_ENCRYPTION="ssl"
    collect_mail_settings
    [ "$SMTP_HOST" = "smtp.env.example" ] && [ "$SMTP_PORT" = "2526" ] && \
        [ "$SMTP_USERNAME" = "envuser" ] && [ "$SMTP_PASSWORD" = "envpass" ] && \
        [ "$SMTP_ENCRYPTION" = "ssl" ]
); then
    pass "--yes --mail=smtp uses PRIZY_SMTP_* as defaults instead of dying"
else
    fail "--yes --mail=smtp uses PRIZY_SMTP_* as defaults instead of dying"
fi

log "DNS resolution helper — resolves via both getent and dig"
# These two are the only checks in this file that leave the machine. A unit
# suite must not fail because the network is down or a tool is missing, and it
# must not pass either — that would hide a real regression behind a cable. So
# each one first establishes that its prerequisite works at all, and skips
# loudly when it does not.
if ! command -v getent >/dev/null 2>&1; then
    skip "resolve_a resolves example.com via getent (getent is not installed)"
elif ! getent ahostsv4 example.com >/dev/null 2>&1; then
    skip "resolve_a resolves example.com via getent (no DNS from this machine)"
else
    ip_via_getent="$(resolve_a example.com || echo '')"
    if printf '%s' "$ip_via_getent" | grep -qE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; then
        pass "resolve_a resolves example.com via getent"
    else
        fail "resolve_a resolves example.com via getent (got '$ip_via_getent')"
    fi
fi

# A PATH containing only dig/awk/grep/head (no getent) forces the fallback
# branch without needing root or an actual uninstall — command -v getent
# genuinely fails to find it under this PATH, same as a box that never had
# the package installed.
if ! command -v dig >/dev/null 2>&1; then
    # Not merely unrunnable: `ln -s "$(command -v dig)" …` with no dig becomes
    # `ln -s "" …`, which under set -e aborted this whole file.
    skip "resolve_a falls back to dig when getent is unavailable (dig is not installed)"
elif ! dig +short A example.com 2>/dev/null | grep -qE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; then
    skip "resolve_a falls back to dig when getent is unavailable (no DNS from this machine)"
else
    FAKEBIN="$(mktemp -d)"
    for tool in dig awk grep head; do
        ln -s "$(command -v "$tool")" "$FAKEBIN/$tool"
    done
    OLD_PATH="$PATH"
    PATH="$FAKEBIN"
    ip_via_dig="$(resolve_a example.com || echo '')"
    PATH="$OLD_PATH"
    rm -rf "$FAKEBIN"
    if printf '%s' "$ip_via_dig" | grep -qE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; then
        pass "resolve_a falls back to dig when getent is unavailable"
    else
        fail "resolve_a falls back to dig when getent is unavailable (got '$ip_via_dig')"
    fi
fi

# Reset for the sections below, which assume --mail=log's plain shape.
OPT_MAIL="log"
SMTP_HOST=""; SMTP_PORT=""; SMTP_USERNAME=""; SMTP_PASSWORD=""; SMTP_ENCRYPTION=""

log "--mail=log warns about what stops working"
mail_dry="$(bash "$(dirname "$0")/install.sh" --dry-run --domain example.com \
    --email ops@example.com --mail=log 2>&1 || true)"
if printf '%s' "$mail_dry" | grep -qi 'magic-link\|verification\|invitation'; then
    pass "--mail=log names the features that stop working"
else
    fail "--mail=log names the features that stop working"
fi

log "Re-running the installer never overwrites live secrets"
live_pw="$(grep '^POSTGRES_PASSWORD=' "$GEN_TMP/.env" | cut -d= -f2- || true)"
live_key="$(grep '^APP_KEY=' "$GEN_TMP/.env" | cut -d= -f2- || true)"
write_env_file "$GEN_TMP/.env" "$GEN_TMP/.env.production.example"
assert_eq "POSTGRES_PASSWORD survives a re-run" "$live_pw" \
    "$(grep '^POSTGRES_PASSWORD=' "$GEN_TMP/.env" | cut -d= -f2-)"
assert_eq "APP_KEY survives a re-run" "$live_key" \
    "$(grep '^APP_KEY=' "$GEN_TMP/.env" | cut -d= -f2-)"

if ls "$GEN_TMP"/.env-* >/dev/null 2>&1; then
    pass "the previous .env was backed up before being rewritten"
else
    fail "the previous .env was backed up before being rewritten"
fi
rm -rf "$GEN_TMP"

log "A source checkout's .env is never imported into the install"
# A developer checkout has a .env. It is gitignored, so `git clone` never
# carries it — but `cp -a` does, and merge_env's existing-wins rule would then
# let APP_ENV=local, APP_DEBUG=true, LOG_LEVEL=debug and a dev APP_KEY beat the
# production template, with REDIS_PASSWORD=null non-empty enough to satisfy
# both the generator's emptiness test and the compose `:?` guard.
CHECKOUT="$(mktemp -d -p "$TMP")"
# 0755, because `cp -a src/. dst/` copies the SOURCE directory's mode onto the
# destination — the mode assertion below is vacuous if both are already 0700.
chmod 755 "$CHECKOUT"
cp "$(dirname "$0")/../.env.production.example" "$CHECKOUT/.env.production.example"
touch "$CHECKOUT/docker-compose.prod.yml"
cat > "$CHECKOUT/.env" <<'DEVENV'
APP_ENV=local
APP_DEBUG=true
APP_KEY=base64:DEVELOPER_KEY_FROM_A_LAPTOP
LOG_LEVEL=debug
REDIS_PASSWORD=null
DEVENV
printf 'APP_ENV=local\n' > "$CHECKOUT/.env-20200101000000"

FAKE_ROOT="$(mktemp -d -p "$TMP")"
mkdir -p "$FAKE_ROOT/source" "$FAKE_ROOT/backups"
chmod 700 "$FAKE_ROOT/source"
# Subshells throughout this section: PRIZY_ROOT/SOURCE_DIR/OPT_* are globals in
# the sourced installer, and the sections below this one depend on their
# file-scope values.
(
    PRIZY_ROOT="$FAKE_ROOT"; SOURCE_DIR="$FAKE_ROOT/source"
    OPT_SOURCE_PATH="$CHECKOUT"; OPT_DRY_RUN=0
    fetch_source
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file

if [ -e "$FAKE_ROOT/source/.env" ]; then
    fail "the checkout's .env does not survive fetch_source"
else
    pass "the checkout's .env does not survive fetch_source"
fi
if ls "$FAKE_ROOT/source"/.env-* >/dev/null 2>&1; then
    fail "the checkout's .env-* backups do not survive fetch_source either"
else
    pass "the checkout's .env-* backups do not survive fetch_source either"
fi
assert_eq "the copy leaves the install directory at mode 700" "700" \
    "$(stat -c '%a' "$FAKE_ROOT/source")"

(
    PRIZY_ROOT="$FAKE_ROOT"; SOURCE_DIR="$FAKE_ROOT/source"
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="log"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    configure
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file

assert_eq "APP_ENV is the template's production, not the checkout's local" "production" \
    "$(grep '^APP_ENV=' "$FAKE_ROOT/source/.env" | cut -d= -f2-)"
assert_eq "APP_DEBUG is the template's false, not the checkout's true" "false" \
    "$(grep '^APP_DEBUG=' "$FAKE_ROOT/source/.env" | cut -d= -f2-)"
assert_eq "LOG_LEVEL is the template's warning, not the checkout's debug" "warning" \
    "$(grep '^LOG_LEVEL=' "$FAKE_ROOT/source/.env" | cut -d= -f2-)"
generated_redis="$(grep '^REDIS_PASSWORD=' "$FAKE_ROOT/source/.env" | cut -d= -f2- || true)"
if printf '%s' "$generated_redis" | grep -qE '^[0-9a-f]{64}$'; then
    pass "REDIS_PASSWORD is a generated 64-character hex secret, not the checkout's null"
else
    fail "REDIS_PASSWORD is a generated 64-character hex secret, not the checkout's null (got '$generated_redis')"
fi
if [ "$(grep '^APP_KEY=' "$FAKE_ROOT/source/.env" | cut -d= -f2-)" = "base64:DEVELOPER_KEY_FROM_A_LAPTOP" ]; then
    fail "APP_KEY is generated here, not inherited from the developer's checkout"
else
    pass "APP_KEY is generated here, not inherited from the developer's checkout"
fi

log "A --source-path re-run keeps the install's own .env"
# The strip above must not take the live one with it: this is the documented
# upgrade path, and regenerating POSTGRES_PASSWORD against a database that
# still holds the old one takes the instance down.
live_db_pw="$(grep '^POSTGRES_PASSWORD=' "$FAKE_ROOT/source/.env" | cut -d= -f2- || true)"
(
    PRIZY_ROOT="$FAKE_ROOT"; SOURCE_DIR="$FAKE_ROOT/source"
    OPT_SOURCE_PATH="$CHECKOUT"; OPT_DRY_RUN=0
    fetch_source
    # Snapshotted HERE, not after the subshell. fetch_source's own EXIT
    # handler would otherwise put the file back on the way out and report
    # green whether or not the arm's own in-line restore did it.
    [ -f "$SOURCE_DIR/.env" ] && cp "$SOURCE_DIR/.env" "$FAKE_ROOT/env-as-fetch-source-left-it"
    [ -e "$FAKE_ROOT/.env-parked-during-copy" ] && touch "$FAKE_ROOT/still-parked"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
if [ -f "$FAKE_ROOT/env-as-fetch-source-left-it" ]; then
    live_db_pw_after="$(grep '^POSTGRES_PASSWORD=' "$FAKE_ROOT/env-as-fetch-source-left-it" | cut -d= -f2- || true)"
else
    live_db_pw_after="<the install has no .env at all>"
fi
assert_eq "the install's own POSTGRES_PASSWORD survives a --source-path re-run" \
    "$live_db_pw" "$live_db_pw_after"
if [ -e "$FAKE_ROOT/still-parked" ]; then
    fail "a completed --source-path run leaves nothing at the parked path"
else
    pass "a completed --source-path run leaves nothing at the parked path"
fi

log "An interrupted --source-path run cannot lose the install's .env"
# What an interruption between the park and the restore leaves behind: the
# install's live .env at the parked path, and — if the copy got that far — the
# checkout's development .env in the source directory. The next run used to
# park AGAIN, moving the checkout's .env over the live secrets, so the
# operator's recovery attempt was what destroyed them, unrecoverably.
INT_ROOT="$(mktemp -d -p "$TMP")"
mkdir -p "$INT_ROOT/source" "$INT_ROOT/backups"
printf 'POSTGRES_PASSWORD=live-db-password\nAPP_ENV=production\n' > "$INT_ROOT/.env-parked-during-copy"
printf 'POSTGRES_PASSWORD=dev-password\nAPP_DEBUG=true\n' > "$INT_ROOT/source/.env"
(
    PRIZY_ROOT="$INT_ROOT"; SOURCE_DIR="$INT_ROOT/source"
    OPT_SOURCE_PATH="$CHECKOUT"; OPT_DRY_RUN=0
    fetch_source
    # Snapshotted HERE, not after the subshell. fetch_source's own EXIT
    # handler would otherwise put the file back on the way out and report
    # green whether or not the arm's own in-line restore did it.
    [ -f "$SOURCE_DIR/.env" ] && cp "$SOURCE_DIR/.env" "$INT_ROOT/env-as-fetch-source-left-it"
    [ -e "$INT_ROOT/.env-parked-during-copy" ] && touch "$INT_ROOT/still-parked"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
assert_eq "the .env parked by an interrupted run is the one the next run restores" \
    "live-db-password" \
    "$(grep '^POSTGRES_PASSWORD=' "$INT_ROOT/env-as-fetch-source-left-it" 2>/dev/null | cut -d= -f2- || true)"
if grep -qx 'APP_DEBUG=true' "$INT_ROOT/env-as-fetch-source-left-it" 2>/dev/null; then
    fail "the recovery run does not adopt the development .env the interruption left behind"
else
    pass "the recovery run does not adopt the development .env the interruption left behind"
fi
if [ -e "$INT_ROOT/still-parked" ]; then
    fail "the recovery run empties the parked path once it has restored from it"
else
    pass "the recovery run empties the parked path once it has restored from it"
fi

log "A run that is not a --source-path run recovers a parked .env too"
# `cp -a` copies the checkout's .git along with everything else, so after an
# interruption the operator's next run can perfectly well be an update run
# with no --source-path. That branch never looked at the parked path, so the
# live secrets stayed orphaned there and configure went on to generate a fresh
# POSTGRES_PASSWORD against the live database — the same loss by another door.
# `git` is shadowed so the update branch runs offline.
GIT_ROOT="$(mktemp -d -p "$TMP")"
mkdir -p "$GIT_ROOT/source/.git"
printf 'POSTGRES_PASSWORD=live-db-password\n' > "$GIT_ROOT/.env-parked-during-copy"
printf 'POSTGRES_PASSWORD=dev-password\n' > "$GIT_ROOT/source/.env"
GIT_BIN="$(mktemp -d -p "$TMP")"
printf '#!/bin/sh\nexit 0\n' > "$GIT_BIN/git"
chmod +x "$GIT_BIN/git"
# SC2030: shadowing git for this subshell only is the point, as with cp below.
# shellcheck disable=SC2030
(
    PATH="$GIT_BIN:$PATH"
    PRIZY_ROOT="$GIT_ROOT"; SOURCE_DIR="$GIT_ROOT/source"
    OPT_SOURCE_PATH=""; OPT_REF="main"; OPT_DRY_RUN=0
    fetch_source
    # Snapshotted HERE, not after the subshell. fetch_source's own EXIT
    # handler would otherwise put the file back on the way out and report
    # green whether or not the step itself did it — verified: with the
    # recovery deleted, assertions read after the subshell still passed. In a
    # real install that handler is far too late: configure runs next, and
    # would generate a fresh POSTGRES_PASSWORD against the live database
    # before the process ever exits.
    cp "$SOURCE_DIR/.env" "$GIT_ROOT/env-as-fetch-source-left-it"
    [ -e "$GIT_ROOT/.env-parked-during-copy" ] && touch "$GIT_ROOT/still-parked"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
assert_eq "an update run restores the .env an interrupted --source-path run parked" \
    "live-db-password" \
    "$(grep '^POSTGRES_PASSWORD=' "$GIT_ROOT/env-as-fetch-source-left-it" 2>/dev/null | cut -d= -f2- || true)"
if [ -e "$GIT_ROOT/still-parked" ]; then
    fail "an update run empties the parked path before configure runs"
else
    pass "an update run empties the parked path before configure runs"
fi

log "An interruption during the copy puts the parked .env back by itself"
# The trap rather than the next run's guard: fetch_source installs one handler
# on EXIT, INT, TERM and HUP, so an interruption self-heals instead of leaving
# the only copy of the live secrets at the parked path.
#
# `cp` is shadowed on PATH so the interruption lands inside the window between
# the park and the restore deterministically, with no signal racing a real
# copy. Only `cp` is shadowed — the directory is prepended to PATH — so mv,
# rm, chmod and sh still resolve normally, including the mv the handler needs.
TRAP_BIN="$(mktemp -d -p "$TMP")"
cat > "$TRAP_BIN/cp" <<'FAKECP'
#!/bin/sh
# No signal named: just fail, which is the ENOSPC-shaped case `set -e` turns
# into an exit. Otherwise raise the named signal in the shell running
# fetch_source AND die from it here, because that is what a real Ctrl-C does:
# it reaches the whole foreground process group. Verified necessary rather
# than tidy — bash discards a SIGINT that arrives while it is waiting on a
# foreground child that then exits 0, so without the second kill the SIGINT
# case reported green with every trap deleted from the installer.
if [ -n "${FAKE_SIG:-}" ]; then
    kill -s "$FAKE_SIG" "$FAKE_TARGET"
    kill -s "$FAKE_SIG" $$
    exit 0
fi
exit 1
FAKECP
chmod +x "$TRAP_BIN/cp"
# Driven in its own process rather than in a `( … ) || true` subshell like the
# sections above. Bash ignores `set -e` for every command inside a compound
# command that is part of a || list — an explicit `set -e` within the subshell
# does not bring it back — so in that form a failing `cp` does not end the run
# at all, fetch_source's own restore puts the file back, and the trap is never
# what is being measured. Verified: with all four traps deleted, the subshell
# form still reported the failed-copy case green.
TRAP_DRIVER="$TMP/drive-fetch-source.sh"
cat > "$TRAP_DRIVER" <<'DRIVER'
# $1 installer, $2 PRIZY_ROOT, $3 the checkout to copy from.
source "$1"
PRIZY_ROOT="$2"; SOURCE_DIR="$2/source"
OPT_SOURCE_PATH="$3"; OPT_DRY_RUN=0
export FAKE_TARGET=$$
fetch_source
DRIVER
for trap_case in "a failed copy:" "a SIGINT:INT" "a SIGTERM:TERM" "a SIGHUP:HUP"; do
    trap_name="${trap_case%%:*}"
    trap_sig="${trap_case#*:}"
    TRAP_ROOT="$(mktemp -d -p "$TMP")"
    mkdir -p "$TRAP_ROOT/source"
    printf 'POSTGRES_PASSWORD=secrets-that-must-come-back\n' > "$TRAP_ROOT/source/.env"
    # SC2031: a per-command PATH prefix, not a lost subshell assignment.
    # shellcheck disable=SC2031
    PATH="$TRAP_BIN:$PATH" FAKE_SIG="$trap_sig" \
        bash "$TRAP_DRIVER" "$INSTALL_SH" "$TRAP_ROOT" "$CHECKOUT" \
        >/dev/null 2>&1 || true   # the interruption is the point, not the exit code
    assert_eq "$trap_name during the copy puts the install's .env back" \
        "secrets-that-must-come-back" \
        "$(grep '^POSTGRES_PASSWORD=' "$TRAP_ROOT/source/.env" 2>/dev/null | cut -d= -f2- || true)"
    if [ -e "$TRAP_ROOT/.env-parked-during-copy" ]; then
        fail "$trap_name leaves nothing at the parked path"
    else
        pass "$trap_name leaves nothing at the parked path"
    fi
done

log ".env backups land in PRIZY_ROOT/backups, and never collide"
# Deterministic rather than racing two `configure` calls for the same
# wall-clock second: `date` is shadowed so write_env_file's stamp is fixed,
# and the name it is about to choose is pre-created with known content.
# Removing the uniquifier then always overwrites that file — the timing
# version went undetected in 1 run of 6.
STAMP_BIN="$(mktemp -d -p "$TMP")"
printf '#!/bin/sh\necho 20200101000000\n' > "$STAMP_BIN/date"
chmod +x "$STAMP_BIN/date"
printf 'THE-BACKUP-THAT-WAS-ALREADY-THERE\n' > "$FAKE_ROOT/backups/.env-20200101000000"
# SC2031: shadowing date for this subshell only is the point, as above.
# shellcheck disable=SC2031
(
    PATH="$STAMP_BIN:$PATH"
    PRIZY_ROOT="$FAKE_ROOT"; SOURCE_DIR="$FAKE_ROOT/source"
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="log"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    configure
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
# Two in the same second, which is what `date +…%S` alone could not name apart.
assert_eq "two .env backups written within one second are both kept" "2" \
    "$(find "$FAKE_ROOT/backups" -maxdepth 1 -name '.env-*' | wc -l)"
assert_eq "the backup already holding that second's name is not overwritten" \
    "THE-BACKUP-THAT-WAS-ALREADY-THERE" \
    "$(cat "$FAKE_ROOT/backups/.env-20200101000000" 2>/dev/null || true)"
if [ -f "$FAKE_ROOT/backups/.env-20200101000000.1" ]; then
    pass "the colliding backup is written under a uniquified name"
else
    fail "the colliding backup is written under a uniquified name"
fi
if ls "$FAKE_ROOT/source"/.env-* >/dev/null 2>&1; then
    fail "no .env backup is left inside the source directory"
else
    pass "no .env backup is left inside the source directory"
fi

log "A secret whose value is the literal string null is regenerated"
NULL_TMP="$(mktemp -d -p "$TMP")"
cp "$(dirname "$0")/../.env.production.example" "$NULL_TMP/.env.production.example"
cat > "$NULL_TMP/.env" <<'NULLENV'
REDIS_PASSWORD=null
MAIL_USERNAME=null
NULLENV
(
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="log"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    write_env_file "$NULL_TMP/.env" "$NULL_TMP/.env.production.example"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
null_redis="$(grep '^REDIS_PASSWORD=' "$NULL_TMP/.env" | cut -d= -f2- || true)"
if printf '%s' "$null_redis" | grep -qE '^[0-9a-f]{64}$'; then
    pass "REDIS_PASSWORD=null is treated as unset and regenerated"
else
    fail "REDIS_PASSWORD=null is treated as unset and regenerated (got '$null_redis')"
fi
# .env.example uses `null` legitimately for MAIL_USERNAME/MAIL_PASSWORD, so the
# rule covers SECRET_KEYS and nothing else.
assert_eq "MAIL_USERNAME=null is left alone (SECRET_KEYS only)" "null" \
    "$(grep '^MAIL_USERNAME=' "$NULL_TMP/.env" | cut -d= -f2-)"

log "An SMTP password reaches the .env byte for byte, or is refused"
ESC_TMP="$(mktemp -d -p "$TMP")"
cp "$(dirname "$0")/../.env.production.example" "$ESC_TMP/.env.production.example"
(
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="smtp"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    SMTP_HOST="smtp.example.com"; SMTP_PORT="587"; SMTP_USERNAME="postmaster"
    SMTP_ENCRYPTION="tls"
    # awk expands escape sequences in a -v assignment: this arrives as a real
    # tab and a single backslash unless the value travels another way.
    SMTP_PASSWORD='pa\ts\\word'
    write_env_file "$ESC_TMP/.env" "$ESC_TMP/.env.production.example"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
assert_eq "a password containing backslash escapes is written literally" 'pa\ts\\word' \
    "$(grep '^MAIL_PASSWORD=' "$ESC_TMP/.env" | cut -d= -f2-)"

dollar_rc=0
# SC2030: every OPT_*/SMTP_* assignment in this file's subshells is deliberately
# scoped to its subshell, so the sections that follow keep the file-scope values
# they were set up with. SC2016: the single quotes are the point — this password
# must reach write_env_file with a literal $ in it.
# shellcheck disable=SC2030,SC2016
(
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="smtp"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    SMTP_HOST="smtp.example.com"; SMTP_PORT="587"; SMTP_USERNAME="postmaster"
    SMTP_ENCRYPTION="tls"
    SMTP_PASSWORD='pa$sword'
    write_env_file "$ESC_TMP/.env" "$ESC_TMP/.env.production.example"
) >/dev/null 2>&1 || dollar_rc=$?
if [ "$dollar_rc" -ne 0 ]; then
    pass "a password containing \$ is refused, not written for Compose to interpolate"
else
    fail "a password containing \$ is refused, not written for Compose to interpolate"
fi
assert_eq "the refused password never reaches the file" 'pa\ts\\word' \
    "$(grep '^MAIL_PASSWORD=' "$ESC_TMP/.env" | cut -d= -f2-)"

# Written unquoted, `"abc` yields MAIL_PASSWORD="abc, which compose-go's dotenv
# parser rejects as an unterminated quoted value — the whole stack then fails
# to start on a parse error — and `"abc"` is unquoted back to abc, a different
# password. Both used to pass the check.
# SC2030: the OPT_*/SMTP_* assignments in these subshells are deliberately
# scoped to them, exactly as in the subshells above.
for quoted_case in '"abc' 'abc"' "'abc" "abc'" '"abc"'; do
    quote_rc=0
    # shellcheck disable=SC2030
    (
        OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="smtp"
        OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
        SMTP_HOST="smtp.example.com"; SMTP_PORT="587"; SMTP_USERNAME="postmaster"
        SMTP_ENCRYPTION="tls"
        SMTP_PASSWORD="$quoted_case"
        write_env_file "$ESC_TMP/.env" "$ESC_TMP/.env.production.example"
    ) >/dev/null 2>&1 || quote_rc=$?
    if [ "$quote_rc" -ne 0 ]; then
        pass "a password written as $quoted_case is refused, not handed to the dotenv parser"
    else
        fail "a password written as $quoted_case is refused, not handed to the dotenv parser"
    fi
done
assert_eq "no refused quoted password reaches the file" 'pa\ts\\word' \
    "$(grep '^MAIL_PASSWORD=' "$ESC_TMP/.env" | cut -d= -f2-)"

# An interior quote is neither unterminated nor strippable, so it stays
# allowed: the check refuses the two edges, not the character.
inner_quote_rc=0
# shellcheck disable=SC2030
(
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="smtp"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    SMTP_HOST="smtp.example.com"; SMTP_PORT="587"; SMTP_USERNAME="postmaster"
    SMTP_ENCRYPTION="tls"
    SMTP_PASSWORD='pa"ss'
    write_env_file "$ESC_TMP/.env" "$ESC_TMP/.env.production.example"
) >/dev/null 2>&1 || inner_quote_rc=$?
if [ "$inner_quote_rc" -eq 0 ]; then
    pass "a password with an interior quote is still accepted"
else
    fail "a password with an interior quote is still accepted (exit $inner_quote_rc)"
fi
assert_eq "the interior-quote password reaches the file byte for byte" 'pa"ss' \
    "$(grep '^MAIL_PASSWORD=' "$ESC_TMP/.env" | cut -d= -f2-)"

log "A re-run with --mail=smtp keeps the live mail credentials"
# write_env_file merges first (preserving everything) and then filled MAIL_*
# unconditionally, so an operator pressing Enter through prompts that showed no
# current value blanked MAIL_USERNAME/MAIL_PASSWORD and reset MAIL_PORT and
# MAIL_SCHEME. Mail failures here are silent, so nobody would notice.
SMTP_TMP="$(mktemp -d -p "$TMP")"
cp "$(dirname "$0")/../.env.production.example" "$SMTP_TMP/.env.production.example"
cat > "$SMTP_TMP/.env" <<'LIVEMAIL'
MAIL_MAILER=smtp
MAIL_HOST=smtp.live.example
MAIL_PORT=2525
MAIL_USERNAME=live-user
MAIL_PASSWORD=live-pass
MAIL_SCHEME=smtps
LIVEMAIL

# SC2031: the SMTP_* read here are the ones collect_mail_settings set in THIS
# subshell; the earlier subshells' assignments are irrelevant to it by design.
# shellcheck disable=SC2031
if (
    SOURCE_DIR="$SMTP_TMP"; OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    collect_mail_settings >/dev/null 2>&1
    [ "$SMTP_HOST" = "smtp.live.example" ] && [ "$SMTP_PORT" = "2525" ] && \
        [ "$SMTP_USERNAME" = "live-user" ] && [ "$SMTP_PASSWORD" = "live-pass" ] && \
        [ "$SMTP_ENCRYPTION" = "ssl" ]
); then
    pass "each SMTP prompt defaults to the value already in the install's .env"
else
    fail "each SMTP prompt defaults to the value already in the install's .env"
fi

(
    SOURCE_DIR="$SMTP_TMP"; OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0
    collect_mail_settings
    write_env_file "$SMTP_TMP/.env" "$SMTP_TMP/.env.production.example"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
assert_eq "MAIL_USERNAME is byte-identical after a re-run that supplies nothing" "live-user" \
    "$(grep '^MAIL_USERNAME=' "$SMTP_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_PASSWORD is byte-identical after a re-run that supplies nothing" "live-pass" \
    "$(grep '^MAIL_PASSWORD=' "$SMTP_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_PORT is not reset from 2525 to the 587 default" "2525" \
    "$(grep '^MAIL_PORT=' "$SMTP_TMP/.env" | cut -d= -f2-)"
assert_eq "MAIL_SCHEME is not reset from smtps to smtp" "smtps" \
    "$(grep '^MAIL_SCHEME=' "$SMTP_TMP/.env" | cut -d= -f2-)"

(
    SOURCE_DIR="$SMTP_TMP"; OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0
    PRIZY_SMTP_USERNAME="new-user"; PRIZY_SMTP_PASSWORD="new-pass"
    PRIZY_SMTP_PORT="465"; PRIZY_SMTP_ENCRYPTION="ssl"
    collect_mail_settings
    write_env_file "$SMTP_TMP/.env" "$SMTP_TMP/.env.production.example"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
assert_eq "a re-run that does supply a new MAIL_USERNAME updates it" "new-user" \
    "$(grep '^MAIL_USERNAME=' "$SMTP_TMP/.env" | cut -d= -f2-)"
assert_eq "a re-run that does supply a new MAIL_PASSWORD updates it" "new-pass" \
    "$(grep '^MAIL_PASSWORD=' "$SMTP_TMP/.env" | cut -d= -f2-)"
assert_eq "a re-run that does supply a new MAIL_PORT updates it" "465" \
    "$(grep '^MAIL_PORT=' "$SMTP_TMP/.env" | cut -d= -f2-)"

# The seeding above and this guard are two separate defences, and the brief
# asked for both: this one is what protects any caller reaching write_env_file
# with an empty collected value, which is the shape the unit suite itself has.
# SC2030: scoped to this subshell deliberately, as everywhere else here.
# shellcheck disable=SC2030
(
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="smtp"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    SMTP_HOST="smtp.live.example"; SMTP_ENCRYPTION="ssl"
    SMTP_PORT=""; SMTP_USERNAME=""; SMTP_PASSWORD=""
    write_env_file "$SMTP_TMP/.env" "$SMTP_TMP/.env.production.example"
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
assert_eq "an empty collected MAIL_USERNAME leaves the live one alone" "new-user" \
    "$(grep '^MAIL_USERNAME=' "$SMTP_TMP/.env" | cut -d= -f2-)"
assert_eq "an empty collected MAIL_PASSWORD leaves the live one alone" "new-pass" \
    "$(grep '^MAIL_PASSWORD=' "$SMTP_TMP/.env" | cut -d= -f2-)"
assert_eq "an empty collected MAIL_PORT leaves the live one alone" "465" \
    "$(grep '^MAIL_PORT=' "$SMTP_TMP/.env" | cut -d= -f2-)"

log "An unattended run can express an SMTP relay that needs no authentication"
# .env.production.example documents empty MAIL_USERNAME/MAIL_PASSWORD as the
# auth-less relay, which --yes used to refuse to produce: prompt_for died on
# any setting with no default.
RELAY_TMP="$(mktemp -d -p "$TMP")"
cp "$(dirname "$0")/../.env.production.example" "$RELAY_TMP/.env.production.example"
relay_rc=0
(
    SOURCE_DIR="$RELAY_TMP"; OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0
    PRIZY_SMTP_HOST="relay.example.com"
    collect_mail_settings
    write_env_file "$RELAY_TMP/.env" "$RELAY_TMP/.env.production.example"
) >/dev/null 2>&1 || relay_rc=$?
if [ "$relay_rc" -eq 0 ]; then
    pass "--yes --mail=smtp with only PRIZY_SMTP_HOST completes"
else
    fail "--yes --mail=smtp with only PRIZY_SMTP_HOST completes (exit $relay_rc)"
fi
assert_eq "the auth-less relay's MAIL_HOST is written" "relay.example.com" \
    "$(grep '^MAIL_HOST=' "$RELAY_TMP/.env" | cut -d= -f2-)"
assert_eq "the auth-less relay's MAIL_USERNAME is empty" "" \
    "$(grep '^MAIL_USERNAME=' "$RELAY_TMP/.env" | cut -d= -f2-)"
assert_eq "the auth-less relay's MAIL_PASSWORD is empty" "" \
    "$(grep '^MAIL_PASSWORD=' "$RELAY_TMP/.env" | cut -d= -f2-)"

log "A value the .env cannot carry is refused where it can still be fixed"
# The refusal's old advice — "set MAIL_PASSWORD in .env by hand after the
# install" — worked in neither direction. On a fresh install write_env_file
# died before writing anything, so there was no install to edit; on an
# existing one the hand-written value was seeded straight back into the same
# refusal, so every later --mail=smtp run died at Configuration telling the
# operator to do what they had already done.

# 1. Interactively the refusal is explained and the prompt comes round again,
#    so the operator fixes it where they are standing.
REPROMPT_TMP="$(mktemp -d -p "$TMP")"
cp "$(dirname "$0")/../.env.production.example" "$REPROMPT_TMP/.env.production.example"
# SC2016: the single quotes are the point — this password must reach
# collect_mail_settings with a literal $ in it.
# shellcheck disable=SC2016
cat > "$REPROMPT_TMP/answers" <<'ANSWERS'
smtp.example.com
587
postmaster
pa$sword
clean-password
tls
ANSWERS
reprompt_rc=0
# shellcheck disable=SC2030
reprompt_out="$( (
    SOURCE_DIR="$REPROMPT_TMP"; OPT_MAIL="smtp"; OPT_YES=0; OPT_DRY_RUN=0
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0
    collect_mail_settings
    write_env_file "$REPROMPT_TMP/.env" "$REPROMPT_TMP/.env.production.example"
) < "$REPROMPT_TMP/answers" 2>&1 )" || reprompt_rc=$?
if [ "$reprompt_rc" -eq 0 ]; then
    pass "an interactive run given an unwritable password and then a clean one completes"
else
    fail "an interactive run given an unwritable password and then a clean one completes (exit $reprompt_rc)"
fi
assert_eq "the clean password is the one that reaches the .env" "clean-password" \
    "$(grep '^MAIL_PASSWORD=' "$REPROMPT_TMP/.env" 2>/dev/null | cut -d= -f2- || true)"
if printf '%s' "$reprompt_out" | grep -q 'MAIL_PASSWORD cannot contain'; then
    pass "the re-prompt says which setting was refused and why"
else
    fail "the re-prompt says which setting was refused and why"
fi

# 2. A hand-written value the installer would refuse is never seeded as a
#    prompt default, so it never reaches the refusal at all.
DOLLAR_TMP="$(mktemp -d -p "$TMP")"
cp "$(dirname "$0")/../.env.production.example" "$DOLLAR_TMP/.env.production.example"
cat > "$DOLLAR_TMP/.env" <<'DOLLARENV'
MAIL_MAILER=smtp
MAIL_HOST=smtp.live.example
MAIL_PORT=2525
MAIL_USERNAME=live-user
MAIL_PASSWORD=pa$sword-set-by-hand
MAIL_SCHEME=smtp
DOLLARENV
# SC2031: the SMTP_* read here are the ones collect_mail_settings set in THIS
# subshell, exactly as in the seeding test above.
# shellcheck disable=SC2031
if (
    SOURCE_DIR="$DOLLAR_TMP"; OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    collect_mail_settings >/dev/null 2>&1
    [ -z "$SMTP_PASSWORD" ] && [ "$SMTP_USERNAME" = "live-user" ]
); then
    pass "a MAIL_PASSWORD the installer would refuse is not offered back as a prompt default"
else
    fail "a MAIL_PASSWORD the installer would refuse is not offered back as a prompt default"
fi

# 3. Which is what makes the whole documented upgrade path survive it.
dollar_rerun_rc=0
(
    SOURCE_DIR="$DOLLAR_TMP"; OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0
    collect_mail_settings
    write_env_file "$DOLLAR_TMP/.env" "$DOLLAR_TMP/.env.production.example"
) >/dev/null 2>&1 || dollar_rerun_rc=$?
if [ "$dollar_rerun_rc" -eq 0 ]; then
    pass "a --mail=smtp re-run against a hand-written \$ password completes"
else
    fail "a --mail=smtp re-run against a hand-written \$ password completes (exit $dollar_rerun_rc)"
fi
# SC2016: the literal $ is the point — this is the byte-for-byte comparison.
# shellcheck disable=SC2016
assert_eq "the hand-written MAIL_PASSWORD is byte-identical after that re-run" 'pa$sword-set-by-hand' \
    "$(grep '^MAIL_PASSWORD=' "$DOLLAR_TMP/.env" 2>/dev/null | cut -d= -f2- || true)"

# 4. Under --yes there is nobody to re-prompt, so it stays fatal — but it names
#    the variable the operator set rather than the .env key they did not.
yes_dollar_rc=0
# SC2016: the literal $ is the point, as above.
# shellcheck disable=SC2016,SC2030
yes_dollar_out="$( (
    SOURCE_DIR="$DOLLAR_TMP"; OPT_MAIL="smtp"; OPT_YES=1; OPT_DRY_RUN=0
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0
    PRIZY_SMTP_PASSWORD='pa$sword'
    collect_mail_settings
) 2>&1 )" || yes_dollar_rc=$?
if [ "$yes_dollar_rc" -ne 0 ] && printf '%s' "$yes_dollar_out" | grep -q 'PRIZY_SMTP_PASSWORD'; then
    pass "--yes with an unwritable PRIZY_SMTP_PASSWORD dies, naming that variable"
else
    fail "--yes with an unwritable PRIZY_SMTP_PASSWORD dies, naming that variable (exit $yes_dollar_rc: $yes_dollar_out)"
fi

log "Every PRIZY_* variable is documented in --help"
help_text="$(bash "$INSTALL_SH" --help 2>&1 || true)"
missing_env_docs=""
for prizy_var in PRIZY_DOMAIN PRIZY_EMAIL PRIZY_MAIL PRIZY_SMTP_HOST PRIZY_SMTP_PORT \
                 PRIZY_SMTP_USERNAME PRIZY_SMTP_PASSWORD PRIZY_SMTP_ENCRYPTION \
                 PRIZY_ROOT PRIZY_REPO_URL; do
    printf '%s' "$help_text" | grep -q "$prizy_var" || missing_env_docs="$missing_env_docs $prizy_var"
done
assert_eq "--help names every PRIZY_* variable the installer reads" "" "$missing_env_docs"

log "Docker: a stopped daemon is not an old daemon"
# `docker version --format '{{.Server.Version}}'` asks the daemon, so a stopped
# daemon prints nothing and exits non-zero. The old `|| echo 0` turned that into
# the version string "0" and reported it as "docker 0 is too old".
#
# The fake PATH holds docker plus only what version_gte needs, so
# check_docker_version finds no systemctl under it and cannot touch this
# machine's services.
DOCKER_BIN="$(mktemp -d -p "$TMP")"
for tool in sort head; do
    ln -s "$(command -v "$tool")" "$DOCKER_BIN/$tool"
done

printf '#!/bin/sh\nexit 1\n' > "$DOCKER_BIN/docker"
chmod +x "$DOCKER_BIN/docker"
daemon_rc=0
daemon_out="$( ( PATH="$DOCKER_BIN"; OPT_DRY_RUN=0; check_docker_version ) 2>&1 )" || daemon_rc=$?
if [ "$daemon_rc" -ne 0 ] && printf '%s' "$daemon_out" | grep -q 'daemon is not reachable'; then
    pass "an unreachable docker daemon is reported as unreachable"
else
    fail "an unreachable docker daemon is reported as unreachable (exit $daemon_rc: $daemon_out)"
fi
if printf '%s' "$daemon_out" | grep -q 'too old'; then
    fail "an unreachable docker daemon is never called too old"
else
    pass "an unreachable docker daemon is never called too old"
fi

printf '#!/bin/sh\necho 20.10.5\n' > "$DOCKER_BIN/docker"
old_docker_rc=0
old_docker_out="$( ( PATH="$DOCKER_BIN"; OPT_DRY_RUN=0; check_docker_version ) 2>&1 )" || old_docker_rc=$?
if [ "$old_docker_rc" -ne 0 ] && printf '%s' "$old_docker_out" | grep -q 'too old'; then
    pass "a reachable docker older than 24 is refused as too old"
else
    fail "a reachable docker older than 24 is refused as too old (exit $old_docker_rc: $old_docker_out)"
fi

printf '#!/bin/sh\necho 27.1.1\n' > "$DOCKER_BIN/docker"
new_docker_rc=0
( PATH="$DOCKER_BIN"; OPT_DRY_RUN=0; check_docker_version ) >/dev/null 2>&1 || new_docker_rc=$?
if [ "$new_docker_rc" -eq 0 ]; then
    pass "a reachable docker 27.1.1 is accepted"
else
    fail "a reachable docker 27.1.1 is accepted (exit $new_docker_rc)"
fi
rm -rf "$DOCKER_BIN"

log "The full --dry-run path"
full_dry="$(bash "$INSTALL_SH" --dry-run --domain example.com --email ops@example.com \
    --mail=log --source-path "$(dirname "$0")/.." 2>&1 || true)"

# Anchored on the DRY-RUN: prefix, which only run() ever prints — report()'s
# closing "Logs:" line also calls compose_cmd() and would satisfy a bare
# 'docker compose' grep whether or not deploy() actually ran. A DRY-RUN line
# naming both compose and build can only come from deploy()'s own build
# command.
if printf '%s' "$full_dry" | grep -qE 'DRY-RUN:.*compose.*build'; then
    pass "--dry-run reaches the deploy step"
else
    fail "--dry-run reaches the deploy step"
fi
# This proves the line "starting the stack (migrate runs first, then app and
# web)" was printed with this wording — not that migrations actually execute.
# Real execution happens inside the container at `up` time, via the one-shot
# migrate service that docker-compose.prod.yml gates with
# depends_on: condition: service_completed_successfully.
if printf '%s' "$full_dry" | grep -q 'migrate'; then
    pass "--dry-run runs migrations as part of the deploy"
else
    fail "--dry-run runs migrations as part of the deploy"
fi
# The .env-* glob is wider than the checkout's own .env: it also deletes a
# file an operator left in the source directory. The old info line fired only
# when the checkout carried a .env, and named only that file.
if printf '%s' "$full_dry" | grep -qE 'removing .*/\.env and any .*/\.env-\* files'; then
    pass "the run says which .env files it removes from the source directory"
else
    fail "the run says which .env files it removes from the source directory"
fi
if printf '%s' "$full_dry" | grep -q 'https://example.com/signup'; then
    pass "the closing instruction names /signup"
else
    fail "the closing instruction names /signup"
fi
if printf '%s' "$full_dry" | grep -qE 'https://example\.com/?$'; then
    fail "the closing instruction never points at the bare domain (it 500s)"
else
    pass "the closing instruction never points at the bare domain (it 500s)"
fi

# The closing verification used to curl http://127.0.0.1:$OPT_HTTP_PORT/health
# from the host, which can never answer: /health is routed only on Caddy's
# internal :2020 listener (docker/prod/Caddyfile), which is never published,
# and the public site address defaults to https://, so the published HTTP port
# carries only the ACME challenge handler. Every successful install therefore
# ended on a warning. Anchored on the DRY-RUN: prefix, which only run() prints,
# so this reads the command that would actually execute.
if printf '%s' "$full_dry" | grep -qE 'DRY-RUN:.*exec -T web wget .*127\.0\.0\.1:2020/health'; then
    pass "the closing check probes /health on the internal listener inside the web container"
else
    fail "the closing check probes /health on the internal listener inside the web container"
fi
if printf '%s' "$full_dry" | grep -q '127\.0\.0\.1:80'; then
    fail "the closing check never probes the published HTTP port, which cannot answer"
else
    pass "the closing check never probes the published HTTP port, which cannot answer"
fi

realtime_dry="$(bash "$INSTALL_SH" --dry-run --domain example.com --email ops@example.com \
    --mail=log --with-realtime --source-path "$(dirname "$0")/.." 2>&1 || true)"
if printf '%s' "$realtime_dry" | grep -q 'VITE_REVERB_APP_KEY'; then
    pass "--with-realtime passes VITE_REVERB_APP_KEY into the build"
else
    fail "--with-realtime passes VITE_REVERB_APP_KEY into the build"
fi
# Same DRY-RUN: anchor as above, for the same reason: report()'s closing
# text also mentions compose_cmd()'s output, which includes --profile
# realtime whenever OPT_WITH_REALTIME is set — a bare 'realtime' grep would
# pass even if deploy() never ran.
if printf '%s' "$realtime_dry" | grep -q 'DRY-RUN:.*--profile realtime'; then
    pass "--with-realtime selects the realtime compose profile"
else
    fail "--with-realtime selects the realtime compose profile"
fi
if printf '%s' "$full_dry" | grep -q 'VITE_REVERB_APP_KEY'; then
    fail "without --with-realtime no VITE_* value is compiled in"
else
    pass "without --with-realtime no VITE_* value is compiled in"
fi

log "A missing --domain, --email or --mail is asked for, not required"
# The suite has no terminal, so is_interactive is stood in for wherever "a
# person is answering" is the case under test — and left real where "nobody
# can answer" is. Every case runs in a subshell: resolve_required assigns the
# OPT_* globals and die() exits.
ASK_ROOT="$(mktemp -d -p "$TMP")"

# ask_as_person <keystrokes> [prizy-root]
# Runs resolve_required as a person at a terminal typing <keystrokes> (exact
# bytes, so a test can end input without a newline). ASK_DOMAIN, ASK_EMAIL,
# ASK_MAIL and ASK_YES stand for what came from flags. The last line of output
# is "RESULT <domain> <email> <mail>" when it returns.
ask_as_person() {
    local keys="$1" root="${2:-$ASK_ROOT/fresh}"
    printf '%s' "$keys" | (
        is_interactive() { return 0; }
        PRIZY_ROOT="$root"; SOURCE_DIR="$root/source"
        OPT_DOMAIN="${ASK_DOMAIN:-}"; OPT_EMAIL="${ASK_EMAIL:-}"
        OPT_MAIL="${ASK_MAIL:-}"; OPT_YES="${ASK_YES:-0}"
        resolve_required
        printf '\nRESULT %s %s %s\n' "$OPT_DOMAIN" "$OPT_EMAIL" "$OPT_MAIL"
    ) 2>&1
}
last_line() { printf '%s\n' "$1" | tail -n1; }

ask_rc=0
ask_out="$(ask_as_person $'example.com\nops@example.com\nlog\n')" || ask_rc=$?
assert_eq "with no settings given, all three are asked for and taken" \
    "0 RESULT example.com ops@example.com log" "$ask_rc $(last_line "$ask_out")"
# `read -p` prints its prompt only when stdin is a terminal, so a regression to
# it would leave these questions invisible — to this suite, and to anyone who
# runs the installer over plain ssh.
if printf '%s' "$ask_out" | grep -q 'Domain: ' && printf '%s' "$ask_out" | grep -q "Let's Encrypt email: " \
    && printf '%s' "$ask_out" | grep -q 'Email delivery (smtp/log): '; then
    pass "every question prints its prompt"
else
    fail "every question prints its prompt (got: $ask_out)"
fi

ask_out="$(ask_as_person $'localhost\nexample.com\nnope\nops@example.com\nemail\nsmtp\n')" || true
assert_eq "an answer the flag would refuse is asked again, not accepted" \
    "RESULT example.com ops@example.com smtp" "$(last_line "$ask_out")"
if printf '%s' "$ask_out" | grep -q 'enter a lowercase domain' \
    && printf '%s' "$ask_out" | grep -q 'enter a real, deliverable address' \
    && printf '%s' "$ask_out" | grep -q 'answer smtp or log'; then
    pass "a refused answer says what a valid one looks like"
else
    fail "a refused answer says what a valid one looks like (got: $ask_out)"
fi

ask_out="$(ask_as_person $'example.com\nops@example.com\nlog')" || true
assert_eq "a last answer with no trailing newline still counts" \
    "RESULT example.com ops@example.com log" "$(last_line "$ask_out")"

# End of input must stop the install. Without the check, read fails on every
# pass and the same question is asked forever, so this runs under a timeout:
# 124 would mean the loop spun.
# SC2016: the single quotes are the point — $1 and $2 belong to the inner bash.
eof_rc=0
# shellcheck disable=SC2016
eof_out="$(timeout 10 bash -c 'source "$1"; is_interactive() { return 0; }
    PRIZY_ROOT="$2"; SOURCE_DIR="$2/source"; resolve_required' _ "$INSTALL_SH" "$ASK_ROOT/fresh" \
    < /dev/null 2>&1)" || eof_rc=$?
if [ "$eof_rc" -ne 0 ] && [ "$eof_rc" -ne 124 ] && printf '%s' "$eof_out" | grep -q 'input closed'; then
    pass "end of input stops the install instead of asking forever"
else
    fail "end of input stops the install instead of asking forever (exit $eof_rc: $eof_out)"
fi

ask_out="$(ASK_DOMAIN=example.com ASK_MAIL=log ask_as_person $'ops@example.com\n')" || true
if [ "$(last_line "$ask_out")" = "RESULT example.com ops@example.com log" ] \
    && ! printf '%s' "$ask_out" | grep -q 'Domain' \
    && ! printf '%s' "$ask_out" | grep -q 'Email delivery'; then
    pass "only the settings left out are asked for"
else
    fail "only the settings left out are asked for (got: $ask_out)"
fi

ask_out="$(ASK_DOMAIN=example.com ASK_EMAIL=ops@example.com ASK_MAIL=log ask_as_person 'unread')" || true
if [ "$(last_line "$ask_out")" = "RESULT example.com ops@example.com log" ] \
    && ! printf '%s' "$ask_out" | grep -q 'A few answers'; then
    pass "with every setting given, nothing is asked"
else
    fail "with every setting given, nothing is asked (got: $ask_out)"
fi

yes_rc=0
yes_out="$(ASK_YES=1 ask_as_person $'example.com\nops@example.com\nlog\n')" || yes_rc=$?
if [ "$yes_rc" -ne 0 ] && printf '%s' "$yes_out" | grep -qF 'missing --domain --email --mail=smtp|log' \
    && ! printf '%s' "$yes_out" | grep -q 'Domain: '; then
    pass "--yes never asks: every missing setting is named and the run stops"
else
    fail "--yes never asks: every missing setting is named and the run stops (exit $yes_rc: $yes_out)"
fi

# The REAL is_interactive this time. Answers are waiting on stdin, so a
# missing terminal check would read them and succeed; refusing is the only
# way to pass.
tty_rc=0
tty_out="$( (
    PRIZY_ROOT="$ASK_ROOT/fresh"; SOURCE_DIR="$ASK_ROOT/fresh/source"
    OPT_DOMAIN=""; OPT_EMAIL=""; OPT_MAIL=""; OPT_YES=0
    resolve_required
) <<< $'example.com\nops@example.com\nlog' 2>&1)" || tty_rc=$?
if [ "$tty_rc" -ne 0 ] && printf '%s' "$tty_out" | grep -q 'ssh -t'; then
    pass "with no terminal to ask on, a missing setting stops the run and says how to be asked"
else
    fail "with no terminal to ask on, a missing setting stops the run and says how to be asked (exit $tty_rc: $tty_out)"
fi

log "A re-run offers what the install already has"
RERUN_ROOT="$ASK_ROOT/rerun"
mkdir -p "$RERUN_ROOT/source"
printf 'APP_BASE_DOMAIN=prizy.example.org\nACME_EMAIL=ops@example.org\nMAIL_MAILER=smtp\n' \
    > "$RERUN_ROOT/source/.env"
ask_out="$(ask_as_person $'\n\n\n' "$RERUN_ROOT")" || true
assert_eq "Enter three times keeps the installed domain, email and mail choice" \
    "RESULT prizy.example.org ops@example.org smtp" "$(last_line "$ask_out")"
if printf '%s' "$ask_out" | grep -qF 'Domain [prizy.example.org]: '; then
    pass "the installed value is shown as the default"
else
    fail "the installed value is shown as the default (got: $ask_out)"
fi

# After a run interrupted mid-copy, $SOURCE_DIR/.env is the CHECKOUT's and the
# parked file is the install's (see fetch_source). Defaults come from the
# install's, or an operator pressing Enter would switch domains.
PARKED_ROOT="$ASK_ROOT/parked"
mkdir -p "$PARKED_ROOT/source"
printf 'APP_BASE_DOMAIN=checkout.example.org\nACME_EMAIL=dev@example.org\nMAIL_MAILER=log\n' \
    > "$PARKED_ROOT/source/.env"
printf 'APP_BASE_DOMAIN=live.example.org\nACME_EMAIL=ops@example.org\nMAIL_MAILER=smtp\n' \
    > "$PARKED_ROOT/.env-parked-during-copy"
ask_out="$(ask_as_person $'\n\n\n' "$PARKED_ROOT")" || true
assert_eq "after an interrupted copy, defaults come from the parked .env, not the checkout's" \
    "RESULT live.example.org ops@example.org smtp" "$(last_line "$ask_out")"

# MAIL_MAILER=array is a real Laravel mailer, just not an answer this question
# takes; localhost is what a development .env carries.
ODD_ROOT="$ASK_ROOT/odd"
mkdir -p "$ODD_ROOT/source"
printf 'APP_BASE_DOMAIN=localhost\nACME_EMAIL=\nMAIL_MAILER=array\n' > "$ODD_ROOT/source/.env"
ask_out="$(ask_as_person $'example.com\nops@example.com\nlog\n' "$ODD_ROOT")" || true
if [ "$(last_line "$ask_out")" = "RESULT example.com ops@example.com log" ] \
    && ! printf '%s' "$ask_out" | grep -qF '[localhost]' \
    && ! printf '%s' "$ask_out" | grep -qF '[array]'; then
    pass "a stored value the flag would refuse is never offered as a default"
else
    fail "a stored value the flag would refuse is never offered as a default (got: $ask_out)"
fi

log "The questions are wired into the installer itself"
# Through main, in a fresh process, so no OPT_* left over from the cases
# above can pre-answer a question. The answer has to reach the configuration
# step, not just be asked for.
main_rc=0
# shellcheck disable=SC2016
main_out="$(PRIZY_ROOT="$ASK_ROOT/main" bash -c 'source "$1"; shift; is_interactive() { return 0; }; main "$@"' \
    _ "$INSTALL_SH" --dry-run --source-path "$(dirname "$0")/.." \
    <<< $'example.com\nops@example.com\nlog' 2>&1)" || main_rc=$?
if [ "$main_rc" -eq 0 ] && printf '%s' "$main_out" | grep -q 'Domain: ' \
    && printf '%s' "$main_out" | grep -q 'would write .*/.env for example.com'; then
    pass "bash install.sh with no settings asks, then installs with the answers"
else
    fail "bash install.sh with no settings asks, then installs with the answers (exit $main_rc: $main_out)"
fi

bare_rc=0
bare_out="$(bash "$INSTALL_SH" --dry-run < /dev/null 2>&1)" || bare_rc=$?
if [ "$bare_rc" -ne 0 ] && printf '%s' "$bare_out" | grep -qF 'missing --domain --email --mail=smtp|log' \
    && ! printf '%s' "$bare_out" | grep -q 'Preflight'; then
    pass "with no settings and no terminal, the installer stops before doing anything"
else
    fail "with no settings and no terminal, the installer stops before doing anything (exit $bare_rc: $bare_out)"
fi

log "The SMTP password is never shown"
# A re-run with the live password in the install's .env and Enter pressed at
# every question. The password question prints its own prompt (see
# prompt_for), so this output is everything it shows — the same text that
# lands in the install log. The password may appear exactly once: on the
# KEPT line this test prints itself.
PW_ROOT="$(mktemp -d -p "$TMP")"
mkdir -p "$PW_ROOT/source"
printf 'MAIL_HOST=smtp.example.org\nMAIL_PORT=587\nMAIL_USERNAME=prizy\nMAIL_PASSWORD=Tr0ub4dor-horse\nMAIL_SCHEME=smtp\n' \
    > "$PW_ROOT/source/.env"
# ask_smtp <prizy-root> <keystrokes> [PRIZY_SMTP_PASSWORD]
ask_smtp() {
    (
        unset PRIZY_SMTP_HOST PRIZY_SMTP_PORT PRIZY_SMTP_USERNAME PRIZY_SMTP_ENCRYPTION
        PRIZY_SMTP_PASSWORD="${3:-}"
        PRIZY_ROOT="$1"; SOURCE_DIR="$1/source"
        OPT_MAIL="smtp"; OPT_YES=0; OPT_DRY_RUN=0
        collect_mail_settings
        # SC2031: read in the same subshell collect_mail_settings set it in.
        # shellcheck disable=SC2031
        printf '\nKEPT %s\n' "$SMTP_PASSWORD"
    ) <<< "$2" 2>&1
}
count_of() { printf '%s' "$2" | grep -o -- "$1" | wc -l | tr -d ' '; }

pw_out="$(ask_smtp "$PW_ROOT" $'\n\n\n\n\n')" || true
assert_eq "Enter at the password question keeps the live password" \
    "KEPT Tr0ub4dor-horse" "$(last_line "$pw_out")"
if printf '%s' "$pw_out" | grep -qF 'SMTP password [********]: ' \
    && [ "$(count_of 'Tr0ub4dor-horse' "$pw_out")" -eq 1 ]; then
    pass "a re-run shows the live password as a mask, never as itself"
else
    fail "a re-run shows the live password as a mask, never as itself (got: $pw_out)"
fi

pwenv_out="$(ask_smtp "$PW_ROOT/none" $'smtp.example.org\n\n\n\n\n' 'Env-Secret-9')" || true
if [ "$(last_line "$pwenv_out")" = "KEPT Env-Secret-9" ] \
    && [ "$(count_of 'Env-Secret-9' "$pwenv_out")" -eq 1 ]; then
    pass "a password from PRIZY_SMTP_PASSWORD is masked too"
else
    fail "a password from PRIZY_SMTP_PASSWORD is masked too (got: $pwenv_out)"
fi

# read's default word splitting trimmed edge whitespace, quietly saving a
# different password than the one typed. Kept whole, it is refused out loud
# by the same rule every other SMTP value follows.
ws_out="$(ask_smtp "$PW_ROOT/none" $'smtp.example.org\n587\nprizy\n lead-space\nGood-Pass-1\ntls\n')" || true
if [ "$(last_line "$ws_out")" = "KEPT Good-Pass-1" ] \
    && printf '%s' "$ws_out" | grep -q 'MAIL_PASSWORD cannot contain whitespace'; then
    pass "a typed password with edge whitespace is refused, not trimmed"
else
    fail "a typed password with edge whitespace is refused, not trimmed (got: $ws_out)"
fi

# Echo is the terminal's doing, so only a terminal can show it: `script` runs
# the question on a pseudo-terminal whose echo is on unless read -s turns it
# off. The keystrokes arrive after a pause, once the question is waiting — a
# slow machine can only make this fail, never pass wrongly.
install_abs="$(cd "$(dirname "$INSTALL_SH")" && pwd)/install.sh"
if script --version 2>/dev/null | grep -q util-linux; then
    PTY_SH="$TMP/typed-password.sh"
    # SC2016: these lines are a script for the inner bash; its $1 and $SMTP_PASSWORD.
    # shellcheck disable=SC2016
    printf '%s\n' 'source "$1"' 'OPT_YES=0' 'prompt_for SMTP_PASSWORD "SMTP password" "" 1 1' \
        'printf "got=%s\n" "$SMTP_PASSWORD"' > "$PTY_SH"
    pty_out="$({ sleep 2; printf 'Typed-Secret-7\n'; } \
        | script -qec "bash '$PTY_SH' '$install_abs'" /dev/null 2>&1 | tr -d '\r')" || true
    if printf '%s' "$pty_out" | grep -q 'got=Typed-Secret-7' \
        && [ "$(count_of 'Typed-Secret-7' "$pty_out")" -eq 1 ]; then
        pass "a typed SMTP password is not echoed to the terminal"
    else
        fail "a typed SMTP password is not echoed to the terminal (got: $pty_out)"
    fi
else
    skip "a typed SMTP password is not echoed to the terminal (needs util-linux script)"
fi

log "Missing curl, git and openssl are installed before anything needs them"
# new_fake_bin <present-tool>...
# A directory to use as the WHOLE PATH: stub apt-get and dnf that append their
# arguments to <dir>/calls and, on `install`, make each named tool appear the
# way a real package manager would — curl, git and openssl as no-ops, docker.io
# and docker-ce as a docker that reports 27.3.1. STUB_PM_FAIL makes them fail;
# STUB_PM_FAIL_ON=<subcommand> fails that one only; STUB_PM_NOOP makes install
# succeed without installing anything.
new_fake_bin() {
    local dir t
    dir="$(mktemp -d -p "$TMP")"
    for t in "$@"; do
        printf '#!/bin/sh\nexit 0\n' > "$dir/$t"
        chmod +x "$dir/$t"
    done
    # SC2016: the stub's own $1, expanded when the stub runs.
    # shellcheck disable=SC2016
    printf '#!/bin/sh\ncase "$1" in version) echo 27.3.1 ;; esac\nexit 0\n' > "$dir/.docker-when-installed"
    chmod +x "$dir/.docker-when-installed"
    for t in apt-get dnf; do
        cat > "$dir/$t" <<STUB
#!/bin/sh
echo "$t \$*" >> "$dir/calls"
[ -z "\${STUB_PM_FAIL:-}" ] || exit 100
[ "\${STUB_PM_FAIL_ON:-}" != "\$1" ] || exit 100
[ "\$1" = install ] || exit 0
[ -z "\${STUB_PM_NOOP:-}" ] || exit 0
for pkg in "\$@"; do
    case "\$pkg" in
        curl|git|openssl) printf '#!/bin/sh\nexit 0\n' > "$dir/\$pkg"; /bin/chmod +x "$dir/\$pkg" ;;
        docker.io|docker-ce) /bin/cp "$dir/.docker-when-installed" "$dir/docker" ;;
    esac
done
STUB
        chmod +x "$dir/$t"
    done
    printf '%s' "$dir"
}
calls_of() { [ -f "$1/calls" ] && paste -sd'|' "$1/calls" || printf 'none'; }

# SC2030/SC2031: PATH is replaced inside each subshell only, which is the point.
# shellcheck disable=SC2030,SC2031
{
pre_bin="$(new_fake_bin)"; pre_rc=0
pre_out="$( ( PATH="$pre_bin"; OS_FAMILY=debian; OPT_SOURCE_PATH=""; OPT_DRY_RUN=0; ensure_prerequisites ) 2>&1 )" || pre_rc=$?
assert_eq "a bare Debian box gets openssl, curl and git (and CA certificates) before anything needs them" \
    "0 apt-get update -q|apt-get install -y -q ca-certificates openssl curl git" "$pre_rc $(calls_of "$pre_bin")"

pre_bin="$(new_fake_bin docker openssl)"
( PATH="$pre_bin"; OS_FAMILY=debian; OPT_SOURCE_PATH="/some/checkout"; OPT_DRY_RUN=0; ensure_prerequisites ) >/dev/null 2>&1 || true
assert_eq "curl is not needed when Docker is present, nor git with --source-path" \
    "none" "$(calls_of "$pre_bin")"

pre_bin="$(new_fake_bin docker)"
( PATH="$pre_bin"; OS_FAMILY=rhel; OPT_SOURCE_PATH=""; OPT_DRY_RUN=0; ensure_prerequisites ) >/dev/null 2>&1 || true
assert_eq "the RHEL family installs them with dnf" \
    "dnf install -y -q openssl git" "$(calls_of "$pre_bin")"

pre_bin="$(new_fake_bin)"; pre_rc=0
pre_out="$( ( PATH="$pre_bin"; STUB_PM_FAIL=1; export STUB_PM_FAIL; OS_FAMILY=debian; OPT_SOURCE_PATH=""; OPT_DRY_RUN=0
    ensure_prerequisites ) 2>&1 )" || pre_rc=$?
if [ "$pre_rc" -ne 0 ] && printf '%s' "$pre_out" | grep -q 'ERROR: could not install openssl curl git'; then
    pass "a package manager that fails stops the run with what to do"
else
    fail "a package manager that fails stops the run with what to do (exit $pre_rc: $pre_out)"
fi

pre_bin="$(new_fake_bin)"; pre_rc=0
pre_out="$( ( PATH="$pre_bin"; STUB_PM_NOOP=1; export STUB_PM_NOOP; OS_FAMILY=debian; OPT_SOURCE_PATH=""; OPT_DRY_RUN=0
    ensure_prerequisites ) 2>&1 )" || pre_rc=$?
if [ "$pre_rc" -ne 0 ] && printf '%s' "$pre_out" | grep -q 'still missing after installing it'; then
    pass "a tool the package manager did not actually install is caught"
else
    fail "a tool the package manager did not actually install is caught (exit $pre_rc: $pre_out)"
fi

pre_bin="$(new_fake_bin)"
pre_out="$( ( PATH="$pre_bin"; OS_FAMILY=debian; OPT_SOURCE_PATH=""; OPT_DRY_RUN=1; ensure_prerequisites ) 2>&1 )" || true
if [ "$(calls_of "$pre_bin")" = "none" ] \
    && printf '%s' "$pre_out" | grep -q 'DRY-RUN: apt-get install -y -q ca-certificates openssl curl git'; then
    pass "--dry-run names the tools it would install and installs none"
else
    fail "--dry-run names the tools it would install and installs none (calls: $(calls_of "$pre_bin"); $pre_out)"
fi

# Through preflight, which is what a real run calls: the check has to be
# wired in, not just correct. Dry-run, so the root check is skipped.
pre_bin="$(new_fake_bin)"
for tool in uname awk df; do ln -s "$(command -v "$tool")" "$pre_bin/$tool"; done
pre_out="$( ( PATH="$pre_bin"; OPT_SOURCE_PATH=""; OPT_DRY_RUN=1; preflight ) 2>&1 )" || true
if printf '%s' "$pre_out" | grep -q 'installing missing tools: openssl curl git'; then
    pass "preflight installs the missing tools"
else
    fail "preflight installs the missing tools (got: $pre_out)"
fi

log "Installing Docker: a failed download is noticed, and the fallback installs real packages"
# new_docker_bin: a fake PATH where get.docker.com cannot be fetched (curl
# fails the way it does with no DNS), systemctl is a no-op, and apt-cache
# knows docker-compose-v2 unless STUB_NO_V2 is set — Debian 13 does not.
new_docker_bin() {
    local dir tool
    dir="$(new_fake_bin)"
    for tool in bash sh sort head; do ln -s "$(command -v "$tool")" "$dir/$tool"; done
    printf '#!/bin/sh\necho "curl: (6) Could not resolve host: get.docker.com" >&2\nexit 6\n' > "$dir/curl"
    printf '#!/bin/sh\nexit 0\n' > "$dir/systemctl"
    # SC2016: read by the stub at run time, from the environment it inherits.
    # shellcheck disable=SC2016
    printf '#!/bin/sh\n[ -z "${STUB_NO_V2:-}" ]\n' > "$dir/apt-cache"
    chmod +x "$dir/curl" "$dir/systemctl" "$dir/apt-cache"
    printf '%s' "$dir"
}

dk_bin="$(new_docker_bin)"; dk_rc=0
dk_out="$( ( PATH="$dk_bin"; OS_FAMILY=debian; OPT_DRY_RUN=0; ensure_docker ) 2>&1 )" || dk_rc=$?
if [ "$dk_rc" -eq 0 ] && printf '%s' "$dk_out" | grep -q 'the get.docker.com script failed'; then
    pass "a get.docker.com download that fails is reported, not taken for success"
else
    fail "a get.docker.com download that fails is reported, not taken for success (exit $dk_rc: $dk_out)"
fi
assert_eq "on Ubuntu the fallback installs docker.io with docker-compose-v2" \
    "apt-get update -q|apt-get install -y docker.io docker-compose-v2" "$(calls_of "$dk_bin")"

dk_bin="$(new_docker_bin)"
( PATH="$dk_bin"; STUB_NO_V2=1; export STUB_NO_V2; OS_FAMILY=debian; OPT_DRY_RUN=0; ensure_docker ) >/dev/null 2>&1 || true
assert_eq "without docker-compose-v2 (Debian 13) the fallback installs docker-compose" \
    "apt-get update -q|apt-get install -y docker.io docker-compose" "$(calls_of "$dk_bin")"

dk_bin="$(new_docker_bin)"
( PATH="$dk_bin"; OS_FAMILY=rhel; OPT_DRY_RUN=0; ensure_docker ) >/dev/null 2>&1 || true
assert_eq "on the RHEL family the fallback installs Docker CE from Docker's repository" \
    "dnf install -y dnf-plugins-core|dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo|dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin" \
    "$(calls_of "$dk_bin")"

}

# The two fallback failures run in a fresh bash, not a subshell of this file.
# Inside $(...) or to the left of ||, bash switches errexit OFF — verified: in
# a subshell here, a failed `apt-get update` with its die removed carried on
# to the NEXT die, whose message this test then accepted. A real run has
# errexit on and would have exited raw at the update, with no ERROR line.
# A fresh process sources install.sh's own `set -euo pipefail` and behaves
# exactly like the installer.
# fallback_fails_at <apt-get subcommand>: ensure_docker as a real run does it,
# with get.docker.com unreachable and apt-get failing at that subcommand.
fallback_fails_at() {
    local bin; bin="$(new_docker_bin)"
    STUB_PM_FAIL_ON="$1" PATH="$bin" \
        bash -c 'source "$1"; OS_FAMILY=debian; OPT_DRY_RUN=0; ensure_docker' _ "$install_abs" 2>&1
}
for failing_step in update install; do
    fb_rc=0
    fb_out="$(fallback_fails_at "$failing_step")" || fb_rc=$?
    if [ "$fb_rc" -ne 0 ] && printf '%s' "$fb_out" | grep -q 'ERROR: .*Install Docker Engine 24 or newer'; then
        pass "a fallback whose apt-get $failing_step fails stops with what to do, not a raw exit"
    else
        fail "a fallback whose apt-get $failing_step fails stops with what to do, not a raw exit (exit $fb_rc: $fb_out)"
    fi
done

log "A clone that cannot read the repository says what git said"
GITERR_ROOT="$(mktemp -d -p "$TMP")"
GITERR_BIN="$(mktemp -d -p "$TMP")"
cat > "$GITERR_BIN/git" <<'STUB'
#!/bin/sh
echo "GIT_TERMINAL_PROMPT=${GIT_TERMINAL_PROMPT:-unset}" >> "$(dirname "$0")/calls"
echo "fatal: unable to access 'https://example.invalid/prizy.git/': Could not resolve host: example.invalid" >&2
exit 128
STUB
chmod +x "$GITERR_BIN/git"
gerr_rc=0
# shellcheck disable=SC2030,SC2031
gerr_out="$( ( PATH="$GITERR_BIN:$PATH"; PRIZY_ROOT="$GITERR_ROOT"; SOURCE_DIR="$GITERR_ROOT/source"
    OPT_SOURCE_PATH=""; OPT_REF="main"; OPT_DRY_RUN=0; fetch_source ) 2>&1 )" || gerr_rc=$?
if [ "$gerr_rc" -ne 0 ] && printf '%s' "$gerr_out" | grep -q 'git said: fatal: .*Could not resolve host'; then
    pass "an unreadable repository is reported with git's own reason"
else
    fail "an unreadable repository is reported with git's own reason (exit $gerr_rc: $gerr_out)"
fi
if grep -q 'GIT_TERMINAL_PROMPT=0' "$GITERR_BIN/calls" 2>/dev/null; then
    pass "git is told never to ask for credentials on the terminal"
else
    fail "git is told never to ask for credentials on the terminal"
fi

echo
if [ "$SKIPPED" -gt 0 ]; then
    printf '\033[0;33m%d check(s) skipped — see the skip lines above\033[0m\n' "$SKIPPED"
fi
if [ "$FAILED" -eq 0 ]; then
    printf '\033[0;32mInstaller unit tests passed\033[0m\n'
else
    printf '\033[0;31mInstaller unit tests FAILED\033[0m\n'
    exit 1
fi
