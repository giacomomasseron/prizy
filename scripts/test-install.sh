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

log()  { printf '\033[0;34m==>\033[0m %s\n' "$1"; }
pass() { printf '  \033[0;32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[0;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }

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

echo
if [ "$FAILED" -eq 0 ]; then
    printf '\033[0;32mInstaller unit tests passed\033[0m\n'
else
    printf '\033[0;31mInstaller unit tests FAILED\033[0m\n'
    exit 1
fi
