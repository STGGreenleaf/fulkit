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

    if (!token) {
      return NextResponse.redirect(new URL("/settings/sources?stripe=error&reason=no_token", request.url));
    }

    // Validate token — reject expired/invalid tokens (no unsigned fallback)
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data?.user) {
      return NextResponse.redirect(new URL("/settings/sources?stripe=error&reason=bad_token", request.url));
    }
    const user = data.user;

    // HMAC-signed state
    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.STRIPE_CLIENT_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/stripe/callback`;

    const params = new URLSearchParams({
      client_id: process.env.STRIPE_CLIENT_ID,
      response_type: "code",
      scope: "read_only",
      redirect_uri: redirectUri,
      state,
    });

    return NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[stripe/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?stripe=error&reason=server", request.url));
  }
}
