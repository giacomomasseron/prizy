# Running the app locally

## Start everything

```bash
composer dev
```

This brings up the docker stack (`app`, `postgres`, `redis`) then runs, concurrently:
the **queue** listener, **pail** logs, and **Vite** (`npm run dev`). It does **not** seed
the database. Leave it running; `Ctrl-C` stops all three.

> First time only: `composer setup` (install deps, copy `.env`, key:generate, migrate,
> npm install, build).

## Open it

- **App base:** `http://localhost:8001` (port **8001**).
- Tenancy is **subdomain-based** (`APP_BASE_DOMAIN=localhost`) — each workspace is served
  at `http://<workspace-slug>.localhost:8001`. `*.localhost` resolves to loopback
  automatically in Chrome/most browsers (no `/etc/hosts` edit needed).

## Get a login (seed the smoke workspace)

`composer dev` seeds nothing. Seed the **SmokeSeeder** (idempotent, safe to re-run — this
is what the e2e suite uses):

```bash
docker compose exec -T app php artisan db:seed --class="Database\Seeders\SmokeSeeder"
```

Then open **`http://smoke.localhost:8001`** and log in:

| Role | Email | Password |
|------|-------|----------|
| Owner / full access (`admin_level=owner`, developer) | `smoke@example.com` | `password123` |
| Member / non-admin (for testing gating) | `member@example.com` | `password123` |

The seeder also creates `Smoke Team` (SMK) and `Smoke Roadmap Project` (2 issues).

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
- **`composer dev:full`** adds the optional `--profile full` docker services (e.g. Reverb
  websockets / Meilisearch) if you need real-time or Meili search locally.
