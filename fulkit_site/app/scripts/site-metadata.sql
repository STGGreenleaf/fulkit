-- Site metadata table (editable from owner/socials)
CREATE TABLE site_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT DEFAULT 'Fülkit — I''ll be your bestie',
  description TEXT DEFAULT 'Your second brain that talks back. AI-powered notes, voice capture, and a bestie that knows everything you''ve saved.',
  og_title TEXT DEFAULT 'Fülkit — I''ll be your bestie',
  og_description TEXT DEFAULT 'The app that thinks with you.',
  og_image_url TEXT,
  og_image_slot INTEGER DEFAULT 1,
  twitter_image_url TEXT,
  canonical_url TEXT DEFAULT 'https://fulkit.app',
  robots TEXT DEFAULT 'index, follow',
  google_verification TEXT DEFAULT 'bxotBlliMEej3R9iaE9wMaMdCtF9IWBRsugS2lAN8Uo',
  theme_color TEXT DEFAULT '#EFEDE8',
  keywords TEXT,
  author TEXT,
  og_site_name TEXT DEFAULT 'Fülkit',
  twitter_handle TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with defaults
INSERT INTO site_metadata (id) VALUES (gen_random_uuid());

-- Storage bucket for OG images (public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('og-images', 'og-images', true);

-- Public read policy for OG images
CREATE POLICY "Public read og-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'og-images');

-- If table already exists, add new columns:
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS twitter_image_url TEXT;
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS canonical_url TEXT DEFAULT 'https://fulkit.app';
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS robots TEXT DEFAULT 'index, follow';
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS google_verification TEXT DEFAULT 'bxotBlliMEej3R9iaE9wMaMdCtF9IWBRsugS2lAN8Uo';
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#EFEDE8';
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS keywords TEXT;
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS author TEXT;
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS og_site_name TEXT DEFAULT 'Fülkit';
-- ALTER TABLE site_metadata ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
