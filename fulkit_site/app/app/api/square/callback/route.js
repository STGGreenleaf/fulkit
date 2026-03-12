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
      return NextResponse.redirect(new URL(`/settings/sources?sq=error&reason=square_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?sq=error&reason=missing_params", request.url));
    }

    // Verify HMAC-signed state
    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.SQUARE_APP_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?sq=error&reason=bad_state", request.url));
    }

    // Exchange code for tokens (Square uses JSON body, not form-encoded)
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/square/callback`;
    const tokenRes = await fetch("https://connect.squareup.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SQUARE_APP_ID,
        client_secret: process.env.SQUARE_APP_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[square/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL(`/settings/sources?sq=error&reason=token_exchange`, request.url));
    }

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "square",
          access_token: tokenData.access_token,
          scope: tokenData.scope || "",
          metadata: {
            refresh_token: tokenData.refresh_token,
            expires_at: new Date(tokenData.expires_at).getTime(),
            merchant_id: tokenData.merchant_id,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[square/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings/sources?sq=error&reason=db_${dbError.code}`, request.url));
    }

    return NextResponse.redirect(new URL("/settings/sources?sq=connected", request.url));
  } catch (err) {
    console.error("[square/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?sq=error", request.url));
  }
}
