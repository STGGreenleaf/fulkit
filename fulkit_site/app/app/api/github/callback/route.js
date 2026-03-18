import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken } from "../../../../lib/token-crypt";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");

    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?gh=error", request.url));
    }

    // Decode and verify HMAC-signed state
    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.GITHUB_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      const { userId: uid } = JSON.parse(decoded.payload);
      userId = uid;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?gh=error", request.url));
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error("[github/callback] Token exchange failed:", tokenData.error);
      return NextResponse.redirect(new URL("/settings/sources?gh=error", request.url));
    }

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "github",
          access_token: encryptToken(tokenData.access_token),
          scope: tokenData.scope || "",
          metadata: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[github/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL("/settings/sources?gh=error", request.url));
    }

    // Track integration connected event (fire-and-forget)
    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "github" } }).then(() => {}).catch(() => {});

    // Clear the temporary auth cookie and redirect to settings
    const response = NextResponse.redirect(new URL("/settings/sources?gh=connected", request.url));
    response.cookies.delete("gh_auth_token");
    return response;
  } catch (err) {
    console.error("[github/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?gh=error", request.url));
  }
}
