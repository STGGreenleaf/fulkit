-- Fix: seat_type column default was 'standard', should be 'free'
-- New signups were getting 450 messages (Standard) instead of 100 (trial)
-- Run once. Column default change + backfill any incorrectly assigned users.

-- 1. Change column default
ALTER TABLE public.profiles
  ALTER COLUMN seat_type SET DEFAULT 'free';

-- 2. Fix any new users who got 'standard' by mistake
--    (no stripe_customer_id = never paid, so they shouldn't be standard)
UPDATE public.profiles
SET seat_type = 'free'
WHERE seat_type = 'standard'
  AND stripe_customer_id IS NULL
  AND role != 'owner';
