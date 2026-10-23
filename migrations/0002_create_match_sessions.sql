CREATE TABLE IF NOT EXISTS match_sessions (
  token_hash TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_sessions_match_id ON match_sessions(match_id);
