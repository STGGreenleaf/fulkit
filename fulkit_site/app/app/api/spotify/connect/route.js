import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

export async function GET(request) {
  try {
    // Accept token from query param, Authorization header, or cookie
    const url = new URL(request.url);
    const tokenFromParam = url.searchParams.get("token");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const tokenFromCookie = request.cookies.get("sp_auth_token")?.value;
    const token = tokenFromParam || tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.redirect(new URL("/settings?tab=sources&sp=error&reason=no_token", request.url));
    }

    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) {
      return NextResponse.redirect(new URL("/settings?tab=sources&sp=error&reason=bad_token", request.url));
    }

    // HMAC-signed state
    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.SPOTIFY_CLIENT_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/spotify/callback`;

    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    });

    return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[spotify/connect]", err.message);
    return NextResponse.redirect(new URL("/settings?tab=sources&sp=error&reason=server", request.url));
  }
}
