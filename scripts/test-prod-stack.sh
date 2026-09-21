#!/usr/bin/env bash
# Integration test for the production stack (docker-compose.prod.yml).
#
# Brings the real stack up against a throwaway .env of random secrets, proves
# it serves, then tears it down. This is the only test that can catch nginx
# pointing at the wrong socket, a missing environment variable, or a migration
# that does not run — none of which a config-level assertion would notice.
#
# Runs under its own Compose project name and its own port, so it cannot
# disturb a developer's running dev stack.
#
# Usage: bash scripts/test-prod-stack.sh
set -euo pipefail

PROJECT="prizy-stacktest"
HTTP_PORT="18080"
ENV_FILE="$(mktemp)"
export ENV_FILE   # Compose interpolates ${ENV_FILE} in the service's env_file
FAILED=0

log()  { printf '\033[0;34m==>\033[0m %s\n' "$1"; }
pass() { printf '  \033[0;32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[0;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }

compose() { docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" -p "$PROJECT" "$@"; }

# Teardown must run whatever happens, and must not change the exit code.
cleanup() {
    local status=$?
    compose down -v --remove-orphans >/dev/null 2>&1 || true
    rm -f "$ENV_FILE" || true
    return $status
}
trap cleanup EXIT

secret() { openssl rand -hex 24; }

log "Generating a throwaway environment"
cat > "$ENV_FILE" <<ENV
APP_NAME=Prizy
APP_ENV=production
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=false
APP_URL=http://localhost:${HTTP_PORT}
APP_BASE_DOMAIN=localhost
HTTP_PORT=${HTTP_PORT}
# Match .env.production.example: this app's session/cache/queue stores are
# Redis by design — there is no sessions table migration, so leaving these
# unset falls back to Laravel's own SESSION_DRIVER=database default and 500s
# on the very first request that starts a session, against a config no real
# install ever runs.
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
POSTGRES_PASSWORD=$(secret)
PRIZY_APP_DB_PASSWORD=$(secret)
REDIS_PASSWORD=$(secret)
ENV

log "Bringing the stack up"
compose up -d --build --wait

log "Data services are healthy and unreachable from outside"
if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -c 'postgres healthy')" -eq 1 ]; then
    pass "postgres is healthy"
else
    fail "postgres is healthy"
fi
if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -c 'redis healthy')" -eq 1 ]; then
    pass "redis is healthy"
else
    fail "redis is healthy"
fi
# `compose port` prints "host:port" for a published binding. When a service
# publishes nothing, older Compose exits non-zero; the Compose version this
# repo targets instead exits 0 and prints the empty binding ":0" — so check
# the output, not just the exit code, to catch a leaked port either way.
port_is_unpublished() {
    local output
    output="$(compose port "$1" "$2" 2>/dev/null)" || return 0
    [ -z "$output" ] || [ "$output" = ":0" ]
}
if port_is_unpublished postgres 5432; then
    pass "postgres publishes no port"
else
    fail "postgres publishes no port"
fi
if port_is_unpublished redis 6379; then
    pass "redis publishes no port"
else
    fail "redis publishes no port"
fi

log "The database is initialised for production"
# psql runs inside the container as the superuser; -tAc gives an unadorned value.
psql_super() { compose exec -T postgres psql -U prizy -d prizy -tAc "$1" 2>/dev/null | tr -d '[:space:]'; }

if [ "$(psql_super "SELECT 1 FROM pg_roles WHERE rolname='prizy_app'")" = "1" ]; then
    pass "the prizy_app role exists"
else
    fail "the prizy_app role exists"
fi

# The whole point of the rewrite: the password is the generated one, not
# the literal 'secret' the dev init script uses.
app_pw=$(grep '^PRIZY_APP_DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
if compose exec -T -e PGPASSWORD="$app_pw" postgres \
        psql -U prizy_app -d prizy -h 127.0.0.1 -tAc "SELECT 1" >/dev/null 2>&1; then
    pass "prizy_app can log in with the generated password"
else
    fail "prizy_app can log in with the generated password"
fi
if compose exec -T -e PGPASSWORD=secret postgres \
        psql -U prizy_app -d prizy -h 127.0.0.1 -tAc "SELECT 1" >/dev/null 2>&1; then
    fail "the dev password 'secret' is rejected"
else
    pass "the dev password 'secret' is rejected"
fi

if [ "$(psql_super "SELECT count(*) FROM pg_database WHERE datname='prizy_test'")" = "0" ]; then
    pass "no prizy_test database in production"
else
    fail "no prizy_test database in production"
fi

log "Migrations ran, as the right role"
if [ "$(compose ps -a --format '{{.Service}} {{.State}}' | grep -c 'migrate exited')" -eq 1 ]; then
    pass "the migrate service ran and exited"
else
    fail "the migrate service ran and exited"
fi
if compose exec -T app php artisan migrate:status 2>/dev/null | grep -q "Pending"; then
    fail "no migrations are left pending"
else
    pass "no migrations are left pending"
fi

# THE assertion of this task. prizy_app must OWN the tables, because
# FORCE ROW LEVEL SECURITY only applies to a table's owner — migrating as the
# superuser leaves every tenant-isolation policy inert while the app still
# appears to work.
owner=$(psql_super "SELECT tableowner FROM pg_tables WHERE tablename='workspaces'")
if [ "$owner" = "prizy_app" ]; then
    pass "the workspaces table is owned by prizy_app, so RLS applies"
else
    fail "the workspaces table is owned by prizy_app, so RLS applies (owner=$owner)"
fi

if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -c 'app healthy')" -eq 1 ]; then
    pass "the app container reports healthy"
else
    fail "the app container reports healthy"
fi

log "nginx serves the application"
base="http://localhost:${HTTP_PORT}"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/up")" = "200" ]; then
    pass "/up returns 200 through nginx"
else
    fail "/up returns 200 through nginx"
fi

# /up is a framework-level route and proves only that Laravel can answer a
# health check, not that the application actually boots and routes a real
# page. The bare root ("/") is NOT that proof on this host: it carries
# NeedsTenant with no exemption, and WorkspaceTenantFinder deliberately
# returns no tenant when the request Host equals APP_BASE_DOMAIN (localhost
# here) — so "/" 500s by design on the landlord domain. /health and /signup
# are both landlord-reachable and between them prove the app boots, routes to
# a controller, and renders a view.
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/health")" = "200" ]; then
    pass "/health returns 200 (the app boots and routes to a controller)"
else
    fail "/health returns 200 (the app boots and routes to a controller)"
fi
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/signup")" = "200" ]; then
    pass "/signup returns 200 (the SPA shell renders on the landlord host)"
else
    fail "/signup returns 200 (the SPA shell renders on the landlord host)"
fi

# Prove nginx serves static files itself rather than proxying everything to
# fpm. Take a real hashed filename out of the manifest inside the image.
asset=$(compose exec -T app sh -c \
    "php -r 'echo array_values(json_decode(file_get_contents(\"/var/www/html/public/build/manifest.json\"), true))[0][\"file\"];'" \
    2>/dev/null | tr -d '\r')
if [ -n "$asset" ] && [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/build/$asset")" = "200" ]; then
    pass "a hashed asset is served (build/$asset)"
else
    fail "a hashed asset is served (build/$asset)"
fi

# A PHP file must never be served as text. If this returns the source of
# index.php, the fastcgi wiring is wrong in the most dangerous way.
if curl -s "$base/index.php" | grep -q '<?php'; then
    fail "PHP source is not served as text"
else
    pass "PHP source is not served as text"
fi

# grep -q '<?php' above also passes on a 404 or a 500, which would prove
# nothing was served rather than that PHP was executed. Pin down that
# index.php actually ran: a statically served .php file would arrive as
# application/octet-stream (nginx has no MIME mapping for .php), so an
# html Content-Type is only possible if fpm executed and rendered it.
if curl -s -I "$base/index.php" | grep -qi '^Content-Type: *text/html'; then
    pass "index.php is executed by fpm, not served statically (Content-Type: text/html)"
else
    fail "index.php is executed by fpm, not served statically (Content-Type: text/html)"
fi

if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -c 'web healthy')" -eq 1 ]; then
    pass "the web container reports healthy"
else
    fail "the web container reports healthy"
fi

log "Background roles run without blocking the deploy"
for svc in worker scheduler; do
    if [ "$(compose ps --format '{{.Service}} {{.State}}' | grep -c "$svc running")" -eq 1 ]; then
        pass "$svc is running"
    else
        fail "$svc is running"
    fi
    # Each role carries its own liveness probe instead of the image's FastCGI
    # ping. Assert it actually reports healthy — "not unhealthy" would also pass
    # for a container with no healthcheck at all, which is the configuration
    # that makes `up --wait` exit 1 on Compose 2.29.1.
    if compose ps --format '{{.Service}} {{.Health}}' | grep -qx "$svc healthy"; then
        pass "$svc reports healthy on its own probe"
    else
        fail "$svc reports healthy on its own probe"
    fi
done

# Reverb is opt-in: absent unless the `realtime` profile is selected.
if compose ps --format '{{.Service}}' | grep -q '^reverb$'; then
    fail "reverb does not start without its profile"
else
    pass "reverb does not start without its profile"
fi

log "A non-fpm role leaves the shared view cache alone"
# Pre-seed a sentinel where compiled views live, run the entrypoint with a
# non-fpm command, and check the sentinel survived. If view:cache runs for
# every role, view:clear deletes it — which is the race this guards.
views_dir=$(mktemp -d)
mkdir -p "$views_dir/framework/views"
echo sentinel > "$views_dir/framework/views/sentinel.txt"
# chmod AFTER building the tree, and recursively: `mkdir -p` applies the host
# umask, so the subdirectories would come out 0755 owned by the host user while
# the container runs as www-data (uid 33). The entrypoint's own `mkdir -p` loop
# would then die on a permission error before ever reaching view:cache, and the
# sentinel would survive for the wrong reason — making this assertion pass
# whether or not the guard exists.
chmod -R 777 "$views_dir"
docker run --rm -v "$views_dir:/var/www/html/storage" \
    -e APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
    --entrypoint prizy-entrypoint "prizy/app:${PRIZY_VERSION:-local}" \
    php artisan about >/dev/null 2>&1 || true
if [ -f "$views_dir/framework/views/sentinel.txt" ]; then
    pass "a non-fpm role does not clear the compiled views"
else
    fail "a non-fpm role does not clear the compiled views"
fi
docker run --rm --user 0 -v "$views_dir:/cleanup" --entrypoint sh \
    "prizy/app:${PRIZY_VERSION:-local}" -c 'rm -rf /cleanup/* /cleanup/.[!.]*' >/dev/null 2>&1 || true
rmdir "$views_dir" 2>/dev/null || true

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mProduction stack tests FAILED\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mProduction stack tests passed\033[0m\n'
