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
  // Skip OAuth entirely — generate an app access token server-side,
  // then use it to get page tokens via system user or page subscriptions.
  //
  // For owner-only single-page use: generate token via the app credentials directly.

  try {
    // Step 1: Get app access token
    const appTokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`
    );
    const appTokenData = await appTokenRes.json();
    if (appTokenData.error) throw new Error(appTokenData.error.message);

    // Step 2: Try the OAuth dialog with ONLY public_profile (no page scopes that trigger the bug)
    // Then we'll get page tokens in a second step using the app token
    const params = new URLSearchParams({
      client_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      scope: "pages_manage_posts",
      response_type: "code",
    });

    // Use the plain oauth endpoint, not the business login one
    const url = `https://www.facebook.com/dialog/oauth?${params.toString()}`;
    return Response.redirect(url, 302);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
