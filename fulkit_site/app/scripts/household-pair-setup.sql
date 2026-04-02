-- ═══════════════════════════════════════════════════════════════
-- Fülkit +Plus One — Household Pair Tables
-- Two consenting adults. One shared channel.
-- ═══════════════════════════════════════════════════════════════

-- ── pairs ──
-- Links two users. invitee_id is NULL until they accept.
-- invitee_name is the canonical display name for chat commands ("tell Shandy...").
CREATE TABLE IF NOT EXISTS pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | active | disconnected
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(inviter_id, invitee_email)
);

CREATE INDEX IF NOT EXISTS idx_pairs_inviter ON pairs(inviter_id);
CREATE INDEX IF NOT EXISTS idx_pairs_invitee ON pairs(invitee_id);
CREATE INDEX IF NOT EXISTS idx_pairs_invitee_email ON pairs(invitee_email);

-- RLS: read-only for paired users, all writes via service role
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_pairs" ON pairs
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "service_role_full_pairs" ON pairs
  FOR ALL USING (auth.role() = 'service_role');

-- ── household_items ──
-- Shared channel: tasks, notes, events, kid context.
-- Items vanish from UI when checked (checked=true kept for audit).
CREATE TABLE IF NOT EXISTS household_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'task',     -- task | note | event | kid_context
  list_name TEXT,                         -- grocery | packing | errands | custom | null
  title TEXT NOT NULL,
  body TEXT,                              -- love notes, event details, kid info
  checked BOOLEAN DEFAULT false,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',           -- { kid_name, detail_type, allergy, etc. }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_items_pair ON household_items(pair_id, checked, created_at);

-- No direct user RLS — all access through service role API routes (cross-user data)
ALTER TABLE household_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_household_items" ON household_items
  FOR ALL USING (auth.role() = 'service_role');
