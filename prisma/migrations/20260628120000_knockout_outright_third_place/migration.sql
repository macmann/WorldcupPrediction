ALTER TABLE "outrights" ADD COLUMN "third_place_team_id" UUID;

ALTER TABLE "outrights" ADD CONSTRAINT "outrights_third_place_team_id_fkey" FOREIGN KEY ("third_place_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "outrights_third_place_team_id_idx" ON "outrights"("third_place_team_id");
