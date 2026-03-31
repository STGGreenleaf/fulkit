import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken, encryptMeta } from "../../../../lib/token-crypt";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");
    if (error) return NextResponse.redirect(new URL(`/settings/sources?asana=error&reason=asana_${error}`, request.url));
    if (!code || !stateParam) return NextResponse.redirect(new URL("/settings/sources?asana=error&reason=missing_params", request.url));

    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.ASANA_CLIENT_SECRET);
      hmac.update(decoded.payload);
      if (hmac.digest("hex") !== decoded.signature) throw new Error();
      userId = JSON.parse(decoded.payload).userId;
    } catch { return NextResponse.redirect(new URL("/settings/sources?asana=error&reason=bad_state", request.url)); }

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/asana/callback`;
    const tokenRes = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ASANA_CLIENT_ID,
        client_secret: process.env.ASANA_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[asana/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?asana=error&reason=token_exchange", request.url));
    }

    const { error: dbError } = await getSupabaseAdmin().from("integrations").upsert({
      user_id: userId, provider: "asana",
      access_token: encryptToken(tokenData.access_token), scope: "",
      metadata: encryptMeta({
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        user_gid: tokenData.data?.gid || null,
      }),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    if (dbError) return NextResponse.redirect(new URL(`/settings/sources?asana=error&reason=db_${dbError.code}`, request.url));

    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "asana" } }).then(() => {}).catch(() => {});
    return NextResponse.redirect(new URL("/settings/sources?asana=connected", request.url));
  } catch (err) {
    console.error("[asana/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?asana=error", request.url));
  }
}
