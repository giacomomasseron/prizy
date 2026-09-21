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

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mProduction stack tests FAILED\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mProduction stack tests passed\033[0m\n'
