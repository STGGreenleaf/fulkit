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
      return NextResponse.redirect(new URL(`/settings/sources?stripe=error&reason=stripe_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?stripe=error&reason=missing_params", request.url));
    }

    // Verify HMAC-signed state
    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.STRIPE_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?stripe=error&reason=bad_state", request.url));
    }

    // Exchange code for access token (Stripe uses form-encoded)
    const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error("[stripe/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL(`/settings/sources?stripe=error&reason=token_exchange`, request.url));
    }

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "stripe",
          access_token: tokenData.access_token,
          scope: tokenData.scope || "read_only",
          metadata: {
            stripe_user_id: tokenData.stripe_user_id,
            refresh_token: tokenData.refresh_token,
            livemode: tokenData.livemode,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[stripe/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings/sources?stripe=error&reason=db_${dbError.code}`, request.url));
    }

    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "stripe" } }).then(() => {}).catch(() => {});
    return NextResponse.redirect(new URL("/settings/sources?stripe=connected", request.url));
  } catch (err) {
    console.error("[stripe/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?stripe=error", request.url));
  }
}
