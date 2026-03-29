import { NextResponse } from "next/server";
import { getProvider } from "../../../../lib/fabric-server";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/settings/sources?sp=error&reason=spotify_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?sp=error&reason=missing_params", request.url));
    }

    // Verify HMAC-signed state
    let userId, providerName;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.SPOTIFY_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      const parsed = JSON.parse(decoded.payload);
      userId = parsed.userId;
      providerName = parsed.provider || "spotify";
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?sp=error&reason=bad_state", request.url));
    }

    // Exchange code for tokens via provider
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/fabric/callback`;
    const provider = getProvider(userId, providerName);

    if (!provider) {
      return NextResponse.redirect(new URL("/settings/sources?sp=error&reason=unknown_provider", request.url));
    }

    const result = await provider.exchangeCode(code, redirectUri);

    if (result.error) {
      console.error(`[fabric/callback] ${providerName} token exchange failed:`, result.error, result.error_description);
      return NextResponse.redirect(new URL(`/settings/sources?sp=error&reason=token_${result.error}`, request.url));
    }

    const response = NextResponse.redirect(new URL(`/settings/sources?sp=connected&fprovider=${providerName}`, request.url));
    response.cookies.delete("sp_auth_token");
    return response;
  } catch (err) {
    console.error("[fabric/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?sp=error", request.url));
  }
}
