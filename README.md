<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## Local development

Prizy runs across a **container/host split**: PHP (`artisan`, `composer`) and the
backing services run in Docker, while the JS toolchain (`vite`, `npm`) runs on the
host. The `composer dev` scripts orchestrate both from a single command.

### Prerequisites

- Docker + Docker Compose
- Node (with `npm`) on the host

### First-time setup

```bash
docker compose up -d --build          # build the app image + start app, postgres, redis
docker compose exec app composer install
docker compose exec app cp -n .env.example .env
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed --class="Database\Seeders\SmokeSeeder"
npm install                           # on the host
```

### First login

Prizy resolves the current workspace from the request **subdomain**
(`APP_BASE_DOMAIN=localhost`), so the app is served per workspace at
`http://<slug>.localhost:8001` — **not** at the bare `http://localhost:8001/`,
which resolves no tenant and returns `NoCurrentTenant`.

The `SmokeSeeder` above creates a ready-to-use workspace:

- **URL:** http://smoke.localhost:8001/
- **Login:** `smoke@example.com` / `password123` (owner + developer)

To create your own workspace instead, open http://localhost:8001/signup (the
signup route is the one host exempt from tenant resolution). Browsers resolve
`*.localhost` to loopback automatically — no `/etc/hosts` edits needed.

### Day-to-day

```bash
composer dev        # everyday loop
composer dev:full   # + real-time & search stack
```

`composer dev` brings up the core containers (`app`, `postgres`, `redis`) detached,
then runs three foreground processes under one terminal — press **Ctrl-C once** to
stop all three (the containers stay up between sessions):

| Process        | Runs in   | What it does                                  |
| -------------- | --------- | --------------------------------------------- |
| `queue:listen` | container | processes queued jobs (`QUEUE_CONNECTION=redis`) |
| `pail`         | container | live tail of the application log              |
| `vite`         | host      | asset dev server with HMR                     |

Because `composer dev` does not start Reverb, its queue worker runs with
`BROADCAST_CONNECTION=log` (broadcast payloads go to the log instead of a live
websocket; the client falls back to polling). Use `composer dev:full` when you
want real websocket broadcasting.

`composer dev:full` instead starts the `full` compose profile — adding **Reverb**
(websockets), **Horizon**, and **Meilisearch** — and runs only `pail` + `vite` in the
foreground, since Horizon owns the queue in that profile.

### Service ports

| Service         | URL / port              | Started by            |
| --------------- | ----------------------- | --------------------- |
| App (web)       | http://localhost:8001   | `dev`, `dev:full`     |
| Vite (HMR)      | http://localhost:5173   | `dev`, `dev:full`     |
| PostgreSQL      | `localhost:5433`        | `dev`, `dev:full`     |
| Redis           | `localhost:6380`        | `dev`, `dev:full`     |
| Reverb          | `localhost:8080`        | `dev:full`            |
| Meilisearch     | http://localhost:7700   | `dev:full`            |

> **Note:** run `artisan`/`composer` through `docker compose exec app …`, not on the
> host — `DB_HOST=postgres` and `REDIS_HOST=redis` only resolve inside the Docker
> network.

## Self-hosting

`scripts/install.sh` takes a fresh Debian/Ubuntu or RHEL box to a running,
TLS-terminated Prizy. It has to run **on that box, as root**, so the first step
is getting a copy of this repository onto it. The repository has no published
remote yet, so today that means copying a checkout across and installing from
it:

```bash
scp -r . root@your-server:/opt/prizy-src
ssh root@your-server 'bash /opt/prizy-src/scripts/install.sh \
    --domain example.com --email ops@example.com --mail=smtp \
    --source-path /opt/prizy-src'
```

Once the repository is published, drop `--source-path` and the installer clones
it instead — `--ref <tag|branch>` picks what to clone (default `main`).

Point both `A example.com` and `A *.example.com` at the machine first — every
workspace lives at its own subdomain, and certificates are issued per hostname
on first request.

The installer checks the machine, installs Docker, writes `/data/prizy/source`,
generates every secret, builds the image and brings the stack up. It finishes by
printing `https://<domain>/signup`, where you create the first workspace. A
checkout's own `.env` is never imported: the installer deletes it after the copy
and generates a production one, so a laptop's `APP_DEBUG=true` and `APP_KEY`
cannot follow the source onto a server.

Re-running the same command is the upgrade path. It backs up `.env` to
`/data/prizy/backups`, fills only keys that are missing or empty — an existing
value is never overwritten — then rebuilds and migrates.

Useful flags: `--with-realtime` to run Reverb and compile the WebSocket client
into the bundle (without it the interface polls), `--mail=log` for an evaluation
install that sends no email, and `--dry-run` to see the plan without touching
anything. `--help` lists them all.

### Unattended installs

Every prompt and every required flag has a `PRIZY_*` environment variable behind
it, so a config management tool can drive the whole install with `--yes` and no
terminal:

```bash
ssh root@your-server 'PRIZY_DOMAIN=example.com PRIZY_EMAIL=ops@example.com \
    PRIZY_MAIL=smtp PRIZY_SMTP_HOST=smtp.example.com PRIZY_SMTP_PORT=587 \
    PRIZY_SMTP_USERNAME=postmaster PRIZY_SMTP_PASSWORD=... \
    PRIZY_SMTP_ENCRYPTION=tls \
    bash /opt/prizy-src/scripts/install.sh --yes --source-path /opt/prizy-src'
```

Only `PRIZY_SMTP_HOST` is required under `--mail=smtp`; leave the username and
password unset for a relay that needs no authentication. On a re-run, any SMTP
setting you do not supply keeps the value already in the install's `.env`.
`--help` lists every variable.

An SMTP value cannot contain `$`, whitespace, or a leading or trailing quote.
The `.env` is read by Compose's dotenv parser, which would expand, trim or
unquote them and hand the application a different credential, so the installer
refuses such a value rather than writing it: interactively it explains why and
asks again, and under `--yes` it stops. If a password needs one of them, leave
that setting empty and write it into `/data/prizy/source/.env` by hand — the
installer never offers back a value it would refuse as a prompt default, and an
empty answer never overwrites a `MAIL_*` key, so later re-runs leave it alone.

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
