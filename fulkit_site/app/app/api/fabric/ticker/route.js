import Anthropic from "@anthropic-ai/sdk";
import { authenticateUser } from "../../../../lib/fabric-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory cache (per-process, clears on redeploy)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { trackId, title, artist, album } = await request.json();
    if (!trackId || !title) {
      return Response.json({ error: "trackId and title required" }, { status: 400 });
    }

    // Check cache
    const cached = cache.get(trackId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ fact: cached.fact });
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      system: "You are a music trivia expert. Give ONE short, interesting fact about the song or artist. One sentence max. No preamble, no quotes, just the fact. Be specific — studio names, session musicians, sample sources, chart positions, interesting production details. Never say \"fun fact\" or \"did you know\".",
      messages: [
        { role: "user", content: `"${title}" by ${artist}${album ? ` from ${album}` : ""}` },
      ],
    });

    const fact = msg.content?.[0]?.text?.trim() || null;
    if (fact) {
      cache.set(trackId, { fact, ts: Date.now() });
      // Evict old entries
      if (cache.size > 500) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
        for (let i = 0; i < 100; i++) cache.delete(oldest[i][0]);
      }
    }

    return Response.json({ fact });
  } catch (e) {
    console.error("[fabric/ticker] Error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
