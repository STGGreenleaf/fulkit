import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";
import { encryptToken, encryptMeta } from "../../../../../lib/token-crypt";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/settings/sources?strava=error&reason=strava_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?strava=error&reason=missing_params", request.url));
    }

    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.STRAVA_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?strava=error&reason=bad_state", request.url));
    }

    // Strava uses POST body params for token exchange (not Basic auth)
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/health/strava/callback`;
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[strava/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?strava=error&reason=token_exchange", request.url));
    }

    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "strava",
          access_token: encryptToken(tokenData.access_token),
          scope: tokenData.scope || SCOPES || "",
          metadata: encryptMeta({
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at * 1000, // Strava returns unix seconds
            athlete_id: tokenData.athlete?.id,
            athlete_name: `${tokenData.athlete?.firstname || ""} ${tokenData.athlete?.lastname || ""}`.trim(),
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[strava/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings/sources?strava=error&reason=db_${dbError.code}`, request.url));
    }

    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "strava" } }).then(() => {}).catch(() => {});
    return NextResponse.redirect(new URL("/settings/sources?strava=connected", request.url));
  } catch (err) {
    console.error("[strava/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?strava=error", request.url));
  }
}
