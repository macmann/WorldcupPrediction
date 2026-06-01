-- Track whether award player options should come from provider-sync rows or the manual master list.
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'API';
CREATE INDEX IF NOT EXISTS "players_tournament_id_source_idx" ON "players"("tournament_id", "source");

ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "player_catalog_source" TEXT NOT NULL DEFAULT 'API';
