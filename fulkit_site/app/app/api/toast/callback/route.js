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
      return NextResponse.redirect(new URL(`/settings/sources?toast=error&reason=toast_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?toast=error&reason=missing_params", request.url));
    }

    // Verify HMAC-signed state
    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.TOAST_CLIENT_SECRET || "toast-placeholder");
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?toast=error&reason=bad_state", request.url));
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://ws-api.toasttab.com/usermgmt/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.TOAST_CLIENT_ID || "",
        client_secret: process.env.TOAST_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/toast/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[toast/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?toast=error&reason=token_exchange", request.url));
    }

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "toast",
          access_token: tokenData.access_token,
          scope: tokenData.scope || "",
          metadata: {
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
            restaurant_guid: tokenData.restaurant_guid || null,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[toast/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings/sources?toast=error&reason=db_${dbError.code}`, request.url));
    }

    return NextResponse.redirect(new URL("/settings/sources?toast=connected", request.url));
  } catch (err) {
    console.error("[toast/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?toast=error", request.url));
  }
}
