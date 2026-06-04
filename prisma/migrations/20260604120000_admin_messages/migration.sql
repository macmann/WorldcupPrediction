CREATE TYPE "AdminMessageAudienceType" AS ENUM ('ALL', 'USER', 'LEAGUE');

CREATE TABLE "admin_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience_type" "AdminMessageAudienceType" NOT NULL,
    "sent_by_admin_id" UUID,
    "sent_by_admin_username" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_message_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_message_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_message_league_targets" (
    "message_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,

    CONSTRAINT "admin_message_league_targets_pkey" PRIMARY KEY ("message_id","league_id")
);

CREATE INDEX "admin_messages_created_at_idx" ON "admin_messages"("created_at");
CREATE INDEX "admin_messages_audience_type_created_at_idx" ON "admin_messages"("audience_type", "created_at");
CREATE UNIQUE INDEX "admin_message_receipts_message_id_user_id_key" ON "admin_message_receipts"("message_id", "user_id");
CREATE INDEX "admin_message_receipts_user_id_read_at_delivered_at_idx" ON "admin_message_receipts"("user_id", "read_at", "delivered_at");
CREATE INDEX "admin_message_receipts_message_id_idx" ON "admin_message_receipts"("message_id");
CREATE INDEX "admin_message_league_targets_league_id_idx" ON "admin_message_league_targets"("league_id");

ALTER TABLE "admin_message_receipts" ADD CONSTRAINT "admin_message_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "admin_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_message_receipts" ADD CONSTRAINT "admin_message_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_message_league_targets" ADD CONSTRAINT "admin_message_league_targets_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "admin_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_message_league_targets" ADD CONSTRAINT "admin_message_league_targets_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
