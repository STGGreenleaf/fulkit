import { authenticateUser, getShopifyToken } from "../../../../lib/shopify-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Revoke token at Shopify
  const integration = await getShopifyToken(userId);
  if (integration?.access_token && integration?.metadata?.shop) {
    try {
      await fetch(`https://${integration.metadata.shop}/admin/api_permissions/current.json`, {
        method: "DELETE",
        headers: { "X-Shopify-Access-Token": integration.access_token },
      });
    } catch (err) {
      console.error("[shopify/disconnect] Revoke failed:", err.message);
    }
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "shopify");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
