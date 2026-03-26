import { authenticateUser, googleFetch } from "../../../../../lib/google-server";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") || new Date().toISOString();
  const end = searchParams.get("end") || new Date(Date.now() + 35 * 86400000).toISOString();

  try {
    // Fetch calendar list to get calendar names
    const listRes = await googleFetch(userId, "google_calendar", `${CALENDAR_API}/users/me/calendarList`);
    if (listRes.error) return Response.json({ events: [] });
    const calList = await listRes.json();
    const calendars = (calList.items || []).filter(c => c.selected !== false);
    const calNames = {};
    for (const cal of calendars) {
      calNames[cal.id] = cal.summary || cal.id;
    }

    // Fetch events from all visible calendars
    const allEvents = [];
    for (const cal of calendars.slice(0, 10)) {
      const params = new URLSearchParams({
        timeMin: start,
        timeMax: end,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
      });
      const res = await googleFetch(userId, "google_calendar", `${CALENDAR_API}/calendars/${encodeURIComponent(cal.id)}/events?${params}`);
      if (res.error || !res.ok) continue;
      const data = await res.json();
      for (const event of (data.items || [])) {
        if (event.status === "cancelled") continue;
        allEvents.push({
          id: event.id,
          title: event.summary || "(No title)",
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location || null,
          calendarId: cal.id,
          calendarName: calNames[cal.id] || "Calendar",
          source: "google_calendar",
        });
      }
    }

    return Response.json({ events: allEvents });
  } catch (err) {
    console.error("[google/calendar/events]", err.message);
    return Response.json({ events: [] });
  }
}
