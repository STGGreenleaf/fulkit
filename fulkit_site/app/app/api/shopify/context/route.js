import { authenticateUser, shopifyFetch } from "../../../../lib/shopify-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [shopData, ordersData, productsData] = await Promise.all([
      shopifyFetch(userId, "/shop.json").catch(() => null),
      shopifyFetch(userId, "/orders.json?status=any&limit=10&order=created_at+desc").catch(() => null),
      shopifyFetch(userId, "/products/count.json").catch(() => null),
    ]);

    return Response.json({
      shop: shopData?.shop?.name || null,
      recentOrders: ordersData?.orders?.length || 0,
      productCount: productsData?.count || 0,
    });
  } catch (err) {
    console.error("[shopify/context]", err.message);
    return Response.json({ error: "Failed to fetch Shopify data" }, { status: 500 });
  }
}
