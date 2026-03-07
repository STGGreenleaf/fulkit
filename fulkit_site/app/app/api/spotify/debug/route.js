export async function GET() {
  return Response.json({
    hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
    clientIdLength: process.env.SPOTIFY_CLIENT_ID?.length || 0,
    clientIdPrefix: process.env.SPOTIFY_CLIENT_ID?.slice(0, 4) || "missing",
    hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "not set",
  });
}
