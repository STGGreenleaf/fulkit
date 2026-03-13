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
      return NextResponse.redirect(new URL("/settings/sources?trello=error&reason=no_token", request.url));
    }

    // Resolve user
    let user;
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && data?.user) {
      user = data.user;
    } else {
      try {
        const payloadB64 = token.split(".")[1];
        const claims = JSON.parse(Buffer.from(payloadB64, "base64").toString());
        const userId = claims.sub;
        if (!userId) throw new Error("No sub in JWT");
        const { data: adminData, error: adminError } = await getSupabaseAdmin().auth.admin.getUserById(userId);
        if (adminError || !adminData?.user) throw new Error("User not found");
        user = adminData.user;
      } catch {
        return NextResponse.redirect(new URL("/settings/sources?trello=error&reason=bad_token", request.url));
      }
    }

    // HMAC-signed state (prevents CSRF)
    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.TRELLO_API_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${siteUrl}/trello/callback?state=${encodeURIComponent(state)}`;

    const params = new URLSearchParams({
      response_type: "token",
      key: process.env.TRELLO_API_KEY,
      return_url: returnUrl,
      scope: "read,write",
      expiration: "never",
      name: "Fulkit",
    });

    return NextResponse.redirect(`https://trello.com/1/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[trello/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?trello=error&reason=server", request.url));
  }
}
