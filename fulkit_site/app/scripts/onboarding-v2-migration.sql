-- Onboarding v2 Migration
-- Run in Supabase SQL Editor

-- 1. New table: onboarding_tiers (replaces question_phases)
CREATE TABLE IF NOT EXISTS public.onboarding_tiers (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_num              smallint NOT NULL UNIQUE,
  label                 text NOT NULL,
  intro                 text DEFAULT '',
  trust_line            text DEFAULT '',
  assignment_copy       text DEFAULT '',
  primary_destination   text DEFAULT '',
  secondary_destination text DEFAULT '',
  secondary_condition   text DEFAULT '',
  completion_trigger    text DEFAULT '',
  sort_order            smallint DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_tiers ENABLE ROW LEVEL SECURITY;

-- Owner (service role) manages tiers; no user access needed
CREATE POLICY "Service role full access on tiers"
  ON public.onboarding_tiers FOR ALL
  USING (true) WITH CHECK (true);

-- 2. Add v2 columns to questions table
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS tier_id           uuid REFERENCES public.onboarding_tiers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS trust_line        text DEFAULT '',
  ADD COLUMN IF NOT EXISTS copy_after_answer text DEFAULT '',
  ADD COLUMN IF NOT EXISTS allow_voice       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fulkit_action     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS follow_up         jsonb DEFAULT null;

-- 3. New table: onboarding_progress (per-user tier tracking)
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_num        smallint NOT NULL,
  questions_done  jsonb DEFAULT '[]'::jsonb,
  assignment_done boolean DEFAULT false,
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz DEFAULT null,
  UNIQUE(user_id, tier_num)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding progress"
  ON public.onboarding_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user
  ON public.onboarding_progress(user_id);

-- 4. Add trial/tier columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS current_tier     smallint DEFAULT 0;
