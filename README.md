# World Cup Predictor Web App

A single deployable Next.js application for World Cup score predictions, private leagues, live fixture ingestion, and event-driven scoring.

## Stack

- **Single web app:** Next.js App Router serves the mobile UI and REST API routes from the same Render Web Service.
- **Frontend:** React and Tailwind CSS.
- **Backend:** Node.js route handlers in the same Next.js app.
- **Database:** PostgreSQL via Prisma ORM.
- **Background jobs:** Redis + BullMQ workers started inside the web process by `src/server.ts`.
- **Football data:** football-data.org-compatible API client with full-time score processing only.

## One-click Render deployment

This repository includes `render.yaml` for a Render Blueprint. It creates exactly one deployable web application plus the managed PostgreSQL and Redis resources the web app needs.

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Set the required secret `FOOTBALL_API_KEY` when prompted.
4. Deploy. Render runs `npm install --include=dev && npm run render-build`, then starts the single app with `npm run render-start`.

The web process starts Next.js and the BullMQ scheduler/workers together, so there is no separate frontend service, backend service, worker service, or cron service to deploy.

## Core flows

1. Users register through `POST /api/auth/register`; registration also enrolls them in the global league.
2. Users save match predictions until `current_server_time >= kickoff_time`.
3. The embedded scheduler upserts fixtures from the external football API daily.
4. The embedded live sync polls every three minutes and queues scoring when a match becomes `FINISHED`.
5. The embedded scoring worker recalculates prediction awards, exact-score counts, and global points.
6. Leaderboards sort by `global_points DESC`, `exact_scores_count DESC`, and `registration_timestamp ASC`.

## Local setup

```bash
cp .env.example .env
npm install
npm run prisma:migrate
npm run dev
```

For local production parity, run the same single-process entry point used by Render:

```bash
npm run build
npm start
```

Set `ENABLE_BACKGROUND_JOBS=false` if you want to start only the web server without embedded BullMQ workers.

## Important environment variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string for BullMQ
- `JWT_SECRET`: session signing secret
- `FOOTBALL_API_KEY`: football-data.org API token
- `TOURNAMENT_START_TIME`: cutoff for tournament outright picks
- `ENABLE_BACKGROUND_JOBS`: defaults to `true`; set to `false` to disable embedded jobs
