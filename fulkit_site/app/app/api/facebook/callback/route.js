/**
 * GET /api/facebook/callback — Facebook OAuth callback.
 * Exchanges code → short-lived user token → long-lived user token → permanent page token.
 * Stores page token + page ID in preferences. Used for Facebook + Instagram posting.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/facebook/callback`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return new Response(
      `<html><body style="font-family:system-ui;padding:40px;max-width:500px;margin:0 auto">
        <h2 style="color:#c44">Facebook auth failed</h2>
        <p>${error || "No code received"}</p>
        <a href="/owner" style="display:inline-block;margin-top:16px;padding:8px 20px;background:#2A2826;color:#EFEDE8;border-radius:6px;text-decoration:none">Back to Owner</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    // Step 1: Exchange code for short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    // Step 2: Exchange for long-lived user token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error.message);

    // Step 3: Get page token (permanent when derived from long-lived user token)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?access_token=${longData.access_token}`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    const pages = pagesData.data || [];
    if (pages.length === 0) throw new Error("No pages found. Make sure you have a Facebook Page.");

    const page = pages[0];
    const pageToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    // Step 4: Store permanently in preferences
    const admin = getSupabaseAdmin();
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "owner")
      .single();

    if (ownerProfile) {
      await admin.from("preferences").upsert({
        user_id: ownerProfile.id,
        key: "meta_page_token",
        value: pageToken,
        updated_at: new Date().toISOString(),
      });
      await admin.from("preferences").upsert({
        user_id: ownerProfile.id,
        key: "meta_page_id",
        value: pageId,
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(
      `<html><body style="font-family:system-ui;padding:40px;max-width:500px;margin:0 auto">
        <h2 style="color:#2A2826">Facebook Connected</h2>
        <p><strong>Page:</strong> ${pageName}</p>
        <p><strong>Page ID:</strong> ${pageId}</p>
        <p style="color:#666">Permanent page token stored. Facebook + Instagram posting ready.</p>
        <a href="/owner" style="display:inline-block;margin-top:16px;padding:8px 20px;background:#2A2826;color:#EFEDE8;border-radius:6px;text-decoration:none">Back to Owner</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("[facebook/callback] Error:", err.message);
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
