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
docker build -f Dockerfile.prod --target runtime -t "$IMAGE" .

log "The image carries the application"
# NOT `artisan --version` yet — that needs vendor/autoload.php, which the
# vendor stage does not build until Task 2. Asserting it here would only pass
# by copying the host's vendor/ into the image, dev dependencies and all.
assert_in_image "php runs in the image" "php --version"
assert_in_image "artisan is present" "test -f /var/www/html/artisan"
assert_in_image "the app source is present" "test -f /var/www/html/bootstrap/app.php"
assert_not_in_image "no .env is baked in" "test -f /var/www/html/.env"
assert_not_in_image "the host's vendor/ was not copied in" "test -d /var/www/html/vendor/pestphp"

log "No developer working-tree artifacts leaked in (2026-09-21 review: .dockerignore was a denylist, so anything not named there shipped)"
assert_not_in_image "no .superpowers/ (design-review diffs of this codebase)" "test -e /var/www/html/.superpowers"
assert_not_in_image "no .claude/" "test -e /var/www/html/.claude"
assert_not_in_image "no .idea/" "test -e /var/www/html/.idea"
assert_not_in_image "no .deptrac.cache" "test -e /var/www/html/.deptrac.cache"
assert_not_in_image "no .playwright-libs/" "test -e /var/www/html/.playwright-libs"
assert_not_in_image "no .git/" "test -e /var/www/html/.git"
assert_not_in_image "no .filo/ (call-tracer output)" "test -e /var/www/html/.filo"
assert_not_in_image "no phpunit.xml (hardcodes APP_KEY + DB_PASSWORD)" "test -f /var/www/html/phpunit.xml"
assert_not_in_image "no docker-compose.yml" "test -f /var/www/html/docker-compose.yml"
assert_not_in_image "no dev Dockerfile" "test -f /var/www/html/Dockerfile"
assert_not_in_image "no PRD.md" "test -f /var/www/html/PRD.md"
assert_not_in_image "no schema.sql" "test -f /var/www/html/schema.sql"
assert_not_in_image "no .env.example" "test -f /var/www/html/.env.example"
assert_not_in_image "no dev-server fonts manifest" "test -f /var/www/html/public/fonts-manifest.dev.json"

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

log "storage/ ships only the skeleton the entrypoint needs, none of a builder's content"
# storage/ is excluded from the build context entirely (see .dockerignore);
# Dockerfile.prod's runtime stage recreates just the empty directory
# skeleton. These prove both halves: the skeleton exists (entrypoint.sh's
# artisan cache commands need framework/views etc. to exist), and nothing a
# developer's local run put there (dev-compiled Blade views, this builder's
# sessions, cached data, or anything storage/app/{public,private} held) rode
# along.
for dir in \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    storage/app/public \
    storage/app/private; do
    assert_in_image "$dir exists (skeleton)" "test -d /var/www/html/$dir"
    assert_not_in_image "$dir is empty (no host content baked in)" \
        "test -n \"\$(ls -A /var/www/html/$dir 2>/dev/null)\""
done
# storage/*.key only excluded one level deep in the old denylist, so a nested
# secret such as storage/oauth/*.key would have shipped; the allowlist
# excludes all of storage/ by default, so this is moot at any depth.
assert_not_in_image "no storage/oauth/ (or anything else outside the skeleton)" \
    "test -e /var/www/html/storage/oauth"

log "PHP is configured for production"
# memory_limit and opcache.memory_consumption differ from BOTH the
# compiled-in PHP default AND php.ini-production's values (128M / 128
# respectively, confirmed by diffing `php -i` with and without
# docker/prod/php.ini) so, unlike the two assertions below, they actually
# prove the custom ini loaded rather than just restating a base-image
# default (2026-09-21 review).
assert_in_image "the custom php.ini is loaded (memory_limit, not the base image's 128M default)" \
    "php -i | grep -q 'memory_limit => 512M => 512M'"
assert_in_image "opcache is tuned by the custom ini (memory_consumption, not the base image's 128 default)" \
    "php -i | grep -q 'opcache.memory_consumption => 192 => 192'"
assert_in_image "opcache does not stat files on every request (this IS custom - base default is On)" \
    "php -i | grep -q 'opcache.validate_timestamps => Off => Off'"
# These two hold even with docker/prod/php.ini deleted - php.ini-production
# already sets them this way - so on their own they don't prove the custom
# ini loaded. Kept as direct assertions of a real production-safety
# property (labelled honestly); the three assertions above are what pin the
# custom ini.
assert_in_image "opcache is enabled (already the base image's default, not proof of the custom ini)" \
    "php -i | grep -q 'opcache.enable => On => On'"
assert_in_image "errors are not displayed (already php.ini-production's default, not proof of the custom ini)" \
    "php -i | grep -q 'display_errors => Off => Off'"

log "The fpm pool is sized past the base image's default"
# The base php:8.5-fpm image ships pm.max_children = 5; docker/prod/fpm-pool.conf
# now sets it explicitly (default 8, see that file's comment for the memory
# arithmetic). `php-fpm -tt` dumps the pool's effective config without
# starting the daemon.
assert_in_image "pm.max_children is no longer the base image's default of 5" \
    "php-fpm -tt 2>&1 | grep -q 'pm.max_children = 8'"

for ext in pdo_pgsql pgsql zip intl pcntl redis; do
    assert_in_image "extension $ext is loaded" "php -m | grep -qx $ext"
done
assert_not_in_image "pcov is absent (coverage driver, CI only)" "php -m | grep -qx pcov"

log "The container runs unprivileged"
assert_not_in_image "does not run as root" "test \"\$(id -un)\" = root"
assert_in_image "runs as the www-data user" "test \"\$(id -un)\" = www-data"
assert_in_image "the app root is not world-writable (not the base image's inherited 1777)" \
    "test \"\$(stat -c %a /var/www/html)\" = 755"

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
# The container wrote these files as uid 33, so the host user generally cannot
# remove them — clean up from inside a root container. Cleanup must never decide
# the script's exit code: under `set -e` a failing `rm` here would fail the whole
# run with zero failing assertions, which in CI looks exactly like a broken image.
if [ -n "$empty_storage" ]; then
    docker run --rm --user 0 -v "$empty_storage:/cleanup" --entrypoint sh "$IMAGE" \
        -c 'rm -rf /cleanup/* /cleanup/.[!.]*' >/dev/null 2>&1 || true
    rmdir "$empty_storage" 2>/dev/null || true
fi

log "The image declares a working healthcheck"
if docker image inspect --format '{{.Config.Healthcheck.Test}}' "$IMAGE" | grep -q cgi-fcgi; then
    pass "HEALTHCHECK is declared"
else
    fail "HEALTHCHECK is declared"
fi

# Start fpm, then ping the pool over FastCGI the way the healthcheck does.
# The entrypoint runs three artisan cache commands (config:cache,
# route:cache, view:cache) before it execs php-fpm, so a fixed sleep can
# undershoot on a loaded runner and fail this assertion spuriously even
# though the image is fine. Poll with a bounded retry instead of guessing a
# wait time.
cid=$(docker run -d -e APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= "$IMAGE")
ping_ok=0
for _ in $(seq 1 30); do
    if docker exec "$cid" sh -c \
        'SCRIPT_NAME=/ping SCRIPT_FILENAME=/ping REQUEST_METHOD=GET \
         cgi-fcgi -bind -connect 127.0.0.1:9000' 2>/dev/null | grep -q pong; then
        ping_ok=1
        break
    fi
    sleep 1
done
if [ "$ping_ok" -eq 1 ]; then
    pass "the fpm pool answers /ping with pong"
else
    fail "the fpm pool answers /ping with pong"
fi
docker rm -f "$cid" >/dev/null 2>&1 || true

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mProduction image smoke tests FAILED\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mProduction image smoke tests passed\033[0m\n'
