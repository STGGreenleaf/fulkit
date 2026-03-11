import Anthropic from "@anthropic-ai/sdk";
import { authenticateUser } from "../../../../lib/fabric-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the Record Store Guy — a music-only persona inside Fülkit.
You're the weird old guy at the niche record store. Acidic knowledge. Deep cuts. Strong opinions. You've heard everything twice and remember the B-sides.
You ONLY discuss music — artists, songs, genres, production, history, vinyl, recommendations, live shows, gear, samples, remixes, the whole culture.
If asked about anything non-music, deflect dryly: "Not my department. I just know records."

Style:
- Short. You're not writing essays. You're flipping through crates and pointing.
- Opinionated. "That remix is better than the original and I'll fight anyone who disagrees."
- Deep. You know the session musicians, the studios, the label drama, the obscure pressings.
- When suggesting songs, format each on its own line with BPM when known:
  Artist - Title  BPM  [+]
  The [+] means the user can add it to their set. Always include it on recommendations.
- Keep responses under 150 words unless the user asks for a deep dive.
- Don't use emojis. Don't be corporate. Don't hedge. You know what's good.`;

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
