-- ═══════════════════════════════════════════════════════════════
-- Fülkit Job System — Background task execution
-- Any heavy operation runs here, not in the chat stream.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_jobs" ON jobs
  FOR ALL USING (auth.role() = 'service_role');
