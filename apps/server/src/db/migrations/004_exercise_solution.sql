-- Adds a reference solution generated alongside each exercise, so a
-- "Solution" tab can reveal it after enough failed attempts.
ALTER TABLE exercises ADD COLUMN solution_code TEXT NOT NULL DEFAULT '';
ALTER TABLE exercises ADD COLUMN solution_explanation_md TEXT NOT NULL DEFAULT '';
