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

    if (error) return NextResponse.redirect(new URL(`/settings/sources?sl=error&reason=slack_${error}`, request.url));
    if (!code || !stateParam) return NextResponse.redirect(new URL("/settings/sources?sl=error&reason=missing_params", request.url));

    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.SLACK_CLIENT_SECRET);
      hmac.update(decoded.payload);
      if (hmac.digest("hex") !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch { return NextResponse.redirect(new URL("/settings/sources?sl=error&reason=bad_state", request.url)); }

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/slack/callback`;
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, redirect_uri: redirectUri,
        client_id: process.env.SLACK_CLIENT_ID, client_secret: process.env.SLACK_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    // Slack v2: user token is under authed_user, bot token is top-level
    const userToken = tokenData.authed_user?.access_token || tokenData.access_token;
    if (!tokenData.ok || !userToken) {
      console.error("[slack/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?sl=error&reason=token_exchange", request.url));
    }

    const { error: dbError } = await getSupabaseAdmin().from("integrations").upsert({
      user_id: userId, provider: "slack",
      access_token: encryptToken(userToken), scope: tokenData.authed_user?.scope || tokenData.scope || "",
      metadata: encryptMeta({
        team_name: tokenData.team?.name,
        team_id: tokenData.team?.id,
      }),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    if (dbError) return NextResponse.redirect(new URL(`/settings/sources?sl=error&reason=db_${dbError.code}`, request.url));

    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "slack" } }).then(() => {}).catch(() => {});
    return NextResponse.redirect(new URL("/settings/sources?sl=connected", request.url));
  } catch (err) {
    console.error("[slack/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?sl=error", request.url));
  }
}
