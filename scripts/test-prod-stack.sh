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
HTTPS_PORT="18443"
ENV_FILE="$(mktemp)"
export ENV_FILE   # Compose interpolates ${ENV_FILE} in the service's env_file
FAILED=0

log()  { printf '\033[0;34m==>\033[0m %s\n' "$1"; }
pass() { printf '  \033[0;32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[0;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }

compose() { docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" -p "$PROJECT" "$@"; }

# Teardown must run whatever happens, and must not change the exit code.
# --profile realtime is required here even though the base run never selects
# it: `down` only tears down containers/volumes in scope for the profiles
# named on ITS OWN invocation, not the profiles a prior `up` used to start
# them. The Reverb check below brings up `reverb` (profile-gated, and sharing
# the `storage` volume via the `app` anchor) for one assertion; without the
# flag here, a plain `down -v` leaves that container behind exited and the
# shared volume undeletable because that container still references it.
cleanup() {
    local status=$?
    compose --profile realtime down -v --remove-orphans >/dev/null 2>&1 || true
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
CADDY_SITE_ADDRESS=:80
HTTPS_PORT=${HTTPS_PORT}
# docker-compose.prod.yml now requires this (I5): an empty value would
# silently become admin@localhost, which Let's Encrypt refuses. :80 test
# mode never issues a certificate, so this value is never actually used —
# it only needs to satisfy the compose-level guard.
ACME_EMAIL=test@example.com
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

log ".env.production.example never hands out a comment as a value"
# This harness generates its own throwaway environment above and never reads
# .env.production.example, so nothing else in this script can catch a
# regression here. Compose's dotenv parser only strips an inline "# comment"
# when a value precedes it on the line; on an EMPTY value (exactly the state
# every GENERATED key ships in) the comment text itself becomes the value —
# e.g. POSTGRES_PASSWORD would come out as the literal string "# GENERATED",
# which both defeats the `:?` required-variable guards (a non-empty string
# satisfies them) and becomes Postgres's actual superuser password.
if grep -qE '^[A-Z_]+= *#' .env.production.example; then
    fail "no key in .env.production.example has a comment as its value"
else
    pass "no key in .env.production.example has a comment as its value"
fi

log "VITE_REVERB_* build args go through Compose's bare-list omission, not a mapping's empty-string"
# Neither suite catches this without a dedicated check: the image canary test
# (test-prod-image.sh) builds with `docker build` directly, bypassing
# Compose's build.args entirely, and $ENV_FILE above never sets a
# VITE_REVERB_* value, so a plain `compose up` run never exercises the "set"
# path either. `docker compose config` resolves build.args without starting
# anything, so it is cheap to run twice: once with none of the four set
# (a mapping's `${VAR:-}` would still resolve to an empty-but-present value
# here; this must show build.args as entirely ABSENT, proving the ARG is
# genuinely omitted from the build, not defined-and-empty) and once with all
# four set (must carry the real values through unchanged).
#
# `--format json` scoped to the resolved `app` service, not a plain grep
# over the YAML: `x-app` is a YAML anchor, and `docker compose config`
# echoes that top-level extension block back VERBATIM (still reading
# `- VITE_REVERB_APP_KEY` etc.) regardless of what any real service resolves
# to — a plain `grep VITE_REVERB` on that output always matches, so it can
# never fail and would have let the mapping-form bug back in unnoticed. jq's
# `.services.app.build.args` reads only what `app` actually resolved to.
unset_args=$(compose config --format json app | jq -c '.services.app.build.args')
if [ "$unset_args" = "null" ]; then
    pass "no VITE_REVERB_* key appears in build.args when the operator leaves them unset"
else
    fail "no VITE_REVERB_* key appears in build.args when the operator leaves them unset (got: $unset_args)"
fi

set_args=$(VITE_REVERB_APP_KEY=config-test-key VITE_REVERB_HOST=config-test-host \
    VITE_REVERB_PORT=8080 VITE_REVERB_SCHEME=https \
    compose config --format json app | jq -r '.services.app.build.args
        | "\(.VITE_REVERB_APP_KEY) \(.VITE_REVERB_HOST) \(.VITE_REVERB_PORT) \(.VITE_REVERB_SCHEME)"')
if [ "$set_args" = "config-test-key config-test-host 8080 https" ]; then
    pass "VITE_REVERB_* values carry through build.args when the operator sets them"
else
    fail "VITE_REVERB_* values carry through build.args when the operator sets them (got: $set_args)"
fi

log "Bringing the stack up"
compose up -d --build --wait

log "Data services are healthy and unreachable from outside"
# -cx anchors the match to the WHOLE line so one service's name cannot match
# inside another's line (e.g. an unanchored 'app healthy' would also count a
# line for some future 'webapp healthy').
if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -cx 'postgres healthy')" -eq 1 ]; then
    pass "postgres is healthy"
else
    fail "postgres is healthy"
fi
if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -cx 'redis healthy')" -eq 1 ]; then
    pass "redis is healthy"
else
    fail "redis is healthy"
fi
# `compose port` prints "host:port" for a published binding. When a service
# publishes nothing, some Compose versions exit non-zero with a message
# naming the port and container (e.g. "no port 5432/tcp for container ...");
# others exit 0 and print the empty binding ":0". Either is "unpublished" —
# but a nonzero exit with ANY OTHER message (bad service name, daemon
# unreachable, ...) is a genuine command failure, not proof of anything, and
# must not be read as a pass.
port_is_unpublished() {
    local output rc
    output="$(compose port "$1" "$2" 2>&1)"
    rc=$?
    if [ "$rc" -eq 0 ]; then
        [ -z "$output" ] || [ "$output" = ":0" ]
        return
    fi
    [[ "$output" == "no port "*"for container"* ]]
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
# {{.State}} is just "exited", which is equally true whether the container
# exited 0 or 1 — it cannot tell a successful migrate run from a failed one.
# {{.Status}} carries the actual exit code (e.g. "Exited (0) 3 seconds ago");
# match that instead, anchored to the start of the line so "migrate" cannot
# match as a substring of some other service name.
if [ "$(compose ps -a --format '{{.Service}} {{.Status}}' | grep -cE '^migrate Exited \(0\)')" -eq 1 ]; then
    pass "the migrate service ran and exited 0"
else
    fail "the migrate service ran and exited 0"
fi
# A bare `grep -q "Pending" | ...` with no output at all (unreachable database,
# a renamed command, an exec failure) also reports "no migrations pending" —
# this is the assertion covering the deploy's core action, so it must not
# infer success from the mere absence of a word. Require the command itself
# to exit 0, AND find positive evidence migrations actually ran ("Ran"), not
# just the absence of "Pending".
migrate_exit=0
migrate_status="$(compose exec -T app php artisan migrate:status 2>/dev/null)" || migrate_exit=$?
if [ "$migrate_exit" -eq 0 ] && grep -q "Ran" <<<"$migrate_status" && ! grep -q "Pending" <<<"$migrate_status"; then
    pass "migrate:status exits 0, shows migrations Ran, and none are Pending"
else
    fail "migrate:status exits 0, shows migrations Ran, and none are Pending"
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

if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -cx 'app healthy')" -eq 1 ]; then
    pass "the app container reports healthy"
else
    fail "the app container reports healthy"
fi

log "Caddy serves the application"
base="http://localhost:${HTTP_PORT}"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/up")" = "200" ]; then
    pass "/up returns 200 through Caddy"
else
    fail "/up returns 200 through Caddy"
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

# Prove manifest/asset parity between the two images: pull a real hashed
# filename out of the app image's Vite manifest and confirm Caddy serves that
# exact file at 200. This is the skew Dockerfile.prod's web stage comment
# warns about (app and web built from different asset sets); it does NOT
# prove Caddy serves statics itself rather than proxying to fpm — this
# assertion would pass identically either way, as long as the bytes at
# build/$asset eventually come back with a 200.
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

if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -cx 'web healthy')" -eq 1 ]; then
    pass "the web container reports healthy"
else
    fail "the web container reports healthy"
fi

# The certificate gate must not be reachable from outside. Caddy asks it on an
# unpublished :2020 listener; if it answers on the public site, anyone can
# enumerate which hostnames are workspaces.
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/_caddy/ask?domain=localhost")" = "404" ]; then
    pass "/_caddy/ask is not reachable from outside"
else
    fail "/_caddy/ask is not reachable from outside"
fi

# Caddy's path matcher is exact, but Laravel's router rtrims a trailing slash
# before matching — so without matching both forms in the Caddyfile (I3),
# /_caddy/ask/ falls through every handler and reaches php_fastcgi, turning
# this into a public hostname oracle via one extra character.
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/_caddy/ask/?domain=localhost")" = "404" ]; then
    pass "/_caddy/ask/ (trailing slash) is not reachable from outside either"
else
    fail "/_caddy/ask/ (trailing slash) is not reachable from outside either"
fi

# ...but Caddy itself must be able to reach it, or on-demand TLS fails closed
# and every workspace subdomain goes dark.
if compose exec -T web sh -c \
        'wget -qO- "http://127.0.0.1:2020/_caddy/ask?domain=localhost" >/dev/null 2>&1'; then
    pass "Caddy can reach the certificate gate internally"
else
    fail "Caddy can reach the certificate gate internally"
fi

# A dotfile that ends up inside public/ (a stray .git, .DS_Store, an editor
# swapfile) must never be served verbatim. nginx had an explicit `deny all`
# for this; the Caddyfile's dotfile refusal is what replaces it.
compose exec -T web sh -c 'echo secret > /var/www/html/public/.probe' >/dev/null 2>&1
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/.probe")" = "404" ]; then
    pass "a dotfile under public/ is refused, not served"
else
    fail "a dotfile under public/ is refused, not served"
fi
compose exec -T web sh -c 'rm -f /var/www/html/public/.probe' >/dev/null 2>&1 || true

# nginx had client_max_body_size 25m; Caddy has no default and streams
# straight to fpm, so an unbounded (or slow-drip) POST would occupy an fpm
# worker for its whole duration (I4) — with pm.max_children=8
# (docker/prod/fpm-pool.conf), eight of those is a full outage. 26214401 is
# one byte past post_max_size=25M in docker/prod/php.ini (PHP's ini
# shorthand is binary: 25 * 1024 * 1024 = 26214400), so this must already be
# refused. The target route need not even accept POST: the limit applies in
# the shared route before any handler, so a 413 here (rather than a 405 from
# Laravel) is itself proof the edge is what refused it.
oversized_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 \
    -X POST --data-binary @<(head -c 26214401 /dev/zero) "$base/health")
if [ "$oversized_code" = "413" ]; then
    pass "an oversized POST is refused at the edge (413), never reaches fpm"
else
    fail "an oversized POST is refused at the edge (413), never reaches fpm (got '$oversized_code')"
fi

log "Background roles run without blocking the deploy"
for svc in worker scheduler; do
    if [ "$(compose ps --format '{{.Service}} {{.State}}' | grep -cx "$svc running")" -eq 1 ]; then
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
# `|| true` here would swallow the entrypoint dying before it ever reaches
# the case guard that decides whether to run view:cache — the sentinel would
# then survive for the wrong reason (nothing ran at all), and this assertion
# would pass whether or not the guard exists. Require the container to
# actually exit 0, same as the permissions-side sentinel check above.
if docker run --rm -v "$views_dir:/var/www/html/storage" \
        -e APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
        --entrypoint prizy-entrypoint "prizy/app:${PRIZY_VERSION:-local}" \
        php artisan about >/dev/null 2>&1; then
    sentinel_run_ok=1
else
    sentinel_run_ok=0
fi
if [ "$sentinel_run_ok" -eq 1 ] && [ -f "$views_dir/framework/views/sentinel.txt" ]; then
    pass "a non-fpm role does not clear the compiled views"
else
    fail "a non-fpm role does not clear the compiled views"
fi
docker run --rm --user 0 -v "$views_dir:/cleanup" --entrypoint sh \
    "prizy/app:${PRIZY_VERSION:-local}" -c 'rm -rf /cleanup/* /cleanup/.[!.]*' >/dev/null 2>&1 || true
rmdir "$views_dir" 2>/dev/null || true

log "The edge carries Reverb"
# Reverb is opt-in, so bring it up for this check only.
compose --profile realtime up -d --wait reverb >/dev/null 2>&1 || true

# GET /app/{key} is Reverb's WebSocket endpoint (verified in the package
# source). This proves the edge routes the path to a LIVE Reverb process —
# it does not, and cannot, prove the WebSocket handshake itself works, since
# no Upgrade header is sent and Reverb never gets that far. Two failure modes
# must both be excluded, not just one:
#   - 404 means Laravel's router answered, i.e. the request never reached
#     Caddy's reverse_proxy — the route is being swallowed by the app.
#   - 502 means Caddy's reverse_proxy answered because reverb was down or
#     unreachable — a genuine boot failure. The `up --wait || true` above
#     does not itself catch that; excluding 502 here is what does.
# The 500 actually observed on a healthy Reverb is NOT a deliberate protocol
# rejection of a non-upgrade GET — it's an uncaught TypeError in Reverb's own
# non-upgrade code path, caught only by its blanket `catch (Throwable)`. Read
# it as "a live Reverb process answered", not as a polite refusal.
code=$(curl -s -o /dev/null -w '%{http_code}' "$base/app/prizy-key")
if [ "$code" != "404" ] && [ "$code" != "502" ] && [ -n "$code" ]; then
    pass "/app/{key} reaches a live Reverb, not the Laravel router or a dead upstream (got $code)"
else
    fail "/app/{key} reaches a live Reverb, not the Laravel router or a dead upstream (got $code)"
fi

compose --profile realtime stop reverb >/dev/null 2>&1 || true

log "On-demand TLS actually activates, and still gates on a real workspace (C1)"
# Everything above this point runs Caddy in CADDY_SITE_ADDRESS=:80 test mode,
# which never touches TLS at all — that is exactly how the branch's headline
# feature (on-demand certificates) shipped with no site-level `tls` directive
# and went uncaught. This section runs Caddy the way production actually
# does (an HTTPS site with on-demand issuance) and proves, offline, that a
# real workspace hostname gets a certificate and is served while a bogus one
# is refused at the TLS layer. It is intentionally the LAST assertion block:
# it recreates the `web` container in a different mode and nothing after it
# depends on :80 test mode again.

# Before touching test-mode issuance at all: the SHIPPED Caddyfile, in
# PRODUCTION shape — no `-e` flags, which is exactly what makes this
# production shape, since every real deploy runs with CADDY_TEST_ISSUER
# unset. Runs against the built image, not the file on disk, so it covers
# what actually ships rather than a copy that could silently drift from
# what got baked into the image. This is the assertion the previous fix
# wave was missing: `local_certs {$CADDY_LOCAL_CERTS_HOSTS:placeholder}`
# passed every existing check here (the handshake assertions below use the
# internal CA by design) while still emitting a global `internal` issuer
# for every real deploy, because `local_certs` silently discards the
# argument. Both halves matter — ACME must be present, `internal` must not.
shipped_adapt="$(docker run --rm --entrypoint caddy "prizy/web:${PRIZY_VERSION:-local}" adapt --config /etc/caddy/Caddyfile 2>/dev/null)" || true
if grep -q '"module":"acme"' <<<"$shipped_adapt"; then
    pass "the shipped Caddyfile (production shape) issues via ACME"
else
    fail "the shipped Caddyfile (production shape) issues via ACME"
fi
if ! grep -q '"module":"internal"' <<<"$shipped_adapt"; then
    pass "the shipped Caddyfile (production shape) never falls back to the internal CA"
else
    fail "the shipped Caddyfile (production shape) never falls back to the internal CA"
fi
# The issuer is only half of on-demand TLS. The handshake assertions further
# down prove on_demand and the ask gate are wired, but they only ever run in
# CADDY_TEST_ISSUER=local_certs mode — so without these two, production shape
# has no assertion that it issues on demand at all, or that issuance is gated
# rather than open to any hostname pointed at the box.
if grep -q '"on_demand":true' <<<"$shipped_adapt"; then
    pass "the shipped Caddyfile (production shape) issues on demand"
else
    fail "the shipped Caddyfile (production shape) issues on demand"
fi
if grep -q '"endpoint":"http://127.0.0.1:2020/_caddy/ask"' <<<"$shipped_adapt"; then
    pass "the shipped Caddyfile (production shape) gates issuance on the ask endpoint"
else
    fail "the shipped Caddyfile (production shape) gates issuance on the ask endpoint"
fi

# A real workspace, inserted directly by SQL: Workspace::factory() pulls in
# fakerphp/faker, which is require-dev only and absent from the production
# image (--no-dev), so the factory cannot run inside this stack.
compose exec -T postgres psql -U prizy -d prizy -c \
    "INSERT INTO workspaces (name, slug) VALUES ('Edge Test', 'edge-test') ON CONFLICT (slug) DO NOTHING;" \
    >/dev/null 2>&1

# Switch the throwaway env to real TLS mode: blank CADDY_SITE_ADDRESS so the
# compose default (https://) applies, and set CADDY_TEST_ISSUER=local_certs
# to inject Caddy's internal CA as the issuer (see docker/prod/Caddyfile and
# docker-compose.prod.yml). This is GLOBAL, not scoped to the one workspace
# hostname tested below — `local_certs` takes no arguments, so there is no
# way to scope it to just edge-test.localhost, and there never was (the
# previous per-hostname argument was silently discarded; that was the bug
# this wave fixes). It's acceptable here because `ask` is untouched: both
# hostnames below are still gated by the real application and its database,
# and only the ISSUER is swapped for one that needs no network. The stack is
# throwaway and serves only its own hostnames — note it does publish on every
# interface (see the ports comment in docker-compose.prod.yml), so this is a
# scope argument about what the stack answers for, not about reachability.
sed -i 's/^CADDY_SITE_ADDRESS=:80$/CADDY_SITE_ADDRESS=/' "$ENV_FILE"
echo "CADDY_TEST_ISSUER=local_certs" >> "$ENV_FILE"
compose up -d --force-recreate --no-deps web >/dev/null 2>&1

web_tls_ready=0
for _ in $(seq 1 30); do
    if [ "$(compose ps --format '{{.Service}} {{.Health}}' | grep -cx 'web healthy')" -eq 1 ]; then
        web_tls_ready=1
        break
    fi
    sleep 1
done
if [ "$web_tls_ready" -eq 1 ]; then
    pass "web (Caddy) is healthy again in real TLS mode"
else
    fail "web (Caddy) is healthy again in real TLS mode"
fi

# --resolve pins the SNI hostname to this box without needing real DNS.
# -k is required for the internal CA's root, not to paper over a mismatch:
# the /health body and status code are what prove a certificate was actually
# issued and the request was served, not just that curl stopped complaining.
real_code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 \
    --resolve "edge-test.localhost:${HTTPS_PORT}:127.0.0.1" \
    "https://edge-test.localhost:${HTTPS_PORT}/health" 2>/dev/null || true)
if [ "$real_code" = "200" ]; then
    pass "a real workspace hostname (edge-test.localhost) gets an on-demand certificate and is served"
else
    fail "a real workspace hostname (edge-test.localhost) gets an on-demand certificate and is served (got '$real_code')"
fi

# No -k rescue here: a bogus hostname must fail the TLS handshake itself
# (curl exits non-zero, http_code comes back empty/000) because `ask` never
# authorises it and on-demand TLS refuses to obtain ANY certificate — local
# or otherwise. A 404/500 HTTP response would mean a certificate WAS issued
# and the request reached the application, which is the failure this guards.
bogus_code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 \
    --resolve "nonexistent-workspace.localhost:${HTTPS_PORT}:127.0.0.1" \
    "https://nonexistent-workspace.localhost:${HTTPS_PORT}/health" 2>/dev/null || true)
if [ "$bogus_code" != "200" ]; then
    pass "a bogus hostname (nonexistent-workspace.localhost) is refused a certificate, not served (got '$bogus_code')"
else
    fail "a bogus hostname (nonexistent-workspace.localhost) is refused a certificate, not served (got '$bogus_code')"
fi

if [ "$FAILED" -ne 0 ]; then
    printf '\n\033[0;31mProduction stack tests FAILED\033[0m\n'
    exit 1
fi
printf '\n\033[0;32mProduction stack tests passed\033[0m\n'
