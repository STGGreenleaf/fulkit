-- Scale indexes — composite indexes for high-traffic queries
-- Run: npx supabase db query --linked < scripts/scale-indexes.sql
-- Created: Session 18 (2026-03-18)

-- Notes: vault context assembly, note search, user note listing
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON notes(user_id, created_at DESC);

-- Conversations: history panel, recent conversations in system prompt
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

-- Messages: conversation restore, message history
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- Actions: action list page, auto-resolve, chat tools
CREATE INDEX IF NOT EXISTS idx_actions_user_status ON actions(user_id, status);

-- Signals: Radio feed queries (filtered by signal: prefix)
CREATE INDEX IF NOT EXISTS idx_user_events_signal ON user_events(event, created_at DESC) WHERE event LIKE 'signal:%';
