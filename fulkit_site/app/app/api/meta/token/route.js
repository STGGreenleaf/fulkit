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
  // Threads API uses its own OAuth flow (not Facebook Login)
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: "threads_basic,threads_content_publish",
    response_type: "code",
  });

  const url = `https://threads.net/oauth/authorize?${params.toString()}`;
  return Response.redirect(url, 302);
}
