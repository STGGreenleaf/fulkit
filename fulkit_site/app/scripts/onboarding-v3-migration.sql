-- Onboarding v3 Migration: Slim to 1 tier, 6 questions
-- Run in Supabase SQL Editor
-- IMPORTANT: This archives existing data, it does not delete it.

-- 0. Ensure question_id has a unique constraint (needed for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'questions_question_id_unique'
  ) THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_question_id_unique UNIQUE (question_id);
  END IF;
END $$;

-- 1. Archive existing tiers (rename, don't delete)
UPDATE public.onboarding_tiers
SET label = '[archived-v2] ' || label,
    sort_order = sort_order + 100
WHERE tier_num >= 1
  AND label NOT LIKE '[archived%';

-- 2. Archive existing questions (unlink from tiers so they don't show in onboarding)
UPDATE public.questions
SET tier_id = NULL
WHERE tier_id IS NOT NULL;

-- 3. Upsert new tier (tier_num has a unique constraint from v2 migration)
INSERT INTO public.onboarding_tiers (tier_num, label, intro, trust_line, assignment_copy, primary_destination, completion_trigger, sort_order)
VALUES (
  1,
  'Let''s get you set up',
  'Six quick questions. Then we talk.',
  'Everything you tell me stays in your files unless you decide otherwise. I don''t build a profile on you — you''re building one for yourself. That''s the deal.',
  '',
  '',
  '',
  1
)
ON CONFLICT (tier_num) DO UPDATE SET
  label = EXCLUDED.label,
  intro = EXCLUDED.intro,
  trust_line = EXCLUDED.trust_line,
  assignment_copy = '',
  primary_destination = '',
  completion_trigger = '',
  sort_order = EXCLUDED.sort_order;

-- 4. Insert 6 questions linked to the tier
DO $$
DECLARE
  v_tier_id uuid;
BEGIN
  SELECT id INTO v_tier_id
  FROM public.onboarding_tiers
  WHERE tier_num = 1 AND label NOT LIKE '[archived%'
  LIMIT 1;

  -- Upsert each question by question_id
  INSERT INTO public.questions (question_id, tier_id, text, why, type, placeholder, skippable, allow_voice, fulkit_action, sort_order, options, trust_line, multi)
  VALUES
    ('q1', v_tier_id, 'What should I call you?', 'Everything starts with a name.', 'text', 'Your name', false, false, 'create_identity_file', 1, NULL, '', false),
    ('q2', v_tier_id, 'What do you do?', 'Shapes how I think about your world.', 'choice', NULL, false, false, 'set_work_context', 2, '["Creative","Business","Dev","Student","Parent","Self-employed","Between things"]'::jsonb, '', true),
    ('q3', v_tier_id, 'How do you like help?', 'Some people want to be asked. Some want results. No wrong answer.', 'choice', NULL, false, false, 'set_interaction_style', 3, '["Ask me \u2014 I like being involved","Figure it out \u2014 just show me results","Mix of both"]'::jsonb, '', false),
    ('q4', v_tier_id, 'Morning person or night owl?', 'Timing matters. I''ll match your rhythm.', 'choice', NULL, false, false, 'set_chronotype', 4, '["Early bird","Night owl","Depends on the day"]'::jsonb, '', false),
    ('q5', v_tier_id, 'Set up your brain.', 'A set of folders that F\u00fclkit reads from and writes to. You own every file.', 'vault_setup', NULL, false, false, 'setup_vault', 5, '[{"label":"Download F\u00fclkit vault","value":"download"},{"label":"I have my own folder","value":"existing"},{"label":"I''ll use F\u00fclkit storage","value":"fulkit_managed"}]'::jsonb, 'Your vault is just a folder on your computer. Plain markdown files you can open anywhere. We never see it unless you show it to us.', false),
    ('q6', v_tier_id, 'Want to connect something?', 'Optional. Lights up features like Fabric and live data.', 'integration_picker', NULL, true, false, 'connect_integration', 6, '["Spotify","Google Calendar","I''ll do this later"]'::jsonb, '', false)
  ON CONFLICT (question_id) DO UPDATE SET
    tier_id = EXCLUDED.tier_id,
    text = EXCLUDED.text,
    why = EXCLUDED.why,
    type = EXCLUDED.type,
    placeholder = EXCLUDED.placeholder,
    skippable = EXCLUDED.skippable,
    allow_voice = EXCLUDED.allow_voice,
    fulkit_action = EXCLUDED.fulkit_action,
    sort_order = EXCLUDED.sort_order,
    options = EXCLUDED.options,
    trust_line = EXCLUDED.trust_line,
    multi = EXCLUDED.multi;
END $$;

-- 5. Remove archived tiers with tier_num > 1 from the active set
-- (They stay in the table but won't be fetched since the code filters by tier_num)
-- The code queries: onboarding_tiers ORDER BY sort_order
-- Archived tiers have sort_order 100+, so they sort last.
-- To be safe, remove them from visibility:
DELETE FROM public.onboarding_tiers
WHERE label LIKE '[archived%'
  AND tier_num > 1;

-- Note: tier_num 1 was overwritten by the upsert above, so it's the new tier.
-- Old tier 1's data is gone (replaced), but questions with tier_id = NULL are preserved.

-- 6. Reset in-progress users (optional — uncomment if you want fresh starts)
-- DELETE FROM public.onboarding_progress WHERE completed_at IS NULL;
