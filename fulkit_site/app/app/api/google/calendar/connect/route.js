import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";
import crypto from "crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const tokenFromParam = url.searchParams.get("token");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = tokenFromParam || tokenFromHeader;

    if (!token) {
      return NextResponse.redirect(new URL("/settings/sources?gc=error&reason=no_token", request.url));
    }

    // Try valid token first, fall back to decoding expired JWT for user ID
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
        return NextResponse.redirect(new URL("/settings/sources?gc=error&reason=bad_token", request.url));
      }
    }

    // HMAC-signed state
    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.GOOGLE_OAUTH_CLIENT_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/google/calendar/callback`;

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (err) {
    console.error("[google/calendar/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?gc=error&reason=server", request.url));
  }
}
