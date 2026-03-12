import { authenticateUser, squareFetch } from "../../../../lib/square-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Pull key data in parallel
    const today = new Date().toISOString().split("T")[0];
    const [locationsRes, ordersRes, paymentsRes] = await Promise.all([
      squareFetch(userId, "/locations"),
      squareFetch(userId, "/orders/search", {
        method: "POST",
        body: JSON.stringify({
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: `${today}T00:00:00Z`,
                  end_at: `${today}T23:59:59Z`,
                },
              },
            },
            sort: { sort_field: "CREATED_AT", sort_order: "DESC" },
          },
          limit: 100,
        }),
      }),
      squareFetch(userId, "/payments", {
        method: "GET",
      }),
    ]);

    const locations = locationsRes.error ? [] : (await locationsRes.json()).locations || [];
    const orders = ordersRes.error ? [] : (await ordersRes.json()).orders || [];
    const payments = paymentsRes.error ? [] : (await paymentsRes.json()).payments || [];

    // Today's payments only
    const todayPayments = payments.filter((p) => p.created_at?.startsWith(today));

    const totalRevenue = todayPayments.reduce((sum, p) => {
      const amount = p.amount_money?.amount || 0;
      return sum + amount;
    }, 0);

    return Response.json({
      locations: locations.length,
      todayOrders: orders.length,
      todayRevenue: totalRevenue / 100, // Square amounts are in cents
      todayPayments: todayPayments.length,
    });
  } catch (err) {
    console.error("[square/context]", err.message);
    return Response.json({ error: "Failed to fetch Square data" }, { status: 500 });
  }
}
