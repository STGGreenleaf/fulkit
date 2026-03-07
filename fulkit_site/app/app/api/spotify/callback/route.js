import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/settings?tab=sources&sp=error&reason=spotify_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings?tab=sources&sp=error&reason=missing_params", request.url));
    }

    // Verify HMAC-signed state
    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.SPOTIFY_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return NextResponse.redirect(new URL("/settings?tab=sources&sp=error&reason=bad_state", request.url));
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/spotify/callback`;
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error("[spotify/callback] Token exchange failed:", tokenData.error, tokenData.error_description);
      return NextResponse.redirect(new URL(`/settings?tab=sources&sp=error&reason=token_${tokenData.error}`, request.url));
    }

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "spotify",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          scope: tokenData.scope || "",
          metadata: {
            expires_at: Date.now() + tokenData.expires_in * 1000,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[spotify/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings?tab=sources&sp=error&reason=db_${dbError.code}`, request.url));
    }

    const response = NextResponse.redirect(new URL("/settings?tab=sources&sp=connected", request.url));
    response.cookies.delete("sp_auth_token");
    return response;
  } catch (err) {
    console.error("[spotify/callback]", err.message);
    return NextResponse.redirect(new URL("/settings?tab=sources&sp=error", request.url));
  }
}
