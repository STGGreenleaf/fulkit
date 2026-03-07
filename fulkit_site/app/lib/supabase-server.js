// Server-side Supabase client — uses service role key, bypasses RLS
// Only import from server components and API routes. Never from client.

import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
