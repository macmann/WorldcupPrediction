CREATE TABLE "admin_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_accounts_username_key" ON "admin_accounts"("username");
