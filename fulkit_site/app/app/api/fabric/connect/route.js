import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getProvider } from "../../../../lib/fabric-server";
import crypto from "crypto";

export async function GET(request) {
  try {
    // Accept token from query param, Authorization header, or cookie
    const url = new URL(request.url);
    const tokenFromParam = url.searchParams.get("token");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const tokenFromCookie = request.cookies.get("sp_auth_token")?.value;
    const token = tokenFromParam || tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.redirect(new URL("/settings/sources?sp=error&reason=no_token", request.url));
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
        return NextResponse.redirect(new URL("/settings/sources?sp=error&reason=bad_token", request.url));
      }
    }

    // HMAC-signed state (includes provider name for callback to know which provider)
    const providerName = url.searchParams.get("provider") || "spotify";
    const payload = JSON.stringify({ userId: user.id, provider: providerName, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.SPOTIFY_CLIENT_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/fabric/callback`;

    const provider = getProvider(user.id, providerName);
    if (!provider) {
      return NextResponse.redirect(new URL(`/settings/sources?sp=error&reason=unknown_provider`, request.url));
    }

    const authUrl = provider.getConnectUrl(redirectUri, state);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("[fabric/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?sp=error&reason=server", request.url));
  }
}
