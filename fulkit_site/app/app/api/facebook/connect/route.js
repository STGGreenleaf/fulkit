/**
 * GET /api/facebook/connect — Start Facebook OAuth to get a permanent Page token.
 * Uses META_APP_ID (not Threads). Requests only pages_manage_posts.
 */

const APP_ID = process.env.META_APP_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/facebook/callback`;

export async function GET() {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: "pages_show_list,pages_manage_posts,pages_read_engagement",
    response_type: "code",
  });

  return Response.redirect(`https://www.facebook.com/v25.0/dialog/oauth?${params.toString()}`, 302);
}
