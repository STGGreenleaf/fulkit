import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

const SCOPES = [
  "MERCHANT_PROFILE_READ",
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_READ",
  "PAYMENTS_WRITE",
  "ITEMS_READ",
  "ITEMS_WRITE",
  "INVENTORY_READ",
  "INVENTORY_WRITE",
  "CUSTOMERS_READ",
  "CUSTOMERS_WRITE",
  "INVOICES_READ",
  "INVOICES_WRITE",
  "EMPLOYEES_READ",
  "TIMECARDS_READ",
  "BANK_ACCOUNTS_READ",
].join("+");

export async function GET(request) {
  try {
    // Accept token from query param, Authorization header, or cookie
    const url = new URL(request.url);
    const tokenFromParam = url.searchParams.get("token");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = tokenFromParam || tokenFromHeader;

    if (!token) {
      return NextResponse.redirect(new URL("/settings/sources?sq=error&reason=no_token", request.url));
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
        return NextResponse.redirect(new URL("/settings/sources?sq=error&reason=bad_token", request.url));
      }
    }

    // HMAC-signed state
    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.SQUARE_APP_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/square/callback`;

    const params = new URLSearchParams({
      client_id: process.env.SQUARE_APP_ID,
      scope: SCOPES,
      session: "false",
      state,
      redirect_uri: redirectUri,
    });

    const baseUrl = (process.env.SQUARE_APP_ID || "").startsWith("sandbox-")
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";
    return NextResponse.redirect(`${baseUrl}/oauth2/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[square/connect]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?sq=error&reason=server", request.url));
  }
}
