import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken, encryptMeta } from "../../../../lib/token-crypt";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/settings/sources?qb=error&reason=qb_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?qb=error&reason=missing_params", request.url));
    }

    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.QUICKBOOKS_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?qb=error&reason=bad_state", request.url));
    }

    // QuickBooks uses Basic auth for token exchange
    const basicAuth = Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString("base64");
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/quickbooks/callback`;

    const tokenRes = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[quickbooks/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?qb=error&reason=token_exchange", request.url));
    }

    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "quickbooks",
          access_token: encryptToken(tokenData.access_token),
          scope: tokenData.scope || "",
          metadata: encryptMeta({
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
            realm_id: realmId,
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[quickbooks/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings/sources?qb=error&reason=db_${dbError.code}`, request.url));
    }

    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "quickbooks" } }).then(() => {}).catch(() => {});
    return NextResponse.redirect(new URL("/settings/sources?qb=connected", request.url));
  } catch (err) {
    console.error("[quickbooks/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?qb=error", request.url));
  }
}
