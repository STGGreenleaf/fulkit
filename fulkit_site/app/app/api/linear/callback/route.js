import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken } from "../../../../lib/token-crypt";
import crypto from "crypto";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    if (!code || !stateParam) return NextResponse.redirect(new URL("/settings/sources?linear=error&reason=missing_params", request.url));

    // Verify HMAC state
    const { payload, signature } = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    const hmac = crypto.createHmac("sha256", process.env.LINEAR_CLIENT_SECRET);
    hmac.update(payload);
    if (hmac.digest("hex") !== signature) return NextResponse.redirect(new URL("/settings/sources?linear=error&reason=csrf", request.url));

    const { userId } = JSON.parse(payload);

    // Exchange code for token
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/linear/callback`;
    const tokenRes = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINEAR_CLIENT_ID,
        client_secret: process.env.LINEAR_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[linear/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?linear=error&reason=token_exchange", request.url));
    }

    // Upsert integration
    const admin = getSupabaseAdmin();
    await admin.from("integrations").upsert({
      user_id: userId,
      provider: "linear",
      access_token: encryptToken(tokenData.access_token),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    // Log event (fire-and-forget)
    admin.from("user_events").insert({ user_id: userId, event: "integration_connected", meta: { provider: "linear" } }).then(() => {}).catch(() => {});

    return NextResponse.redirect(new URL("/settings/sources?linear=connected", request.url));
  } catch (err) {
    console.error("[linear/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?linear=error&reason=server", request.url));
  }
}
