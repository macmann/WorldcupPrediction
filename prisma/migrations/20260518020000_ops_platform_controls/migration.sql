CREATE TABLE "app_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "announcement_text" TEXT,
  "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_settings_singleton_check" CHECK ("id" = 1)
);

INSERT INTO "app_settings" ("id", "announcement_text", "maintenance_mode")
VALUES (1, NULL, false)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "admin_job_statuses" (
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "last_run_at" TIMESTAMPTZ,
  "last_success_at" TIMESTAMPTZ,
  "last_error" TEXT,
  "last_payload" JSONB,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_job_statuses_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "outright_settlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tournament_id" UUID NOT NULL,
  "golden_ball_player_id" UUID NOT NULL,
  "golden_glove_player_id" UUID NOT NULL,
  "settled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outright_settlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outright_settlements_tournament_id_key" ON "outright_settlements"("tournament_id");
CREATE INDEX "outright_settlements_settled_at_idx" ON "outright_settlements"("settled_at");

ALTER TABLE "outright_settlements"
  ADD CONSTRAINT "outright_settlements_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "outright_settlements_golden_ball_player_id_fkey" FOREIGN KEY ("golden_ball_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "outright_settlements_golden_glove_player_id_fkey" FOREIGN KEY ("golden_glove_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
