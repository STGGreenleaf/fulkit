import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken, encryptMeta } from "../../../../lib/token-crypt";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/settings/sources?nt=error&reason=notion_${error}`, request.url));
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/settings/sources?nt=error&reason=missing_params", request.url));
    }

    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.NOTION_CLIENT_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return NextResponse.redirect(new URL("/settings/sources?nt=error&reason=bad_state", request.url));
    }

    // Notion uses Basic auth for token exchange
    const basicAuth = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString("base64");
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/notion/callback`;

    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[notion/callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/settings/sources?nt=error&reason=token_exchange", request.url));
    }

    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "notion",
          access_token: encryptToken(tokenData.access_token),
          scope: "",
          metadata: encryptMeta({
            workspace_name: tokenData.workspace_name,
            workspace_id: tokenData.workspace_id,
            bot_id: tokenData.bot_id,
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[notion/callback] DB error:", dbError.message);
      return NextResponse.redirect(new URL(`/settings/sources?nt=error&reason=db_${dbError.code}`, request.url));
    }

    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "notion" } }).then(() => {}).catch(() => {});
    return NextResponse.redirect(new URL("/settings/sources?nt=connected", request.url));
  } catch (err) {
    console.error("[notion/callback]", err.message);
    return NextResponse.redirect(new URL("/settings/sources?nt=error", request.url));
  }
}
