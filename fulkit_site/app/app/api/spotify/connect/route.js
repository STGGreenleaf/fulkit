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
    const authCookie = request.cookies.get("sp_auth_token")?.value;
    if (!authCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(authCookie);
    if (error || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // HMAC-signed state (same pattern as GitHub)
    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.SPOTIFY_CLIENT_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/spotify/callback`,
      scope: SCOPES,
      state,
    });

    return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[spotify/connect]", err.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
