ALTER TABLE "users" ADD COLUMN "matches_played_count" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "leaderboard_tiebreaker_idx";
CREATE INDEX "leaderboard_tiebreaker_idx" ON "users"("global_points" DESC, "matches_played_count" ASC, "registration_timestamp" ASC);
