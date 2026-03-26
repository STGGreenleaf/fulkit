import { authenticateUser, trelloFetch } from "../../../../lib/trello-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get all boards
    const boards = await trelloFetch(userId, "/members/me/boards?fields=id,name,closed");
    const openBoards = (boards || []).filter(b => !b.closed);
    const boardNames = {};
    for (const b of openBoards) boardNames[b.id] = b.name;

    // Get cards with due dates from all open boards
    const allCards = [];
    for (const board of openBoards.slice(0, 10)) {
      try {
        const cards = await trelloFetch(userId, `/boards/${board.id}/cards?fields=id,name,due,dueComplete,idBoard,labels,shortUrl`);
        for (const card of (cards || [])) {
          if (!card.due) continue; // Only cards with due dates
          allCards.push({
            id: card.id,
            title: card.name,
            due_date: card.due.slice(0, 10), // YYYY-MM-DD
            dueComplete: card.dueComplete,
            boardId: card.idBoard,
            boardName: boardNames[card.idBoard] || "Board",
            labels: (card.labels || []).map(l => l.name || l.color),
            url: card.shortUrl,
            source: "trello",
          });
        }
      } catch { /* skip board on error */ }
    }

    return Response.json({ cards: allCards });
  } catch (err) {
    console.error("[trello/cards]", err.message);
    return Response.json({ cards: [] });
  }
}
