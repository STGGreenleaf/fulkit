-- Referral system migration
-- Run in Supabase SQL Editor

-- ── 1. Add referral columns to profiles ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS referral_tier INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_active_referrals INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_ful_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS api_spend_this_month NUMERIC DEFAULT 0;

-- ── 2. Create referrals table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial',
  credit_ful_per_month INTEGER DEFAULT 100,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ── 3. Create ful_ledger table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ful_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_ful INTEGER NOT NULL,
  description TEXT,
  ref_id UUID REFERENCES referrals(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ful_ledger_user ON ful_ledger(user_id, created_at);

-- ── 4. Create payouts table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_ful INTEGER NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id, created_at);

-- ── 5. RLS policies ───────────────────────────────────────────────────
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ful_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Users can read their own referrals (as referrer or referred)
CREATE POLICY "Users read own referrals" ON referrals
  FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referred_id
  );

-- Users can read their own ledger entries
CREATE POLICY "Users read own ledger" ON ful_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own payouts
CREATE POLICY "Users read own payouts" ON payouts
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (API routes use admin client)
-- No INSERT/UPDATE/DELETE policies for regular users — all writes go through API routes with service role
