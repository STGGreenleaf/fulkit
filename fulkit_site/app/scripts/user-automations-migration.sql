-- User Automations — scheduled recurring tasks any user can create via chat.
-- "Every day at 4pm, close out my Square and log to TrueGauge"
-- Run once in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS user_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule TEXT NOT NULL,        -- "daily:16:00", "weekly:mon:08:00", "monthly:1:09:00"
  timezone TEXT DEFAULT 'UTC',
  active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own automations"
  ON user_automations FOR ALL
  USING (auth.uid() = user_id);

-- Index for cron lookups
CREATE INDEX idx_user_automations_active ON user_automations(active, last_run_at);
