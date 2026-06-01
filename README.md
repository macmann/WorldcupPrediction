# Football Fantasy Myanmar - WC 2026 Web App

A standard Node.js/Next.js application for World Cup score predictions, private leagues, live fixture ingestion, and event-driven scoring. This project is designed to run natively with Node.js: no Dockerfile, no `docker-compose`, and no local container dependencies are required.

## Stack

- **Web app:** Next.js App Router for the UI and REST API routes.
- **Frontend:** React and Tailwind CSS.
- **Backend:** Node.js route handlers inside the Next.js app.
- **Database:** Managed PostgreSQL from Neon, Supabase, or another hosted Postgres provider, accessed through Prisma ORM.
- **Background jobs:** BullMQ workers backed by a managed Redis provider such as Upstash.
- **Football data:** football-data.org-compatible API client with full-time score processing.

## Prerequisites

Install these tools before starting:

1. **Node.js 20+** and npm.
2. A hosted PostgreSQL database from **Neon** or **Supabase**.
3. A hosted Redis instance from **Upstash** or another managed Redis provider that supports BullMQ.
4. A football-data.org API key, or a compatible football API service configured through the same environment variables.

## Local setup

### 1. Install dependencies

```bash
npm install
```

The `postinstall` script runs `prisma generate`, so the Prisma client is generated automatically after dependencies are installed. The worker and scheduler npm scripts load `.env` with Node's built-in `--env-file=.env` flag, so use Node.js 20+ as listed in the prerequisites.

### Fixing Prisma generator WASM errors on Windows

If `prisma migrate dev`, `prisma db push`, or `prisma generate` applies the schema successfully but then fails with an error like `ENOENT: no such file or directory, open ... node_modules\@prisma\client\generator-build\prisma_schema_build_bg.wasm`, your local Prisma install is usually incomplete or mixed between package managers/versions. This repository is pinned to npm with a committed lockfile so Prisma CLI and `@prisma/client` resolve to the same version.

From the project root, run the repository repair helper. It checks for mismatched Prisma packages, accidental `node_modules/.pnpm` content, and missing generator assets; with `--fix`, it rebuilds dependencies from `package-lock.json` and regenerates Prisma Client.

```bash
npm run prisma:repair -- --fix
```

If you prefer to do the same steps manually, rebuild dependencies with npm only:

```bash
rm -rf node_modules
npm ci
npm run prisma:generate
```

On Windows PowerShell, use:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
npm run prisma:generate
```

Avoid running `pnpm install`, `yarn install`, or copying `node_modules` from another machine for this app, because Prisma's generated client expects the package files from the same npm installation that generated it.

### 2. Create your environment file

Copy the example file and fill in your own managed service credentials:

```bash
cp .env.example .env
```

Update these required values in `.env`:

```env
DATABASE_URL="postgresql://[user]:[password]@[neon_or_supabase_host]/[db]?sslmode=require"
REDIS_URL="rediss://[user]:[password]@[upstash_host]:[port]"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-strong-secret"
JWT_SECRET="replace-with-a-strong-secret"
FOOTBALL_API_KEY="replace-with-your-football-api-key"
# Optional preferred 2026-specific fixture provider. If set, this is used before football-data.org.
WC2026_API_KEY="replace-with-your-wc2026-api-key"
# Required for forgot-password email delivery. Without these, reset links are logged on the server only.
RESEND_API_KEY="replace-with-your-resend-api-key"
PASSWORD_RESET_FROM_EMAIL="FFM WC2026 <noreply@your-domain.com>"
```

Notes:

- `DATABASE_URL` should be the direct PostgreSQL connection string from Neon or Supabase. Keep `sslmode=require` unless your provider tells you otherwise.
- `REDIS_URL` should be the TLS Redis URL from Upstash or your Redis provider. Upstash URLs usually start with `rediss://`.
- `NEXTAUTH_SECRET` and `JWT_SECRET` can use the same strong value. Generate one with:

```bash
openssl rand -base64 32
```

- Fixture sync and outright-pick option sync use `WC2026_API_KEY` first when present, then fall back to the football-data.org-compatible `FOOTBALL_API_KEY`. The Champion, Best Player, and Best Goalkeeper dropdowns are loaded from synced tournament teams/squads instead of hard-coded mock options; if your provider does not expose squad/player data, those player dropdowns stay disabled until real players are available in the database.

#### Password reset email setup

The forgot-password API already creates a secure reset token. Email delivery uses [Resend](https://resend.com) through the following environment variables:

| Variable | Required for email? | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL used to build `/reset-password?token=...` links. Use `http://localhost:3000` locally and your deployed `https://...` URL in production. |
| `RESEND_API_KEY` | Yes | API key from Resend. |
| `PASSWORD_RESET_FROM_EMAIL` | Yes | Verified sender address or sender name/address, for example `FFM WC2026 <noreply@your-domain.com>`. |

If `RESEND_API_KEY` or `PASSWORD_RESET_FROM_EMAIL` is blank, the app does **not** send an email. Instead, it prints the reset link to the web service logs as `Password reset link for user@example.com: ...`; this is useful for local development but not enough for production.

### 3. Apply the Prisma schema to your hosted database

For quick development against a remote serverless database, push the current Prisma schema directly:

```bash
npx prisma db push
```

Or use the npm script:

```bash
npm run prisma:push
```

If you prefer migration files and a migration history, run:

```bash
npx prisma migrate dev
```

Or use the npm script:

```bash
npm run prisma:migrate
```

Use only one workflow consistently for a shared environment. For team projects and production databases, Prisma migrations are generally easier to audit and reproduce.

### 4. Start local development

Run the web server and BullMQ worker process together in one terminal tab:

```bash
npm run dev
```

This uses `concurrently` to run:

- `npm run dev:web` &mdash; starts the Next.js development server.
- `npm run dev:worker` &mdash; starts the BullMQ worker runtime.

The app will be available at:

```text
http://localhost:3000
```

If you want separate terminal tabs instead, run these commands independently:

```bash
npm run dev:web
npm run dev:worker
```

### Clearing a stale Next.js cache

If Next.js logs a webpack cache restore warning such as `Restoring pack failed` with `invalid stored block lengths`, the local `.next` cache is usually corrupted. It is safe to delete because Next.js rebuilds it automatically. Run:

```bash
npm run clean:next
```

Then restart the web server with either `npm run dev:web` or the one-step clean start command:

```bash
npm run dev:web:clean
```

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Runs Next.js and the BullMQ worker locally with `concurrently`. |
| `npm run dev:web` | Runs only the Next.js local development server. |
| `npm run dev:web:clean` | Clears the local `.next` cache, then runs the Next.js local development server. |
| `npm run dev:worker` | Runs only the BullMQ worker runtime. |
| `npm run clean:next` | Removes the local `.next` directory when Next.js or webpack caches become stale or corrupted. |
| `npm run build` | Builds the Next.js app. |
| `npm start` | Starts the built Next.js app with `next start`. |
| `npm run worker` | Starts the BullMQ worker process. |
| `npm run scheduler` | Enqueues recurring fixture and live-score polling jobs. |
| `npm run prisma:generate` | Generates the Prisma client. |
| `npm run prisma:push` | Pushes the Prisma schema to the database. |
| `npm run prisma:migrate` | Creates/applies development migrations. |
| `npm run typecheck` | Runs TypeScript type checking. |
| `npm test` | Runs the test suite. |

## Background jobs

The worker process in `src/jobs/worker.ts` starts the BullMQ runtime, which includes:

1. Fixture sync jobs.
2. Live score polling jobs.
3. Scoring engine jobs.

The scheduler in `src/jobs/scheduler.ts` can be used to explicitly register the recurring jobs when needed:

```bash
npm run scheduler
```

For local development, `npm run dev` starts the worker runtime alongside the web server. In production, deploy the worker as its own background process so it can scale and restart independently from the web app.

## Deployment Guide: Render.com

Deploy this stack to Render without Docker by creating separate native Node services.

### 1. Provision managed data services

You can use either external providers or Render-managed services:

- **PostgreSQL:** Neon or Supabase recommended for serverless Postgres.
- **Redis:** Upstash recommended for managed Redis/BullMQ.

Copy the hosted `DATABASE_URL` and `REDIS_URL` values. These will be used by both the Render Web Service and the Render Background Worker.

### 2. Create the Web Service

In Render:

1. Choose **New > Web Service**.
2. Connect this repository.
3. Set the environment to **Node**.
4. Use this build command:

```bash
npm install --include=dev && npm run render-build
```

5. Use this start command:

```bash
npm run render-start
```

6. Add these environment variables:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `NEXT_PUBLIC_APP_URL` set to the Render web service URL, for example `https://your-app.onrender.com`
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET`
   - `FOOTBALL_API_BASE_URL`
   - `FOOTBALL_API_KEY`
   - `WORLD_CUP_COMPETITION_CODE`
   - `TOURNAMENT_START_TIME`
   - `RESEND_API_KEY`
   - `PASSWORD_RESET_FROM_EMAIL`

### 3. Create the Background Worker

In Render:

1. Choose **New > Background Worker**.
2. Connect the same repository.
3. Set the environment to **Node**.
4. Use the same build command:

```bash
npm install --include=dev && npm run prisma:generate
```

5. Use this start command:

```bash
npm run worker
```

6. Add the same environment variables as the Web Service, especially `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, and `FOOTBALL_API_KEY`. The worker does not send password reset emails, so `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL` are only required on the Web Service.

### 4. Run production migrations

Before or during deployment, apply migrations to your hosted database:

```bash
npx prisma migrate deploy
```

For early prototypes, you can use `npx prisma db push`, but migration files are recommended once the schema is shared or deployed.

## Core flows

1. Users register and are enrolled in the global league.
2. Users save match predictions until kickoff.
3. Recurring fixture sync jobs ingest fixture data from the external football API.
4. Outright pick option loading syncs live tournament teams and squads for Champion, Best Player, and Best Goalkeeper selections.
5. Live score jobs poll for completed matches and queue scoring work.
6. Scoring jobs recalculate prediction awards, exact-score counts, and global points.
7. Leaderboards sort by global points, exact-score count, and registration timestamp.
