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

log "PHP dependencies are installed, build tooling is not"
assert_in_image "vendor/autoload.php exists" "test -f /var/www/html/vendor/autoload.php"
assert_in_image "artisan boots against the installed dependencies" \
    "php /var/www/html/artisan --version"
assert_in_image "package discovery ran at build time" "test -f /var/www/html/bootstrap/cache/packages.php"
assert_not_in_image "composer is absent from the runtime" "command -v composer"
assert_not_in_image "dev dependencies are absent (pest)" "test -d /var/www/html/vendor/pestphp"
# The host's bootstrap/cache is built from a --dev install, so it registers
# Pest, Pail and Collision. Excluding it from the build context is what keeps
# those out; this assertion is what proves the exclusion works.
assert_not_in_image "no dev service providers are registered" \
    "grep -q PestServiceProvider /var/www/html/bootstrap/cache/packages.php"

log "Frontend assets are compiled in, build tooling is not"
assert_in_image "the Vite manifest exists" "test -f /var/www/html/public/build/manifest.json"
assert_in_image "the manifest lists the app entrypoint" \
    "grep -q 'resources/js/main.tsx' /var/www/html/public/build/manifest.json"
assert_not_in_image "node is absent from the runtime" "command -v node"
assert_not_in_image "node_modules is absent" "test -d /var/www/html/node_modules"
assert_not_in_image "no public/hot (would point @vite at a dead dev server)" \
    "test -f /var/www/html/public/hot"

log "PHP is configured for production"
assert_in_image "opcache is enabled" "php -i | grep -q 'opcache.enable => On => On'"
assert_in_image "opcache does not stat files on every request" \
    "php -i | grep -q 'opcache.validate_timestamps => Off => Off'"
assert_in_image "errors are not displayed" "php -i | grep -q 'display_errors => Off => Off'"

for ext in pdo_pgsql pgsql zip intl pcntl redis; do
    assert_in_image "extension $ext is loaded" "php -m | grep -qx $ext"
done
assert_not_in_image "pcov is absent (coverage driver, CI only)" "php -m | grep -qx pcov"

log "The container runs unprivileged"
assert_not_in_image "does not run as root" "test \"\$(id -un)\" = root"
assert_in_image "runs as the www-data user" "test \"\$(id -un)\" = www-data"

log "The entrypoint survives a mount over storage/"
# A fresh volume is NOT a sufficient test: Docker copies the image directory's
# contents and ownership up into an empty volume, so the skeleton is already
# there and this would pass with the entrypoint's mkdir loop deleted. Keep it
# anyway — it proves the image's chown survives copy-up — but label it for what
# it tests.
if docker run --rm -v /var/www/html/storage \
        -e APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
        --entrypoint prizy-entrypoint "$IMAGE" \
        php artisan config:cache >/dev/null 2>&1; then
    pass "a fresh volume is writable by the runtime user (copy-up keeps the chown)"
else
    fail "a fresh volume is writable by the runtime user (copy-up keeps the chown)"
fi

# A bind mount has no copy-up, so the entrypoint must create every directory
# itself. This is also what an operator gets on an UPGRADE, when the volume
# already exists and no longer matches the new image.
empty_storage=$(mktemp -d)
chmod 777 "$empty_storage"   # the container runs as www-data (uid 33)
if docker run --rm -v "$empty_storage:/var/www/html/storage" \
        -e APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
        --entrypoint prizy-entrypoint "$IMAGE" \
        php artisan config:cache >/dev/null 2>&1; then
    pass "config:cache succeeds over an empty bind-mounted storage"
else
    fail "config:cache succeeds over an empty bind-mounted storage"
fi

# Inspect the host side: this is what proves the mkdir loop ran, rather than
# the skeleton having been inherited from the image.
if [ -d "$empty_storage/framework/views" ] && [ -d "$empty_storage/framework/cache/data" ]; then
    pass "the entrypoint created the framework directories"
else
    fail "the entrypoint created the framework directories"
fi
[ -n "$empty_storage" ] && rm -rf "$empty_storage"

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mProduction image smoke tests FAILED\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mProduction image smoke tests passed\033[0m\n'
