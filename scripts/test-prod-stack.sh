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
POSTGRES_PASSWORD=$(secret)
PRIZY_APP_DB_PASSWORD=$(secret)
REDIS_PASSWORD=$(secret)
ENV

log "Bringing the stack up"
compose up -d --wait

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

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mProduction stack tests FAILED\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mProduction stack tests passed\033[0m\n'
