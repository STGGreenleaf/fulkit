import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const tokenFromParam = url.searchParams.get("token");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = tokenFromParam || tokenFromHeader;
    if (!token) return NextResponse.redirect(new URL("/settings/sources?asana=error&reason=no_token", request.url));

    let user;
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && data?.user) { user = data.user; }
    else {
      try {
        const payloadB64 = token.split(".")[1];
        const claims = JSON.parse(Buffer.from(payloadB64, "base64").toString());
        const { data: adminData, error: adminError } = await getSupabaseAdmin().auth.admin.getUserById(claims.sub);
        if (adminError || !adminData?.user) throw new Error();
        user = adminData.user;
      } catch { return NextResponse.redirect(new URL("/settings/sources?asana=error&reason=bad_token", request.url)); }
    }

    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.ASANA_CLIENT_SECRET);
    hmac.update(payload);
    const state = Buffer.from(JSON.stringify({ payload, signature: hmac.digest("hex") })).toString("base64url");

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/asana/callback`;
    const params = new URLSearchParams({
      client_id: process.env.ASANA_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    return NextResponse.redirect(`https://app.asana.com/-/oauth_authorize?${params.toString()}`);
  } catch (err) {
    console.error("[asana/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?asana=error&reason=server", request.url));
  }
}
