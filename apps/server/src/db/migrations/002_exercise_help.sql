-- Adds the per-exercise "concepts" primer (syntax/background the student
-- needs before attempting the exercise) and a table for the tutor sidebar's
-- free-form help chat.
ALTER TABLE exercises ADD COLUMN concepts_md TEXT NOT NULL DEFAULT '';

CREATE TABLE exercise_help_messages (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_exercise_help_messages_exercise ON exercise_help_messages(exercise_id);
