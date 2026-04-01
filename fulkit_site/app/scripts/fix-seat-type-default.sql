-- Fix: seat_type column default was 'standard', should be 'trial'
-- New signups get 14-day trial (150 messages) not Standard (450 messages)
-- Run once.

-- 1. Change column default to 'trial'
ALTER TABLE public.profiles
  ALTER COLUMN seat_type SET DEFAULT 'trial';

-- 2. Rename 'free' → 'trial' for any existing rows
UPDATE public.profiles
SET seat_type = 'trial'
WHERE seat_type = 'free'
  AND role != 'owner';

-- 3. Fix any new users who got 'standard' by mistake
--    (no stripe_customer_id = never paid, so they shouldn't be standard)
UPDATE public.profiles
SET seat_type = 'trial'
WHERE seat_type = 'standard'
  AND stripe_customer_id IS NULL
  AND role != 'owner';
