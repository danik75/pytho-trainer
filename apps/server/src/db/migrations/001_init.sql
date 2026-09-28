CREATE TABLE users (
  id TEXT PRIMARY KEY,
  goals TEXT NOT NULL DEFAULT '',
  self_assessed_level TEXT NOT NULL DEFAULT '',
  diagnostic_notes TEXT NOT NULL DEFAULT '{}',
  selected_domains TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE curricula (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  raw_ai_response TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id),
  kind TEXT NOT NULL CHECK (kind IN ('foundations', 'domain')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  track_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tracks_curriculum ON tracks(curriculum_id);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id),
  origin TEXT NOT NULL DEFAULT 'roadmap' CHECK (origin IN ('roadmap', 'on_demand')),
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  learning_objectives TEXT NOT NULL DEFAULT '[]',
  prerequisite_topic_ids TEXT NOT NULL DEFAULT '[]',
  difficulty TEXT NOT NULL DEFAULT 'core' CHECK (difficulty IN ('intro', 'core', 'advanced')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_topics_track ON topics(track_id);

CREATE TABLE roadmap_entries (
  id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  sequence_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'mastered')),
  unlocked_at TEXT,
  mastered_at TEXT
);
CREATE INDEX idx_roadmap_curriculum_seq ON roadmap_entries(curriculum_id, sequence_index);

CREATE TABLE mastery_records (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL UNIQUE REFERENCES topics(id),
  mastery_score REAL NOT NULL DEFAULT 0,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  weak_spots TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'mastered', 'struggling')),
  last_updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  session_type TEXT NOT NULL CHECK (session_type IN ('theory', 'exercise')),
  session_number INTEGER NOT NULL,
  explanation_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_topic ON study_sessions(topic_id);

CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES study_sessions(id),
  prompt_md TEXT NOT NULL,
  starter_code TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'core' CHECK (difficulty IN ('intro', 'core', 'advanced')),
  target_weak_spots TEXT NOT NULL DEFAULT '[]',
  hidden_tests TEXT NOT NULL DEFAULT '[]',
  raw_ai_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_exercises_session ON exercises(session_id);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  code TEXT NOT NULL,
  stdout TEXT NOT NULL DEFAULT '',
  stderr TEXT NOT NULL DEFAULT '',
  exit_code INTEGER,
  timed_out INTEGER NOT NULL DEFAULT 0,
  test_results TEXT NOT NULL DEFAULT '[]',
  ai_evaluation TEXT,
  mastery_score_after REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_submissions_exercise ON submissions(exercise_id);

CREATE TABLE exam_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES study_sessions(id),
  question_md TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer')),
  choices TEXT,
  correct_answer TEXT NOT NULL,
  grading_notes TEXT NOT NULL DEFAULT '',
  raw_ai_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_exam_questions_session ON exam_questions(session_id);

CREATE TABLE exam_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES study_sessions(id),
  answers TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  ai_feedback TEXT,
  mastery_score_after REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_exam_attempts_session ON exam_attempts(session_id);

CREATE TABLE learning_overviews (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  narrative_md TEXT,
  generated_at TEXT
);
