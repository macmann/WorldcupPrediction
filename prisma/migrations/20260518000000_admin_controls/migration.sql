ALTER TABLE "users"
  ADD COLUMN "is_banned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ban_reason" TEXT,
  ADD COLUMN "banned_at" TIMESTAMPTZ;

ALTER TABLE "tournaments"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "matches"
  ADD COLUMN "is_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "users_is_banned_idx" ON "users"("is_banned");
CREATE INDEX "tournaments_is_active_starts_at_idx" ON "tournaments"("is_active", "starts_at");
CREATE INDEX "matches_is_enabled_kickoff_idx" ON "matches"("is_enabled", "kickoff_time");
