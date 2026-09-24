<h1 align="center"><img src="docs/images/logo.svg" width="36" height="36" alt="" align="absmiddle"> Prizy</h1>

<p align="center">
  <strong>Linear + Zendesk, together in one workspace.</strong><br>
  The issue tracker your engineers want and the helpdesk your support team needs,<br>
  sharing one set of people, one permission model and one source of truth.
</p>

<p align="center">
  <a href="https://prizy.dev"><strong>Website</strong></a> ·
  <a href="https://docs.prizy.dev/"><strong>Documentation</strong></a> ·
  <a href="#self-hosting">Self-host for free</a> ·
  <a href="#development">Start developing</a>
</p>

---

## Why Prizy

Most teams run Linear (or Jira) for engineering and Zendesk (or Intercom) for
support, and they pay for the gap between the two: tickets pasted into issues by
hand, customers chased manually when a fix ships, and two sets of users and
permissions to keep in sync.

Prizy is **both tools in one app**. Tickets and issues live in the same
workspace, next to each other. When a customer reports a bug, the agent links
the ticket to an engineering issue. Developers see it under **Escalations**, the
customer's portal shows that engineering is working on it, and support reports
count how many tickets needed engineering. Nobody copies and pastes, no sync job
runs between two tools, and nobody needs a second login.

| Build: the Linear side | Support: the Zendesk side |
| --- | --- |
| Issues with statuses, priorities, labels, assignees and blockers | Shared ticket desk with filters, saved views and internal notes |
| Cycles, projects, milestones and a roadmap | SLA policies with business hours and breach tracking |
| Releases with a generated changelog | CSAT ratings, by email or right in the portal |
| Comments with @mentions and emoji reactions | Help Center: a public knowledge base with search, article versions and translations |
| Notifications inbox | Customer portal: magic-link sign-in, submit and follow requests |
| Tracker analytics | Support reporting: agents, SLA, channels, saved reports, CSV export |
| GitHub and Slack integrations | Contacts |

Both sides share the same foundation:

- every workspace lives on its own subdomain, and Postgres row-level security
  keeps each workspace's data isolated from the others;
- roles, plus *developer* and *agent* flags, show each person the side they work
  on;
- a versioned REST API (`/v1`) with API tokens;
- a full workspace export.

If you don't need a helpdesk, turn it off for the workspace.

## Development

**One command starts the whole development environment:**

```bash
composer dev
```

`composer dev` does the following:

1. starts the app, PostgreSQL and Redis in Docker and waits until the database
   is healthy;
2. runs the migrations and seeds a demo workspace;
3. runs the queue worker, the live log tail and Vite with hot reload side by side
   in one terminal.

When it's up, open **http://smoke.localhost:8001** and sign in as
`smoke@example.com` / `password123`. Press **Ctrl-C once** to stop everything.
The containers stay up, so the next start is fast.

You don't need to run migrations, start a queue worker or open another terminal
for Vite. `composer dev` does all of it. Running it again is safe: it applies
any pending migrations, and the demo seed is idempotent.

### Before the first run

You need **Docker** (with Compose) and **Node + npm** on the host, plus
**Composer**. Composer is only used to launch the scripts, so any PHP version on
the host works; the app itself runs on PHP 8.5 inside the container.

Then, once:

```bash
git clone https://github.com/giacomomasseron/prizy.git && cd prizy
cp .env.example .env                                   # Compose reads it at startup
docker compose build                                   # the dev image
docker compose run --rm app composer install           # PHP dependencies, in the container
docker compose run --rm app php artisan key:generate
npm install                                            # JS dependencies, on the host
```

If your user id isn't 1000, build with
`docker compose build --build-arg UID="$(id -u)" --build-arg GID="$(id -g)"`
instead, so files the container writes stay yours.

### What's running

| Process        | Runs in   | What it does                                     |
| -------------- | --------- | ------------------------------------------------ |
| `queue:listen` | container | processes queued jobs (`QUEUE_CONNECTION=redis`) |
| `pail`         | container | live tail of the application log                 |
| `vite`         | host      | asset dev server with HMR                        |

`composer dev` keeps things light. It doesn't start WebSockets: broadcasts go to
the log and the UI falls back to polling. If you need the full real-time and
search stack, run this instead:

```bash
composer dev:full   # + Reverb (WebSockets), Horizon and Meilisearch
```

In that mode Horizon owns the queue, so only `pail` and `vite` run in the
foreground.

| Service     | URL / port            | Started by        |
| ----------- | --------------------- | ----------------- |
| App (web)   | http://localhost:8001 | `dev`, `dev:full` |
| Vite (HMR)  | http://localhost:5173 | `dev`, `dev:full` |
| PostgreSQL  | `localhost:5433`      | `dev`, `dev:full` |
| Redis       | `localhost:6380`      | `dev`, `dev:full` |
| Reverb      | `localhost:8080`      | `dev:full`        |
| Meilisearch | http://localhost:7700 | `dev:full`        |

### Demo logins

Prizy picks the workspace from the **subdomain**, so the app runs at
`http://<slug>.localhost:8001` and not at the bare `localhost:8001`. Browsers
resolve `*.localhost` to your machine automatically, so you don't need to edit
`/etc/hosts`.

The seeded workspace is at **http://smoke.localhost:8001**. All passwords are
`password123`.

| Account                  | Sees                                      |
| ------------------------ | ----------------------------------------- |
| `smoke@example.com`      | everything (owner, developer)             |
| `member@example.com`     | the issue tracker (developer, no support) |
| `agent-maya@example.com` | the support desk (agent, not developer)   |

To create a workspace of your own, go to http://localhost:8001/signup.

### Tests

```bash
docker compose exec app php artisan test   # Pest: unit + feature
npm test                                   # Vitest
npm run test:e2e                           # Playwright, against a running `composer dev`
```

> `composer dev` and `composer dev:full` run on the host. Run every other
> `artisan` or `composer` command through `docker compose exec app …`, because
> `DB_HOST=postgres` and `REDIS_HOST=redis` only resolve inside the Docker
> network.

More detail is in [`docs/RUNNING.md`](docs/RUNNING.md), including
troubleshooting a blank page. For how the app is built, see
[`docs/multi-tenancy.md`](docs/multi-tenancy.md) and
[`docs/roles.md`](docs/roles.md).

## Self-hosting

Prizy is free to run on your own server, and your data stays there.
`scripts/install.sh` takes a fresh **Debian/Ubuntu or RHEL** server to a running
Prizy with automatic HTTPS. It checks the machine, installs Docker and any other
missing tools, generates every secret, builds the image and starts the stack.
When it's done, it prints `https://<domain>/signup`, where you create your first
workspace.

First, point **both `example.com` and `*.example.com`** at the server. Every
workspace gets its own subdomain, and certificates are issued per hostname on
first request.

Then, **on the server as root**, run:

```bash
curl -fsSL https://prizy.dev/install.sh | bash
```

It installs the [latest release](https://github.com/giacomomasseron/prizy/releases/latest).
First it asks for your domain, the email address Let's Encrypt should use, and
whether to send email over SMTP or not at all. Then it clones that release into
`/data/prizy/source`. If you're not root, pipe it to `sudo bash` instead. To skip
the questions, pass the answers after `bash -s --`:

```bash
curl -fsSL https://prizy.dev/install.sh | bash -s -- --domain example.com --email ops@example.com --mail=smtp
```

Over ssh, connect with `ssh -t`: without a terminal the installer can't ask
anything, so it stops and names the flags it's missing. To read the installer
before you run it, download it first with
`curl -fsSL https://prizy.dev/install.sh -o install.sh`, then run
`bash install.sh`.

- **Upgrading:** run the same command again. It moves to the latest release;
  press Enter to keep each current answer. It backs up `.env` to
  `/data/prizy/backups`, fills in only the keys that are missing or empty, then
  rebuilds and migrates. It never overwrites an existing value. To install a
  particular release instead, add `--ref v0.0.2`.
- **Unreleased changes:** copy a checkout to the server and pass
  `--source-path` instead of `--ref`, for example `scp -r . root@your-server:/opt/prizy-src`
  and then `bash /opt/prizy-src/scripts/install.sh --source-path /opt/prizy-src`.
  The checkout's own `.env` is never carried over: the installer generates a
  fresh production one, so a laptop's `APP_DEBUG=true` and `APP_KEY` can't end
  up on a server.
- **Real-time:** `--with-realtime` adds WebSockets (Reverb). Without it, the UI
  polls.
- **Evaluating:** `--mail=log` sends no email, so portal magic-link sign-in,
  email verification, invitations and CSAT requests won't work.
- **Previewing:** `--dry-run` prints the plan and changes nothing.
- **Unattended installs:** every flag and prompt has a `PRIZY_*` environment
  variable. Add `--yes` to drive the install from a config-management tool with
  no terminal.
- **SMTP passwords:** the installer refuses a value that contains `$`,
  whitespace, or a leading or trailing quote, because Compose's dotenv parser
  would silently change it. Leave that setting empty and write it into
  `/data/prizy/source/.env` by hand. Later re-runs will leave it alone.

`--help` lists every flag and variable. The full guide is at
**[docs.prizy.dev](https://docs.prizy.dev/)**.

## Built with

Laravel 13 on PHP 8.5 · PostgreSQL 16 with row-level security · Redis ·
React 19 + TypeScript · Tailwind CSS v4 · Vite · Reverb (WebSockets) ·
Meilisearch (optional)

## Links

- Website: **https://prizy.dev**
- Documentation: **https://docs.prizy.dev/**

## License

Prizy is open-source software licensed under the [MIT license](LICENSE).
