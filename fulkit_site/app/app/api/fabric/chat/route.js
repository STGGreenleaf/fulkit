import { authenticateUser } from "../../../../lib/fabric-server";
import { runPipeline } from "../../../../lib/btc/pipeline";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, currentTrack, audioFeatures, setTracks, bsidesTracks, tasteSummary, connectedProviders, spotifyConnected, sonosGroups } = await request.json();
    if (!messages?.length) {
      return Response.json({ error: "messages required" }, { status: 400 });
    }

    // Extract latest user message + conversation history for the pipeline
    const userMessage = messages[messages.length - 1]?.content?.trim();
    if (!userMessage) {
      return Response.json({ error: "Empty message" }, { status: 400 });
    }
    const conversationHistory = messages.slice(0, -1);

    // Fetch Fabric Knowledge Base (B-Side's own island — music only)
    let fabricKB = "";
    try {
      const { data: fabricDocs } = await getSupabaseAdmin()
        .from("vault_broadcasts")
        .select("title, content")
        .eq("channel", "fabric-context")
        .eq("active", true)
        .abortSignal(AbortSignal.timeout(5000));
      if (fabricDocs?.length) {
        fabricKB = `\n\nFABRIC KNOWLEDGE BASE (your reference docs — use when relevant):\n${fabricDocs.map(d => `### ${d.title}\n${d.content}`).join("\n\n")}`;
      }
    } catch (e) {
      console.error("[BTC] Fabric KB fetch failed:", e.message);
    }

    // Build dynamic context block (same shape as before)
    const contextParts = [];
    // Music is always available via YouTube. Spotify/Sonos are optional upgrades.
    const providers = connectedProviders || (spotifyConnected ? ["spotify"] : []);
    if (providers.includes("spotify")) {
      contextParts.push("MUSIC SOURCE: Spotify connected — full catalog available with rich playback.");
    } else {
      contextParts.push("MUSIC SOURCE: YouTube (always available). Suggest connecting Spotify for richer playback if it comes up naturally — don't push it.");
    }
    if (sonosGroups?.length) {
      contextParts.push(`SONOS: Connected. Available rooms: ${sonosGroups.map(g => g.name).join(", ")}. When the user asks to play in a specific room, respond with the room name and the action — the app handles the routing. Example: "Playing in Living Room." or "Volume set to 60 in Kitchen."`);
    }
    if (currentTrack) {
      contextParts.push(`Now playing: "${currentTrack.title}" by ${currentTrack.artist} (${currentTrack.album || "unknown album"}) — the user is already listening to this. NEVER include the currently playing track in your suggestions.`);
    }
    if (audioFeatures) {
      const parts = [];
      if (audioFeatures.bpm) parts.push(`${audioFeatures.bpm} BPM`);
      if (audioFeatures.key) parts.push(`key of ${audioFeatures.key}`);
      if (audioFeatures.energy != null) parts.push(`energy ${audioFeatures.energy}/100`);
      if (audioFeatures.valence != null) parts.push(`valence ${audioFeatures.valence}/100`);
      if (parts.length) contextParts.push(`Audio: ${parts.join(", ")}`);
    }
    // Build "do NOT re-recommend" list from all sources
    const doNotRecommend = new Set();
    if (setTracks?.length) {
      const setList = setTracks.slice(0, 10).map(t => `${t.artist} - ${t.title}`).join(", ");
      contextParts.push(`User's active set (${setTracks.length} tracks): ${setList}${setTracks.length > 10 ? "..." : ""}`);
      setTracks.forEach(t => doNotRecommend.add(`${t.artist} - ${t.title}`));
    }
    if (bsidesTracks?.length) {
      bsidesTracks.forEach(t => doNotRecommend.add(`${t.artist} - ${t.title}`));
    }
    if (tasteSummary?.setContents?.length) {
      tasteSummary.setContents.forEach(s => s.tracks?.forEach(t => doNotRecommend.add(t)));
    }
    if (doNotRecommend.size > 0) {
      contextParts.push(`ALREADY IN LIBRARY — do NOT re-recommend these (${doNotRecommend.size} tracks): ${[...doNotRecommend].slice(0, 40).join(", ")}${doNotRecommend.size > 40 ? "..." : ""}`);
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
      if (tasteSummary.thumbedDown?.length) {
        tp.push(`Permanently rejected (NEVER suggest): ${tasteSummary.thumbedDown.join(", ")}`);
      }
      if (tasteSummary.featureProfile) {
        const fp = tasteSummary.featureProfile;
        const parts = [];
        if (fp.bpmRange) parts.push(`BPM range: ${fp.bpmRange[0]}–${fp.bpmRange[1]}`);
        if (fp.avgEnergy != null) parts.push(`avg energy: ${fp.avgEnergy}/100`);
        if (fp.avgValence != null) parts.push(`avg valence: ${fp.avgValence}/100`);
        if (fp.topKeys?.length) parts.push(`top keys: ${fp.topKeys.join(", ")}`);
        if (parts.length) tp.push(`Audio preferences: ${parts.join(", ")}`);
      }
      if (tasteSummary.recentlyPlayed?.length) {
        tp.push(`Recently played: ${tasteSummary.recentlyPlayed.join(", ")}`);
      }
      if (tp.length) contextParts.push(`TASTE PROFILE:\n${tp.join("\n")}`);
    }

    const dynamicContext = [
      contextParts.length ? `\nCURRENT CONTEXT (use this to inform your responses):\n${contextParts.join("\n")}` : "",
      fabricKB,
    ].filter(Boolean).join("");

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
