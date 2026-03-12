import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const shopParam = searchParams.get("shop");

    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?shopify=error&reason=missing_params", request.url));
    }

    // Verify HMAC-signed state
    let userId, shop;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      const parsed = JSON.parse(decoded.payload);
      userId = parsed.userId;
      shop = parsed.shop;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?shopify=error&reason=bad_state", request.url));
    }

    // Exchange code for permanent access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[shopify/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?shopify=error&reason=token_exchange", request.url));
    }

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "shopify",
          access_token: tokenData.access_token,
          scope: tokenData.scope || "",
          metadata: { shop },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[shopify/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings/sources?shopify=error&reason=db_${dbError.code}`, request.url));
    }

    return NextResponse.redirect(new URL("/settings/sources?shopify=connected", request.url));
  } catch (err) {
    console.error("[shopify/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?shopify=error", request.url));
  }
}
