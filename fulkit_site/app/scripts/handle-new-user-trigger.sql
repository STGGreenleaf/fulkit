-- Trigger: set seat_type='trial' on new user signup
-- Runs after a new row is inserted into profiles (created by Supabase Auth trigger)

CREATE OR REPLACE FUNCTION public.handle_new_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Set explicit defaults for new users
  IF NEW.seat_type IS NULL THEN
    NEW.seat_type := 'trial';
  END IF;
  IF NEW.messages_this_month IS NULL THEN
    NEW.messages_this_month := 0;
  END IF;
  IF NEW.message_count_reset_at IS NULL THEN
    NEW.message_count_reset_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_profile_created_defaults ON public.profiles;
CREATE TRIGGER on_profile_created_defaults
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_defaults();

-- Backfill: set seat_type for any existing NULL rows
UPDATE public.profiles
SET seat_type = 'trial'
WHERE seat_type IS NULL;
