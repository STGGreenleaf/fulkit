import { authenticateUser } from "../../../../lib/fabric-server";
import { runPipeline } from "../../../../lib/btc/pipeline";

export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, currentTrack, audioFeatures, setTracks, bsidesTracks, tasteSummary } = await request.json();
    if (!messages?.length) {
      return Response.json({ error: "messages required" }, { status: 400 });
    }

    // Extract latest user message + conversation history for the pipeline
    const userMessage = messages[messages.length - 1]?.content?.trim();
    if (!userMessage) {
      return Response.json({ error: "Empty message" }, { status: 400 });
    }
    const conversationHistory = messages.slice(0, -1);

    // Build dynamic context block (same shape as before)
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
    if (bsidesTracks?.length) {
      const bList = bsidesTracks.slice(0, 15).map(t => `${t.artist} - ${t.title}`).join(", ");
      contextParts.push(`B-Sides (current crate — do NOT re-recommend): ${bList}${bsidesTracks.length > 15 ? "..." : ""}`);
    }
    // Taste profile — engagement signals from recommendation history
    if (tasteSummary) {
      const tp = [];
      if (tasteSummary.favorites?.length) {
        tp.push(`Favorites: ${tasteSummary.favorites.map(f => `${f.artist} - ${f.title} (score: ${f.score})`).join(", ")}`);
      }
      if (tasteSummary.passes?.length) {
        tp.push(`Passes (avoid similar): ${tasteSummary.passes.map(p => `${p.artist} - ${p.title}`).join(", ")}`);
      }
      if (tasteSummary.likedArtists?.length) {
        tp.push(`Preferred artists: ${tasteSummary.likedArtists.join(", ")}`);
      }
      if (tasteSummary.dislikedArtists?.length) {
        tp.push(`Avoided artists: ${tasteSummary.dislikedArtists.join(", ")}`);
      }
      if (tasteSummary.setNames?.length) {
        tp.push(`User's sets: ${tasteSummary.setNames.join(", ")}`);
      }
      if (tasteSummary.adoptionPatterns && Object.keys(tasteSummary.adoptionPatterns).length) {
        const adopted = Object.entries(tasteSummary.adoptionPatterns)
          .map(([set, tracks]) => `${set} \u2190 ${tracks.join(", ")}`)
          .join("; ");
        tp.push(`Adopted to sets: ${adopted}`);
      }
      if (tp.length) contextParts.push(`TASTE PROFILE:\n${tp.join("\n")}`);
    }

    const dynamicContext = contextParts.length
      ? `\nCURRENT CONTEXT (use this to inform your responses):\n${contextParts.join("\n")}`
      : "";

    // Run the 3-pass pipeline (classify → take → counter)
    // Returns a stream from either Pass 1 (fast path) or Pass 2 (full path)
    const stream = await runPipeline(userMessage, dynamicContext, conversationHistory);

    // Stream response as SSE (same format the frontend expects)
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
    console.error("[BTC] Route error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
