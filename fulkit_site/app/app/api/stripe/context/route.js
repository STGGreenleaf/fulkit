import { authenticateUser, stripeFetch } from "../../../../lib/stripe-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [balance, charges] = await Promise.all([
      stripeFetch(userId, "/balance").catch(() => null),
      stripeFetch(userId, "/charges?limit=10").catch(() => null),
    ]);

    return Response.json({
      balance: balance?.available || [],
      recentCharges: charges?.data?.length || 0,
    });
  } catch (err) {
    console.error("[stripe/context]", err.message);
    return Response.json({ error: "Failed to fetch Stripe data" }, { status: 500 });
  }
}
