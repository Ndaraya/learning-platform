-- Add hint caching column to questions table
-- Hints are AI-generated on first request and cached here for subsequent requests
ALTER TABLE questions ADD COLUMN IF NOT EXISTS hint text;

-- Index for efficient per-question attempt history lookups
-- Used by question-hint and question-explanation routes to verify attempt counts
CREATE INDEX IF NOT EXISTS question_responses_question_id_idx ON question_responses (question_id);
