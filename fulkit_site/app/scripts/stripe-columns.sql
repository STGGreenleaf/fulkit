-- Add Stripe columns to profiles table for subscription management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Index for webhook lookups by customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
ON public.profiles (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;
