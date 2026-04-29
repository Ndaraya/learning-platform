-- Add cycle tracking to task_submissions.
-- Each 2-attempt learning cycle is anchored by the first submission having cycle_start = true.
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS cycle_start boolean NOT NULL DEFAULT false;

-- Backfill: the earliest submission per (user_id, task_id) begins a cycle.
UPDATE task_submissions
SET cycle_start = true
WHERE id IN (
  SELECT DISTINCT ON (user_id, task_id) id
  FROM task_submissions
  ORDER BY user_id, task_id, created_at ASC
);
