import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import crypto from "crypto";

export async function GET(request) {
  try {
    // Get user from the temporary auth cookie set by the client
    const authCookie = request.cookies.get("gh_auth_token")?.value;
    if (!authCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(authCookie);
    if (error || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Build HMAC-signed state parameter
    const payload = JSON.stringify({ userId: user.id, nonce: crypto.randomUUID() });
    const hmac = crypto.createHmac("sha256", process.env.GITHUB_CLIENT_SECRET);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      scope: "repo",
      state,
    });

    return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  } catch (err) {
    console.error("[github/connect]", err.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
