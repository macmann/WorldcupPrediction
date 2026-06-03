ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "game_rules_html" TEXT;
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "terms_conditions_html" TEXT;
