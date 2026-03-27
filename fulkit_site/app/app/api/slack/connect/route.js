import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

const SCOPES = "channels:read,channels:history,search:read,users:read";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const tokenFromParam = url.searchParams.get("token");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = tokenFromParam || tokenFromHeader;

    if (!token) return NextResponse.redirect(new URL("/settings/sources?sl=error&reason=no_token", request.url));

    let user;
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && data?.user) { user = data.user; }
    else {
      try {
        const payloadB64 = token.split(".")[1];
        const claims = JSON.parse(Buffer.from(payloadB64, "base64").toString());
        const userId = claims.sub;
        if (!userId) throw new Error("No sub");
        const { data: adminData, error: adminError } = await getSupabaseAdmin().auth.admin.getUserById(userId);
        if (adminError || !adminData?.user) throw new Error("Not found");
        user = adminData.user;
      } catch { return NextResponse.redirect(new URL("/settings/sources?sl=error&reason=bad_token", request.url)); }
    }

    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.SLACK_CLIENT_SECRET);
    hmac.update(payload);
    const state = Buffer.from(JSON.stringify({ payload, signature: hmac.digest("hex") })).toString("base64url");
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/slack/callback`;

    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    });

    return NextResponse.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[slack/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?sl=error&reason=server", request.url));
  }
}
