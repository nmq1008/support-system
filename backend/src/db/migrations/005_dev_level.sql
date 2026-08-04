-- ── Dev seniority level (L1–L10) for staff developers ──────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS dev_level SMALLINT
  CHECK (dev_level IS NULL OR dev_level BETWEEN 1 AND 10);
