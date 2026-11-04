#!/usr/bin/env bash
# Tests for scripts/dev-bootstrap.sh, against a fake docker, npm and id.
#
# Each case copies the script into a throwaway checkout that holds only the
# files it reads, and puts fakes first on PATH. The fakes log their arguments
# and leave behind what the real command would (the image, vendor/, an APP_KEY,
# node_modules/), so a second run sees a set-up checkout. CI also runs the real
# script against real Docker on its fresh checkout.
#
# Usage: bash scripts/test-dev-bootstrap.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

FAILED=0

log()  { printf '\033[0;34m==>\033[0m %s\n' "$1"; }
pass() { printf '  \033[0;32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[0;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }

assert_eq() {
    local description="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        pass "$description"
    else
        fail "$description"
        printf '       expected: %s\n' "${expected//$'\n'/$'\n'                 }"
        printf '       actual:   %s\n' "${actual//$'\n'/$'\n'                 }"
    fi
}

assert_contains() {
    local description="$1" needle="$2" haystack="$3"
    case "$haystack" in
        *"$needle"*) pass "$description" ;;
        *)           fail "$description (no '$needle' in: $haystack)" ;;
    esac
}

# The fakes. They run with the checkout as their working directory, because
# the script cd's there, and append to the file $CALLS names.
FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

# SC2016 throughout: $* and friends belong to the fake, expanded when it runs.
# shellcheck disable=SC2016
printf '%s\n' '#!/usr/bin/env bash' \
    'echo "docker $*" >> "$CALLS"' \
    'case "$*" in' \
    '    "image inspect "*) [ -f .fake-image ] ;;' \
    '    "compose build "*) : > .fake-image ;;' \
    '    *"composer install"*)' \
    '        mkdir -p vendor && : > vendor/autoload.php' \
    '        [ -z "${FAKE_COMPOSER_FAILS:-}" ] ;;' \
    '    *"key:generate"*)' \
    '        sed -i.bak "s/^APP_KEY=.*/APP_KEY=base64:fake/" .env && rm -f .env.bak ;;' \
    'esac' > "$FAKEBIN/docker"
# shellcheck disable=SC2016
printf '%s\n' '#!/usr/bin/env bash' \
    'echo "npm $*" >> "$CALLS"' \
    'mkdir -p node_modules' > "$FAKEBIN/npm"
# shellcheck disable=SC2016
printf '%s\n' '#!/usr/bin/env bash' \
    'case "$1" in -u) echo 1234 ;; -g) echo 5678 ;; esac' > "$FAKEBIN/id"
chmod +x "$FAKEBIN/docker" "$FAKEBIN/npm" "$FAKEBIN/id"

# A PATH with the plain tools the script needs and no docker or npm, real or
# fake (CI's runner has a real docker).
BAREBIN="$TMP/bare"
mkdir -p "$BAREBIN"
for tool in cat cmp cp dirname grep id mkdir; do
    ln -s "$(command -v "$tool")" "$BAREBIN/$tool"
done

# new_checkout: prints the path of a throwaway checkout holding the script and
# the files it reads.
new_checkout() {
    local dir
    dir="$(mktemp -d -p "$TMP")"
    mkdir -p "$dir/scripts"
    cp "$ROOT/scripts/dev-bootstrap.sh" "$dir/scripts/"
    printf 'APP_ENV=local\nAPP_KEY=\n' > "$dir/.env.example"
    printf '{"content-hash": "one"}\n' > "$dir/composer.lock"
    printf '{"lockfileVersion": 3}\n' > "$dir/package-lock.json"
    echo "$dir"
}

# run_bootstrap <checkout> [NAME=value...]: runs the script from another
# directory (it must find the checkout itself) with the fakes on PATH. Sets
# OUT (stdout + stderr), RC (exit status) and CALLED (the fakes' log).
run_bootstrap() {
    local dir="$1"
    shift
    : > "$dir/.calls"
    RC=0
    OUT="$(cd "$TMP" && env CALLS="$dir/.calls" PATH="$FAKEBIN:$PATH" ${1+"$@"} \
        bash "$dir/scripts/dev-bootstrap.sh" 2>&1)" || RC=$?
    CALLED="$(cat "$dir/.calls")"
}

INSPECT='docker image inspect prizy/app:dev'
BUILD='docker compose build --build-arg UID=1234 --build-arg GID=5678 app'
COMPOSER='docker compose run --rm -T app composer install --no-interaction --prefer-dist'
KEY='docker compose run --rm -T app php artisan key:generate'
NPM='npm install --no-audit --no-fund'

log "A fresh clone"
fresh="$(new_checkout)"
run_bootstrap "$fresh"
assert_eq "it succeeds" "0" "$RC"
assert_eq "every step runs, in order: image, PHP deps, key, JS deps" \
    "$INSPECT"$'\n'"$BUILD"$'\n'"$COMPOSER"$'\n'"$KEY"$'\n'"$NPM" "$CALLED"
assert_eq ".env is .env.example with a generated key" \
    $'APP_ENV=local\nAPP_KEY=base64:fake' "$(cat "$fresh/.env")"
assert_contains "it says what it is doing" "Creating .env" "$OUT"

log "The same checkout, run again"
run_bootstrap "$fresh"
assert_eq "it succeeds" "0" "$RC"
assert_eq "nothing runs but the image check" "$INSPECT" "$CALLED"
assert_eq "it prints nothing" "" "$OUT"

log "After a pull that changed composer.lock"
printf '{"content-hash": "two"}\n' > "$fresh/composer.lock"
run_bootstrap "$fresh"
assert_eq "only composer install runs" "$INSPECT"$'\n'"$COMPOSER" "$CALLED"
run_bootstrap "$fresh"
assert_eq "and once only" "$INSPECT" "$CALLED"

log "After a pull that changed package-lock.json"
printf '{"lockfileVersion": 3, "name": "two"}\n' > "$fresh/package-lock.json"
run_bootstrap "$fresh"
assert_eq "only npm install runs" "$INSPECT"$'\n'"$NPM" "$CALLED"
run_bootstrap "$fresh"
assert_eq "and once only" "$INSPECT" "$CALLED"

log "An existing .env"
own="$(new_checkout)"
printf 'APP_KEY=base64:mine\nMAIL_HOST=custom\n' > "$own/.env"
run_bootstrap "$own"
assert_eq "a .env with a key is left exactly as it was" \
    $'APP_KEY=base64:mine\nMAIL_HOST=custom' "$(cat "$own/.env")"
case "$CALLED" in
    *key:generate*) fail "no key is generated when .env has one" ;;
    *)              pass "no key is generated when .env has one" ;;
esac

keyless="$(new_checkout)"
printf 'APP_KEY=\nMAIL_HOST=custom\n' > "$keyless/.env"
run_bootstrap "$keyless"
assert_eq "a .env without a key gets one and keeps its other settings" \
    $'APP_KEY=base64:fake\nMAIL_HOST=custom' "$(cat "$keyless/.env")"

log "Composer's GitHub token"
token="$(new_checkout)"
run_bootstrap "$token" COMPOSER_AUTH='{"github-oauth": {}}'
assert_contains "COMPOSER_AUTH reaches the container when it is set" \
    'docker compose run --rm -T -e COMPOSER_AUTH app composer install' "$CALLED"

log "A composer install that fails part-way"
broken="$(new_checkout)"
run_bootstrap "$broken" FAKE_COMPOSER_FAILS=1
if [ "$RC" -ne 0 ]; then pass "the script fails too"; else fail "the script fails too"; fi
case "$CALLED" in
    *key:generate*|*"npm install"*) fail "it stops there" ;;
    *)                              pass "it stops there" ;;
esac
run_bootstrap "$broken"
assert_contains "the next run installs again, though vendor/ exists" "$COMPOSER" "$CALLED"
# The same after a pull, when the last good install left its copy of the lock:
# that copy must stay the old one until an install of the new lock succeeds.
printf '{"content-hash": "two"}\n' > "$broken/composer.lock"
run_bootstrap "$broken" FAKE_COMPOSER_FAILS=1
run_bootstrap "$broken"
assert_contains "a failed install after a pull is retried too" "$COMPOSER" "$CALLED"

log "Missing tools"
nodocker="$(new_checkout)"
cp "$FAKEBIN/npm" "$BAREBIN/npm"
RC=0
OUT="$(cd "$TMP" && env CALLS=/dev/null PATH="$BAREBIN" "$BASH" "$nodocker/scripts/dev-bootstrap.sh" 2>&1)" || RC=$?
if [ "$RC" -ne 0 ]; then pass "no docker: it fails"; else fail "no docker: it fails"; fi
assert_contains "no docker: it says so" "docker not found" "$OUT"
if [ ! -e "$nodocker/.env" ]; then pass "no docker: it changes nothing"; else fail "no docker: it changes nothing"; fi
rm "$BAREBIN/npm"

nonpm="$(new_checkout)"
cp "$FAKEBIN/docker" "$BAREBIN/docker"
RC=0
OUT="$(cd "$TMP" && env CALLS=/dev/null PATH="$BAREBIN" "$BASH" "$nonpm/scripts/dev-bootstrap.sh" 2>&1)" || RC=$?
if [ "$RC" -ne 0 ]; then pass "no npm: it fails"; else fail "no npm: it fails"; fi
assert_contains "no npm: it says so" "npm not found" "$OUT"
rm "$BAREBIN/docker"

log "Wiring"
assert_contains "the image it checks is the one docker-compose.yml builds" \
    "image: prizy/app:dev" "$(cat "$ROOT/docker-compose.yml")"
for script in dev dev:full setup; do
    assert_eq "composer $script turns the process timeout off, then bootstraps" \
        $'Composer\\Config::disableProcessTimeout\nbash scripts/dev-bootstrap.sh' \
        "$(jq -r --arg s "$script" '.scripts[$s][0:2][]' "$ROOT/composer.json")"
done
assert_eq "composer setup does nothing else" "2" \
    "$(jq --arg s setup '.scripts[$s] | length' "$ROOT/composer.json")"

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mdev-bootstrap tests failed\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mall dev-bootstrap tests passed\033[0m\n'
