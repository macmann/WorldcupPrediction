DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id
    INTO target_user_id
    FROM "users"
   WHERE email = 'kupodrssuodtysduomoipdre83@gmail.com';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot add prediction for match 537385: user kupodrssuodtysduomoipdre83@gmail.com was not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "matches" WHERE id = 537385) THEN
    RAISE EXCEPTION 'Cannot add prediction: match 537385 was not found';
  END IF;

  INSERT INTO "predictions" (
    "id",
    "user_id",
    "match_id",
    "predicted_outcome",
    "predicted_home_score",
    "predicted_away_score",
    "predicted_penalty_shootout",
    "points_awarded",
    "is_exact_score",
    "is_correct_outcome",
    "is_locked",
    "submitted_at",
    "updated_at",
    "scored_at"
  )
  VALUES (
    gen_random_uuid(),
    target_user_id,
    537385,
    'AWAY',
    1,
    3,
    false,
    NULL,
    false,
    false,
    false,
    now(),
    now(),
    NULL
  )
  ON CONFLICT ("user_id", "match_id") DO UPDATE
    SET "predicted_outcome" = EXCLUDED."predicted_outcome",
        "predicted_home_score" = EXCLUDED."predicted_home_score",
        "predicted_away_score" = EXCLUDED."predicted_away_score",
        "predicted_penalty_shootout" = EXCLUDED."predicted_penalty_shootout",
        "points_awarded" = NULL,
        "is_exact_score" = false,
        "is_correct_outcome" = false,
        "is_locked" = false,
        "updated_at" = now(),
        "scored_at" = NULL;
END $$;
