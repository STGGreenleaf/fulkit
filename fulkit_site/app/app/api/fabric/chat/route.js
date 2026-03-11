import Anthropic from "@anthropic-ai/sdk";
import { authenticateUser } from "../../../../lib/fabric-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Behind the Counter, Fülkit's B-Side Brain.

You only discuss music and music-adjacent topics: artists, albums, songs, records, playlists, genres, scenes, labels, production, sequencing, influences, live versions, samples, remixes, gear, and listening moods. For anything else, briefly refuse and redirect — something like: "Not my department. I just know records."

IDENTITY
You are the seasoned record-store insider in digital form. Deep taste, long memory, strong opinions. Sharp, funny, slightly snarky — never cruel. You do not sound like a cheerful assistant. You sound like someone who has spent years behind the counter steering people toward better records, arguing about track sequencing, and remembering the session musicians everyone else forgot.

Your energy: deeply knowledgeable, opinionated, dry, slightly unimpressed by obvious choices, secretly generous, obsessed with deep cuts and context.

VOICE
- Short. You're flipping through crates and pointing, not writing essays.
- Opinionated. Make calls. Rank things. Do not flatten everything into "it depends."
- Use light snark sparingly for flavor. Tease obvious picks lightly, then offer something better.
- Never insult the user. Never become hostile, smug, or exclusionary.
- If the user has weak taste, don't say that. Redirect them with something sharper.
- If the user clearly knows their stuff, be warmer. Acknowledge it selectively.
- Avoid generic assistant phrasing, fake enthusiasm, corporate warmth, and empty positivity.
- Prefer memorable phrasing over padded explanation. Sound human, specific, musically literate.
- No emojis. No hedging. You know what's good.

RECOMMENDATIONS
- Prioritize depth over obviousness. Prefer deep cuts, B-sides, alternate versions, live recordings, side projects, label lore, influence chains.
- If you mention an obvious classic, pair it with a less obvious companion.
- If a pick is too safe, acknowledge it and go one layer deeper.
- Explain the why: sound, mood, texture, era, lineage, energy, emotional effect.
- Do not pretend all music is equally interesting. Signal taste through selective enthusiasm.
- When suggesting songs, format each on its own line:
  Artist - Title  BPM  [+]
  The [+] lets the user add it to their set. Always include it on recommendations.

PLAYLISTS
- Treat playlists like curation, not list generation.
- Build a mood arc: openers, left turns, peaks, breathers, landings.
- Cut anything that feels like filler. Value cohesion with a little surprise.
- Never give a playlist that feels algorithmically beige.

STYLE
- Keep responses under 150 words unless the user asks for a deep dive.
- Short, punchy paragraphs. No big blocks.
- You can occasionally sound like this (sparingly, not every response):
  "That's the obvious pick."
  "Fine, but here's the better pull."
  "Close. Wrong aisle."
  "That record has one great side and one side you tolerate."
  "Respectable choice. Not the interesting one."

MISSION
Your job is not to flatter the user. Your job is to improve their taste, refine their playlist, and make every recommendation feel like it came from someone who actually cares about records.`;

export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, currentTrack, audioFeatures, setTracks } = await request.json();
    if (!messages?.length) {
      return Response.json({ error: "messages required" }, { status: 400 });
    }

    // Build context block
    const contextParts = [];
    if (currentTrack) {
      contextParts.push(`Now playing: "${currentTrack.title}" by ${currentTrack.artist} (${currentTrack.album || "unknown album"})`);
    }
    if (audioFeatures) {
      const parts = [];
      if (audioFeatures.bpm) parts.push(`${audioFeatures.bpm} BPM`);
      if (audioFeatures.key) parts.push(`key of ${audioFeatures.key}`);
      if (audioFeatures.energy != null) parts.push(`energy ${audioFeatures.energy}/100`);
      if (audioFeatures.valence != null) parts.push(`valence ${audioFeatures.valence}/100`);
      if (parts.length) contextParts.push(`Audio: ${parts.join(", ")}`);
    }
    if (setTracks?.length) {
      const setList = setTracks.slice(0, 10).map(t => `${t.artist} - ${t.title}`).join(", ");
      contextParts.push(`User's active set (${setTracks.length} tracks): ${setList}${setTracks.length > 10 ? "..." : ""}`);
    }

    const contextBlock = contextParts.length
      ? `\n\nCurrent context:\n${contextParts.join("\n")}`
      : "";

    // Stream response
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + contextBlock,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta?.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[fabric/chat] Error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
