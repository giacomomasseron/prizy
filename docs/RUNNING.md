# Running the app locally

## Start everything

```bash
composer dev
```

This is the single command to run the platform. It:

1. brings up the docker stack (`app`, `postgres`, `redis`) and **waits** for the DB to be
   healthy (`--wait` + the postgres healthcheck);
2. runs **`php artisan migrate`** (applies any pending migrations);
3. seeds the **SmokeSeeder** (idempotent — the smoke workspace + test logins below);
4. runs, concurrently, the **queue** listener, **pail** logs, and **Vite** (`npm run dev`).

Leave it running; `Ctrl-C` stops all three long-running processes. After this, the app is
usable at `http://smoke.localhost:8001` with no further steps.

> **First time only** (fresh clone): `composer setup` — installs PHP + JS deps, copies
> `.env`, generates the app key, and builds assets. It does **not** touch the DB; migration
> and seeding happen in `composer dev` (inside the container, once the DB is up).

## Open it

- **App base:** `http://localhost:8001` (port **8001**).
- Tenancy is **subdomain-based** (`APP_BASE_DOMAIN=localhost`) — each workspace is served
  at `http://<workspace-slug>.localhost:8001`. `*.localhost` resolves to loopback
  automatically in Chrome/most browsers (no `/etc/hosts` edit needed).

## Logins (seeded automatically by `composer dev`)

`composer dev` runs the **SmokeSeeder** for you, so the smoke workspace + logins exist as
soon as it's up. Open **`http://smoke.localhost:8001`** and log in:

| Role | Email | Password |
|------|-------|----------|
| Owner / full access (`admin_level=owner`, developer) | `smoke@example.com` | `password123` |
| Member + developer (issue tracker, no support) | `member@example.com` | `password123` |
| Agent, NOT developer (support desk only) | `agent-maya@example.com` | `password123` |

The seeder also creates `Smoke Team` (SMK) and `Smoke Roadmap Project` (2 issues).

To **reset** the test accounts/workspace to their canonical state at any time (idempotent):

```bash
docker compose exec -T app php artisan db:seed --class=SmokeSeeder --force
```

> **Don't** use the default `php artisan db:seed` (`DatabaseSeeder`) for a login — it only
> makes `test@example.com` with a factory-random password in a random-slug workspace.

## Notes

- **DB:** Postgres in the `postgres` container, database `prizy`, connected as the
  non-superuser `prizy_app` (RLS enforced against that role).
- **Toolchain split:** PHP/artisan run *inside* the `app` container
  (`docker compose exec -T app …`); JS (`npm run dev`/`build`) runs on the host.
- **Blank page / `@vitejs/plugin-react can't detect preamble`?** The dev server needs the
  React-Refresh preamble, injected by `@viteReactRefresh` in `resources/views/app.blade.php`
  (before `@vite(...)`). If a page goes blank after a blade change, hard-reload; if stale,
  `docker compose exec -T app php artisan view:clear`.
- **Blank page when Vite is NOT running** (e.g. after you `Ctrl-C` `composer dev`, then load
  the app): a stale `public/hot` file makes `@vite` point `<script>` tags at the (now-dead)
  Vite dev server. Either restart `composer dev`, or serve the built assets with
  `rm -f public/hot && npm run build`.
- **`composer dev:full`** adds the optional `--profile full` docker services (Reverb
  websockets, Horizon, Meilisearch) if you need real-time / queue dashboard / Meili search
  locally. It also waits-for-DB, migrates, and seeds like `composer dev`.
