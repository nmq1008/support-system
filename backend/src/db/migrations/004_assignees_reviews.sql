-- ═══════════════════════════════════════════════════════════════
-- Multiple assignees per ticket + moderator reviews / dev scoring
-- ═══════════════════════════════════════════════════════════════

-- Several devs can collaborate on one issue (owner_id stays the primary owner).
CREATE TABLE IF NOT EXISTS ticket_assignees (
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_assignees_user ON ticket_assignees(user_id);

-- Moderator review of a resolved/done ticket — rates the dev's work.
-- Feeds the dev-performance scorecard.
CREATE TABLE IF NOT EXISTS ticket_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  dev_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quality     INTEGER CHECK (quality BETWEEN 1 AND 5),
  timeliness  INTEGER CHECK (timeliness BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, dev_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_dev ON ticket_reviews(dev_id);
CREATE INDEX IF NOT EXISTS idx_reviews_ticket ON ticket_reviews(ticket_id);
