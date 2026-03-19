-- Habit Engine — user_patterns table
-- Tracks what users do repeatedly so Chappie can predict context needs.

CREATE TABLE IF NOT EXISTS user_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_phrase text NOT NULL,
  action_taken text NOT NULL,
  ecosystem text,                    -- e.g. "square", "trello", "notes", "numbrly", "spotify"
  context_loaded text[] DEFAULT '{}',
  frequency integer DEFAULT 1,
  last_seen timestamptz DEFAULT now(),
  time_of_day text,                  -- "morning", "afternoon", "evening"
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trigger_phrase, action_taken)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_patterns_user_id ON user_patterns(user_id);

-- Index for pattern matching queries
CREATE INDEX IF NOT EXISTS idx_user_patterns_trigger ON user_patterns(user_id, trigger_phrase);

-- RLS: users can only access their own patterns
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own patterns"
  ON user_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON user_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON user_patterns FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass for server-side writes
CREATE POLICY "Service role full access"
  ON user_patterns FOR ALL
  USING (auth.role() = 'service_role');
