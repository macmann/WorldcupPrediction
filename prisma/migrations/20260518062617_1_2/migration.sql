ALTER TABLE "outrights"
  ADD COLUMN "second_runner_up_team_id" UUID,
  ADD COLUMN "fair_play_team_id" UUID,
  ADD COLUMN "golden_boot_player_id" UUID,
  ADD COLUMN "young_player_id" UUID;

UPDATE "outrights" o
SET
  "second_runner_up_team_id" = o."champion_team_id",
  "fair_play_team_id" = o."champion_team_id",
  "golden_boot_player_id" = o."best_player_id",
  "young_player_id" = o."best_player_id"
WHERE
  "second_runner_up_team_id" IS NULL
  OR "fair_play_team_id" IS NULL
  OR "golden_boot_player_id" IS NULL
  OR "young_player_id" IS NULL;

ALTER TABLE "outrights"
  ALTER COLUMN "second_runner_up_team_id" SET NOT NULL,
  ALTER COLUMN "fair_play_team_id" SET NOT NULL,
  ALTER COLUMN "golden_boot_player_id" SET NOT NULL,
  ALTER COLUMN "young_player_id" SET NOT NULL;

ALTER TABLE "outrights"
  ADD CONSTRAINT "outrights_second_runner_up_team_id_fkey" FOREIGN KEY ("second_runner_up_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "outrights_fair_play_team_id_fkey" FOREIGN KEY ("fair_play_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "outrights_golden_boot_player_id_fkey" FOREIGN KEY ("golden_boot_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "outrights_young_player_id_fkey" FOREIGN KEY ("young_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
