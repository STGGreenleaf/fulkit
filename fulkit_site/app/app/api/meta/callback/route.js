/**
 * GET /api/meta/callback — OAuth callback from Facebook.
 * Exchanges code for user token → long-lived token → page token.
 * Stores page token in preferences table for the owner.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const APP_ID = process.env.THREADS_APP_ID || process.env.META_APP_ID;
const APP_SECRET = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/meta/callback`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return new Response(`<html><body><h2>Meta auth failed</h2><p>${error || "No code received"}</p><p><a href="/owner">Back to Owner</a></p></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Step 1: Exchange code for short-lived Threads token
    const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: APP_ID,
        client_secret: APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error?.message || JSON.stringify(tokenData));
    const shortToken = tokenData.access_token;
    const threadsUserId = tokenData.user_id;

    // Step 2: Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error?.message || JSON.stringify(longData));
    const longToken = longData.access_token;

    // Step 3: Get user profile to confirm
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${longToken}`
    );
    const profileData = await profileRes.json();
    const username = profileData.username || threadsUserId;
    const pageName = `@${username}`;

    // Step 4: Store in preferences (owner only — find owner user)
    const admin = getSupabaseAdmin();
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "owner")
      .single();

    if (ownerProfile) {
      await admin.from("preferences").upsert({
        user_id: ownerProfile.id,
        key: "threads_access_token",
        value: longToken,
        updated_at: new Date().toISOString(),
      });
      await admin.from("preferences").upsert({
        user_id: ownerProfile.id,
        key: "threads_user_id",
        value: String(threadsUserId),
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(
      `<html><body style="font-family:system-ui;padding:40px;max-width:500px;margin:0 auto">
        <h2 style="color:#2A2826">Connected</h2>
        <p><strong>Threads:</strong> ${pageName}</p>
        <p style="color:#666">Token stored. You can now post to Threads from F&uuml;lkit.</p>
        <a href="/owner" style="display:inline-block;margin-top:16px;padding:8px 20px;background:#2A2826;color:#EFEDE8;border-radius:6px;text-decoration:none">Back to Owner</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("[meta/callback] Error:", err.message);
    return new Response(
      `<html><body style="font-family:system-ui;padding:40px;max-width:500px;margin:0 auto">
        <h2 style="color:#c44">Error</h2>
        <p>${err.message}</p>
        <a href="/owner" style="display:inline-block;margin-top:16px;padding:8px 20px;background:#2A2826;color:#EFEDE8;border-radius:6px;text-decoration:none">Back to Owner</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
