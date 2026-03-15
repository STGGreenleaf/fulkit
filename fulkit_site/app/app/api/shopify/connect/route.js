import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

const SCOPES = [
  "read_orders",
  "read_products",
  "read_customers",
  "read_inventory",
  "read_analytics",
].join(",");

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const tokenFromParam = url.searchParams.get("token");
    const shop = url.searchParams.get("shop");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = tokenFromParam || tokenFromHeader;

    if (!token) {
      return NextResponse.redirect(new URL("/settings/sources?shopify=error&reason=no_token", request.url));
    }
    if (!shop) {
      return NextResponse.redirect(new URL("/settings/sources?shopify=error&reason=no_shop", request.url));
    }

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
        return NextResponse.redirect(new URL("/settings/sources?shopify=error&reason=bad_token", request.url));
      }
    }

    // Normalize shop domain
    const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

    // HMAC-signed state
    const payload = JSON.stringify({ userId: user.id, shop: shopDomain, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/shopify/callback`;

    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
    });

    return NextResponse.redirect(`https://${shopDomain}/admin/oauth/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[shopify/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?shopify=error&reason=server", request.url));
  }
}
