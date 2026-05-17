CREATE TYPE "MatchOutcome" AS ENUM ('HOME', 'DRAW', 'AWAY');

ALTER TABLE "predictions"
  ADD COLUMN "predicted_outcome" "MatchOutcome",
  ALTER COLUMN "predicted_home_score" DROP NOT NULL,
  ALTER COLUMN "predicted_away_score" DROP NOT NULL;
