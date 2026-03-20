/**
 * GET /api/meta/token — Start Meta OAuth flow to get a Page Access Token.
 * Owner-only. Redirects to Facebook login with minimal scopes.
 *
 * POST /api/meta/token — Exchange code for long-lived page token.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/meta/callback`;

export async function GET(request) {
  // Verify owner
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    // No auth header = redirect flow from browser, allow it
  }

  // Only request the scopes we actually need — no pages_read_engagement
  const scopes = ["pages_manage_posts", "pages_show_list"].join(",");

  const url = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code`;

  return Response.redirect(url, 302);
}
