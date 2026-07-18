-- ═══════════════════════════════════════════════════════════════
-- HiDesk — initial schema
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Organizations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  code              TEXT NOT NULL UNIQUE,
  customer_priority TEXT NOT NULL DEFAULT 'silver'
                       CHECK (customer_priority IN ('platinum','gold','silver','bronze')),
  logo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Projects ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  code             TEXT NOT NULL,
  project_priority TEXT NOT NULL DEFAULT 'medium'
                      CHECK (project_priority IN ('critical','high','medium','low')),
  jira_url         TEXT,
  jira_key         TEXT,
  jira_token       TEXT,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

-- ── Users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL
                   CHECK (role IN ('super_admin','csm','dev_lead','dev','gate','customer_admin','customer')),
  org_id        UUID REFERENCES organizations(id) ON DELETE SET NULL, -- home org for customers
  language      TEXT NOT NULL DEFAULT 'vi' CHECK (language IN ('vi','en')),
  avatar        TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  notify_prefs  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── User ↔ Project access (with optional per-project role override) ─
CREATE TABLE IF NOT EXISTS user_project_access (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_override TEXT CHECK (role_override IN ('super_admin','csm','dev_lead','dev','gate','customer_admin','customer')),
  PRIMARY KEY (user_id, project_id)
);

-- ── User ↔ Org management (CSM assigned to orgs) ───────────────
CREATE TABLE IF NOT EXISTS user_org_access (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, org_id)
);

-- ── SLA config (base SLA per level + customer priority factor) ──
CREATE TABLE IF NOT EXISTS sla_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  priority_level    TEXT NOT NULL CHECK (priority_level IN ('P1','P2','P3','P4','P5')),
  customer_priority TEXT NOT NULL CHECK (customer_priority IN ('platinum','gold','silver','bronze')),
  response_hours    NUMERIC(8,2) NOT NULL,
  resolve_hours     NUMERIC(8,2) NOT NULL,
  UNIQUE (priority_level, customer_priority)
);

-- ── Templates (ticket form builder) ────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  name_en       TEXT,
  description   TEXT,
  icon          TEXT,
  category      TEXT,
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  is_global     BOOLEAN NOT NULL DEFAULT FALSE,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tags ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#2563EB'
);

-- ── Tickets ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'open',
  category              TEXT,
  priority_level        TEXT NOT NULL DEFAULT 'P3'
                           CHECK (priority_level IN ('P1','P2','P3','P4','P5')),
  template_id           UUID REFERENCES templates(id) ON DELETE SET NULL,
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  sla_response_deadline TIMESTAMPTZ,
  sla_resolve_deadline  TIMESTAMPTZ,
  sla_paused_at         TIMESTAMPTZ,
  first_response_at     TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  reopen_count          INTEGER NOT NULL DEFAULT 0,
  escalated             BOOLEAN NOT NULL DEFAULT FALSE,
  jira_issue_id         TEXT,
  jira_issue_url        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority_level);
-- Full-text-ish search on title + description
CREATE INDEX IF NOT EXISTS idx_tickets_title_trgm ON tickets USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_desc_trgm ON tickets USING gin (description gin_trgm_ops);

-- ── Custom template field values per ticket ────────────────────
CREATE TABLE IF NOT EXISTS ticket_fields (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  field_key   TEXT NOT NULL,
  field_value TEXT,
  UNIQUE (ticket_id, field_key)
);

-- ── Ticket history (audit log) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL DEFAULT 'update',
  old_status  TEXT,
  new_status  TEXT,
  field       TEXT,
  old_value   TEXT,
  new_value   TEXT,
  note        TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticket_id);

-- ── Comments (public / internal + @mention) ────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  mentions    UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);

-- ── Attachments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_size   BIGINT NOT NULL DEFAULT 0,
  mime_type   TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Ticket ↔ Tag ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_tags (
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- ── Notifications ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id  UUID REFERENCES tickets(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

-- ── updated_at trigger for tickets ─────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_updated ON tickets;
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
