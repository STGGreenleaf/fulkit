import { authenticateUser, trelloFetch } from "../../../../lib/trello-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const boards = await trelloFetch(userId, "/members/me/boards?fields=id,name,url,dateLastActivity&filter=open").catch(() => []);

    return Response.json({
      boardCount: Array.isArray(boards) ? boards.length : 0,
      boards: (Array.isArray(boards) ? boards : []).slice(0, 10).map((b) => ({
        id: b.id,
        name: b.name,
        url: b.url,
      })),
    });
  } catch (err) {
    console.error("[trello/context]", err.message);
    return Response.json({ error: "Failed to fetch Trello data" }, { status: 500 });
  }
}
