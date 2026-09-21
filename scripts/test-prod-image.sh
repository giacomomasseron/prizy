#!/usr/bin/env bash
# Smoke tests for the production image (Dockerfile.prod).
#
# These assert the PROPERTIES of the image, not the behaviour of the app —
# the app's behaviour is covered by the Pest and vitest suites. What can only
# be checked here: that the image carries the application, that build-time
# tooling did not leak into it, and that it runs as a non-root user.
#
# Usage: bash scripts/test-prod-image.sh
set -euo pipefail

IMAGE="${IMAGE:-prizy/app:test}"
FAILED=0

log()  { printf '\033[0;34m==>\033[0m %s\n' "$1"; }
pass() { printf '  \033[0;32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[0;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }

# Runs a command inside a throwaway container; passes when it exits 0.
assert_in_image() {
    local description="$1" command="$2"
    if docker run --rm --entrypoint sh "$IMAGE" -c "$command" >/dev/null 2>&1; then
        pass "$description"
    else
        fail "$description"
    fi
}

# Passes when the command FAILS inside the container (used for "must be absent").
assert_not_in_image() {
    local description="$1" command="$2"
    if docker run --rm --entrypoint sh "$IMAGE" -c "$command" >/dev/null 2>&1; then
        fail "$description"
    else
        pass "$description"
    fi
}

log "Building $IMAGE from Dockerfile.prod"
docker build -f Dockerfile.prod -t "$IMAGE" .

log "The image carries the application"
# NOT `artisan --version` yet — that needs vendor/autoload.php, which the
# vendor stage does not build until Task 2. Asserting it here would only pass
# by copying the host's vendor/ into the image, dev dependencies and all.
assert_in_image "php runs in the image" "php --version"
assert_in_image "artisan is present" "test -f /var/www/html/artisan"
assert_in_image "the app source is present" "test -f /var/www/html/bootstrap/app.php"
assert_not_in_image "no .env is baked in" "test -f /var/www/html/.env"
assert_not_in_image "the host's vendor/ was not copied in" "test -d /var/www/html/vendor/pestphp"

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mProduction image smoke tests FAILED\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mProduction image smoke tests passed\033[0m\n'
