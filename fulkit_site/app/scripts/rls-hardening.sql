-- RLS Hardening — add Row Level Security to core tables
-- These tables were previously unprotected (all access via service role).
-- RLS adds a safety net: even if an API route has a bug, users can only access their own data.
-- Service role key bypasses RLS, so existing API routes are unaffected.

-- ── Profiles ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "service_role_full_profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ── Conversations ──
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_crud_own_conversations" ON conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

-- ── Messages ──
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_crud_own_messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_full_messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- ── Notes ──
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_crud_own_notes" ON notes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_notes" ON notes
  FOR ALL USING (auth.role() = 'service_role');

-- ── Actions ──
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_crud_own_actions" ON actions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_actions" ON actions
  FOR ALL USING (auth.role() = 'service_role');

-- ── Preferences ──
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_crud_own_preferences" ON preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_preferences" ON preferences
  FOR ALL USING (auth.role() = 'service_role');

-- ── Integrations ──
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_integrations" ON integrations
  FOR ALL USING (auth.role() = 'service_role');

-- ── Vault Broadcasts ──
ALTER TABLE vault_broadcasts ENABLE ROW LEVEL SECURITY;

-- Public read for announcement channel only (landing page)
CREATE POLICY "public_read_announcements" ON vault_broadcasts
  FOR SELECT USING (channel = 'announcement' AND active = true);

-- Authenticated users can read context channel (chat knowledge base)
CREATE POLICY "authenticated_read_context" ON vault_broadcasts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND channel IN ('context', 'fabric-context')
  );

-- Owner-context only readable by owner (checked at API layer, RLS as backup)
CREATE POLICY "owner_read_owner_context" ON vault_broadcasts
  FOR SELECT USING (
    channel = 'owner-context' AND auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "service_role_full_broadcasts" ON vault_broadcasts
  FOR ALL USING (auth.role() = 'service_role');
