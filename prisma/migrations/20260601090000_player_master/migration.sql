-- Add the administrator-maintained display order from the WC26 player master.
ALTER TABLE "players" ADD COLUMN "sequence_number" INTEGER;

CREATE INDEX "players_tournament_id_sequence_number_idx" ON "players"("tournament_id", "sequence_number");
