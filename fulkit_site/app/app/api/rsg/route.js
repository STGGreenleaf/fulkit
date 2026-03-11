import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RSG_SYSTEM_PROMPT = `You are the guy behind the counter at the best record store in the world. You know music — all of it. Deep cuts, connections between artists, studio trivia, the stories behind the songs. You're warm but concise. Think clerk energy: helpful, opinionated, never preachy.

Guidelines:
- Keep responses SHORT. 2-4 sentences max, plus recommendations if relevant.
- When recommending tracks, format each one on its own line like this:
  [REC: Artist — Title (BPM)]
  Only use this format when you're suggesting specific tracks. BPM is optional — include it if you know it, skip it if you don't.
- After listing recs, add one short sentence explaining the connection (the "why").
- Match the user's energy. Casual question, casual answer. Deep dive request, go deeper.
- You can be opinionated. "That's a great pick" or "Honestly? Skip the remix" is fine.
- Don't use emojis. Don't be overly enthusiastic. Just be knowledgeable and real.
- If you don't know something, say so. Don't make up BPMs or facts.
- When talking about music history or studio details, keep it to what's interesting, not encyclopedic.`;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
        if (!error && user) userId = user.id;
      } catch {
        // Token validation failed
      }
    }

    const isDev = !authHeader && process.env.NODE_ENV === "development";
    if (!userId && !isDev) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages required" }, { status: 400 });
    }

    // Compress if conversation gets long (RSG convos should stay short)
    const MAX_MESSAGES = 40;
    let trimmed = messages;
    if (messages.length > MAX_MESSAGES) {
      const older = messages.slice(0, messages.length - 20);
      const recent = messages.slice(messages.length - 20);
      const summary = older
        .map((m) => `${m.role}: ${m.content.slice(0, 150)}${m.content.length > 150 ? "..." : ""}`)
        .join("\n");
      trimmed = [
        { role: "user", content: `[Earlier we discussed:\n${summary}\n\nContinuing:]` },
        ...recent,
      ];
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            system: RSG_SYSTEM_PROMPT,
            messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
          });

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
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
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
