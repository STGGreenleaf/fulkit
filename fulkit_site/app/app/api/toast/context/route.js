import { authenticateUser, toastFetch } from "../../../../lib/toast-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [restaurant, orders] = await Promise.all([
      toastFetch(userId, "/restaurants/v1/restaurants").catch(() => null),
      toastFetch(userId, "/orders/v2/orders?pageSize=10").catch(() => null),
    ]);

    return Response.json({
      restaurant: restaurant?.restaurantName || null,
      recentOrders: orders?.length || 0,
    });
  } catch (err) {
    console.error("[toast/context]", err.message);
    return Response.json({ error: "Failed to fetch Toast data" }, { status: 500 });
  }
}
