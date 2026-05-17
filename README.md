# World Cup Predictor Web App

A mobile-first Next.js application for World Cup score predictions, private leagues, live fixture ingestion, and event-driven scoring.

## Stack

- **Frontend:** Next.js App Router, React, Tailwind CSS
- **Backend:** Next.js REST route handlers running on Node.js
- **Database:** PostgreSQL via Prisma ORM
- **Background jobs:** Redis + BullMQ workers and schedulers
- **Football data:** football-data.org-compatible API client with full-time score processing only

## Core flows

1. Users register through `POST /api/auth/register`; registration also enrolls them in the global league.
2. Users save match predictions until `current_server_time >= kickoff_time`.
3. Daily ingestion upserts fixtures from the external football API.
4. Three-minute live sync updates live scores and queues scoring when a match becomes `FINISHED`.
5. The scoring worker recalculates prediction awards, exact-score counts, and global points.
6. Leaderboards sort by `global_points DESC`, `exact_scores_count DESC`, and `registration_timestamp ASC`.

## Local setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Run workers in separate terminals:

```bash
npm run scheduler
npm run worker
```

## Important environment variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string for BullMQ
- `JWT_SECRET`: session signing secret
- `FOOTBALL_API_KEY`: football-data.org API token
- `TOURNAMENT_START_TIME`: cutoff for tournament outright picks
