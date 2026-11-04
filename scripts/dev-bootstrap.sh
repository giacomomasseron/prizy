#!/usr/bin/env bash
# What `composer dev`, `composer dev:full` and `composer setup` run first: the
# steps a fresh clone needs before the stack can start. Each one runs only when
# it is needed, so on a checkout that is already set up this prints nothing.
#
#   .env           missing                    copied from .env.example
#   dev image      missing                    built with your user and group id
#   vendor/        missing, or composer.lock  composer install, in the container
#                  changed since the last one
#   APP_KEY        empty in .env              artisan key:generate, in the container
#   node_modules/  missing, or package-lock   npm install, on the host
#                  changed since the last one
#
# All of it happens before `docker compose up`: `php artisan serve` exits at
# once without vendor/, and the container reads .env as its environment only
# when it starts, so a key written afterwards never reaches it.
#
# The image is built only when missing. After a Dockerfile change, rebuild it:
#   docker compose build --build-arg UID="$(id -u)" --build-arg GID="$(id -g)" app
#
# Usage: bash scripts/dev-bootstrap.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# The app service's `image:` in docker-compose.yml.
DEV_IMAGE=prizy/app:dev
# Copies of the lock file each install last ran from. A lock that differs from
# its copy (after a pull or a branch switch) means the install is out of date.
COMPOSER_STAMP=vendor/.dev-bootstrap-composer.lock
NPM_STAMP=node_modules/.dev-bootstrap-package-lock.json

step() {
    if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
        printf '\033[38;5;183m==>\033[0m %s\n' "$1"
    else
        printf '==> %s\n' "$1"
    fi
}

need() {
    if ! command -v "$1" >/dev/null 2>&1; then
        printf 'dev-bootstrap: %s not found. %s\n' "$1" "$2" >&2
        exit 1
    fi
}

need docker 'Install Docker with Compose: https://docs.docker.com/get-docker/'
need npm 'Install Node.js, which comes with npm: https://nodejs.org/'

if [ ! -f .env ]; then
    step 'Creating .env from .env.example'
    cp .env.example .env
fi

# Built with the host's ids so files the container writes into the checkout
# (vendor/, the key in .env, logs) stay yours. docker-compose.yml's own
# defaults are 1000.
if ! docker image inspect "$DEV_IMAGE" >/dev/null 2>&1; then
    step "Building the dev image ($DEV_IMAGE), once"
    docker compose build --build-arg UID="$(id -u)" --build-arg GID="$(id -g)" app
fi

# COMPOSER_AUTH, when set (CI sets a GitHub token), keeps Composer's GitHub
# downloads out of the unauthenticated API rate limit.
if [ ! -f vendor/autoload.php ] || ! cmp -s composer.lock "$COMPOSER_STAMP"; then
    step 'Installing PHP dependencies (composer install, in the container)'
    auth=()
    if [ -n "${COMPOSER_AUTH:-}" ]; then
        auth=(-e COMPOSER_AUTH)
    fi
    docker compose run --rm -T ${auth[@]+"${auth[@]}"} app composer install --no-interaction --prefer-dist
    cp composer.lock "$COMPOSER_STAMP"
fi

if ! grep -Eq '^APP_KEY=[^[:space:]]+' .env; then
    step 'Generating the app key'
    docker compose run --rm -T app php artisan key:generate
fi

if [ ! -d node_modules ] || ! cmp -s package-lock.json "$NPM_STAMP"; then
    step 'Installing JS dependencies (npm install)'
    npm install --no-audit --no-fund
    cp package-lock.json "$NPM_STAMP"
fi
