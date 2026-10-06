# Additive competition migration

Migration: `20261005160000_persistent_competitions`.

## Purpose and backfill

Adds Competition, Season, optional Gameweek, separate standings/history, Banker, season picks, rivals, persistent achievements, H2H, bonus answers, immutable consensus, AI generation metadata and in-app notifications. Existing Tournament and outright tables remain. Match IDs gain a sequence for future fixtures. Every existing Tournament is copied to its own Competition/Season with the same UUID, a `legacy-` slug and original scoring configuration (2/3/1, legacy knockout behavior). Teams, players and matches with tournament references receive season mappings. Tournament-less records remain untouched for admin review. Existing predictions, point awards and user counters are not silently rewritten. Backfill helper supports tournaments created after migration.

Cross-season mapping triggers, Banker/prediction foreign keys and one-current-season-per-competition index enforce integrity beyond API validation. Prisma db push alone does not install these custom constraints.

## Existing production database

1. Take and verify a PostgreSQL backup; rehearse on a restored production copy. Inspect `_prisma_migrations` for failed/pending historical migrations and reconcile actual schema first.
2. This repository's historical migration chain is not a safe fresh bootstrap: an early alignment migration refers to later admin tables, and a later prediction backfill assumes a specific production account/match. Do not rewrite those migrations or create dummy production users to satisfy them.
3. On a database where prior migrations are already legitimately applied and the old schema is aligned, use `npx prisma migrate deploy` to apply the new additive migration. Resolve older discrepancies deliberately against your deployment history before running deploy.
4. Run `npm run prisma:generate`, `npm run platform:bootstrap`, then `npm run platform:recalculate`. Review copied legacy competitions, orphan records, settings and standings in admin. Bootstrap preserves existing configured records and creates no fixtures.
5. Configure football-data.org key/code/provider season, sync EPL fixtures and catalog, verify deadlines/locks/results and start workers. Verify production API plan/live delay separately.

Migration integration tests apply the old schema and synthetic legacy data, then the actual additive migration, and confirm original IDs, awards, tournament references and orphan data survive.

## Empty database

`npm run platform:init-database` refuses any database containing public tables. It applies the checked-in pre-platform baseline and the additive migration, then marks the historical migration names as resolved because their equivalent schema was installed. It does not execute the old production-specific data patch. This is an explicit bootstrap command, never an automatic production repair. Then run `npm run platform:bootstrap`.

## Compatibility and rollback

Old World Cup/tournament APIs, picks, workers and identifiers remain for history. Modern primary views use season-scoped standings instead of legacy global counters. Legacy knockout scoring is preserved per migrated season; modern seasons use configurable 1+3 defaults. Existing WC environment variables remain aliases for the retained legacy provider/configuration only.

The old application cannot interpret modern league-only teams/players without tournament IDs, so rolling application code back after modern traffic starts is not automatically safe. Prefer roll-forward repairs. For rollback before modern writes, restore the verified pre-migration database backup and matching application version; do not drop new tables on a live database or try to reverse provider sequence IDs. After modern writes, export/retain new season and social records before any rollback. No destructive down migration is provided. Rebuilds alter derived awards/ranks and can revoke invalid achievements; source predictions, fixtures and settlement records remain the basis for correction.
