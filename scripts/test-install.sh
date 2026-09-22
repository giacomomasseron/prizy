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
key_a="$(gen_secret_for APP_KEY)"
key_b="$(gen_secret_for APP_KEY)"
case "$key_a" in
    base64:*) pass "APP_KEY carries the base64: prefix Laravel requires" ;;
    *)        fail "APP_KEY carries the base64: prefix Laravel requires" ;;
esac
if [ "$key_a" != "$key_b" ]; then
    pass "two APP_KEYs differ (not a constant)"
else
    fail "two APP_KEYs differ (not a constant)"
fi
pw="$(gen_secret_for POSTGRES_PASSWORD)"
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

merged="$(merge_env "$TMP/existing" "$TMP/template")"

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
merged_fresh="$(merge_env "$TMP/does-not-exist" "$TMP/template")"
if printf '%s' "$merged_fresh" | grep -qx 'POSTGRES_PASSWORD='; then
    pass "with no existing file, a GENERATED key stays empty for the caller to fill"
else
    fail "with no existing file, a GENERATED key stays empty for the caller to fill"
fi

log "The .env merge — an EMPTY existing value is not treated as a real value"
printf 'POSTGRES_PASSWORD=\n' > "$TMP/empty-existing"
merged_empty="$(merge_env "$TMP/empty-existing" "$TMP/template")"
if printf '%s' "$merged_empty" | grep -qx 'POSTGRES_PASSWORD='; then
    pass "an empty existing value does not win over the template"
else
    fail "an empty existing value does not win over the template"
fi

log "The .env merge — values containing = and # are preserved whole"
printf 'MAIL_PASSWORD=p=a#ss/w+rd==\n' > "$TMP/tricky"
merged_tricky="$(merge_env "$TMP/tricky" "$TMP/template")"
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
merged_padded="$(merge_env "$TMP/padded-existing" "$TMP/template")"
if printf '%s' "$merged_padded" | grep -qx 'POSTGRES_PASSWORD=live-database-password'; then
    pass "a space-padded KEY = value survives the merge under its canonical key"
else
    fail "a space-padded KEY = value survives the merge under its canonical key"
fi

# Compose strips a trailing \r, so a .env saved with CRLF line endings (an
# editor default on Windows) must not glue a literal \r onto every
# preserved value on every re-run.
printf 'POSTGRES_PASSWORD=live-database-password\r\n' > "$TMP/crlf-existing"
merged_crlf="$(merge_env "$TMP/crlf-existing" "$TMP/template")"
if printf '%s' "$merged_crlf" | grep -qx 'POSTGRES_PASSWORD=live-database-password'; then
    pass "a CRLF existing file's value arrives without a trailing CR"
else
    fail "a CRLF existing file's value arrives without a trailing CR"
fi

# A whitespace-only value trims to empty under Compose's rules, so it must
# fall through to the template exactly like a truly empty value does — not
# "win" the merge as if it were a real secret.
printf 'POSTGRES_PASSWORD=   \n' > "$TMP/whitespace-only-existing"
merged_ws="$(merge_env "$TMP/whitespace-only-existing" "$TMP/template")"
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
    value="$(grep "^${key}=" "$GEN_TMP/.env" | head -n1 | cut -d= -f2-)"
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
live_pw="$(grep '^POSTGRES_PASSWORD=' "$GEN_TMP/.env" | cut -d= -f2-)"
live_key="$(grep '^APP_KEY=' "$GEN_TMP/.env" | cut -d= -f2-)"
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
generated_redis="$(grep '^REDIS_PASSWORD=' "$FAKE_ROOT/source/.env" | cut -d= -f2-)"
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
live_db_pw="$(grep '^POSTGRES_PASSWORD=' "$FAKE_ROOT/source/.env" | cut -d= -f2-)"
(
    PRIZY_ROOT="$FAKE_ROOT"; SOURCE_DIR="$FAKE_ROOT/source"
    OPT_SOURCE_PATH="$CHECKOUT"; OPT_DRY_RUN=0
    fetch_source
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
if [ -f "$FAKE_ROOT/source/.env" ]; then
    live_db_pw_after="$(grep '^POSTGRES_PASSWORD=' "$FAKE_ROOT/source/.env" | cut -d= -f2-)"
else
    live_db_pw_after="<the install has no .env at all>"
fi
assert_eq "the install's own POSTGRES_PASSWORD survives a --source-path re-run" \
    "$live_db_pw" "$live_db_pw_after"

log ".env backups land in PRIZY_ROOT/backups, and never collide"
(
    PRIZY_ROOT="$FAKE_ROOT"; SOURCE_DIR="$FAKE_ROOT/source"
    OPT_DOMAIN="example.com"; OPT_EMAIL="ops@example.com"; OPT_MAIL="log"
    OPT_HTTP_PORT="80"; OPT_HTTPS_PORT="443"; OPT_WITH_REALTIME=0; OPT_DRY_RUN=0
    configure
    configure
) >/dev/null 2>&1 || true   # a step that dies must redden the assertions below, not abort the file
# Two in the same second, which is what `date +…%S` alone could not name apart.
assert_eq "two .env backups written within one second are both kept" "2" \
    "$(find "$FAKE_ROOT/backups" -maxdepth 1 -name '.env-*' | wc -l)"
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
null_redis="$(grep '^REDIS_PASSWORD=' "$NULL_TMP/.env" | cut -d= -f2-)"
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

log "Every PRIZY_* variable is documented in --help"
help_text="$(bash "$INSTALL_SH" --help 2>&1)"
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
