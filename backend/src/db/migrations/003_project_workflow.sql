-- Per-project Kanban workflow: ordered list of status columns shown on the board.
-- Transitions still follow the global state-machine; this controls which columns
-- appear and in what order (the "self-service workflow setup").
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS board_columns JSONB NOT NULL
  DEFAULT '["open","in_progress","build","testing","deploy","recheck","resolved","close"]'::jsonb;
