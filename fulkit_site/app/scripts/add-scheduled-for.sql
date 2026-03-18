-- Add scheduled_for column to actions table
-- Used by onboarding to schedule fallback actions on future days
-- Queries filter: scheduled_for IS NULL OR scheduled_for <= now()
ALTER TABLE actions ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT NULL;
