import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// POST /api/hum/speak — OpenAI TTS (alloy voice)
export async function POST(request) {
  try {
    // Check API key exists before doing anything
    if (!process.env.OPENAI_API_KEY) {
      console.error("[hum/speak] OPENAI_API_KEY not configured");
      return Response.json({ error: "TTS not configured", detail: "OPENAI_API_KEY missing" }, { status: 503 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized", detail: "No auth header" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized", detail: error?.message || "Invalid token" }, { status: 401 });

    const { text } = await request.json();
    if (!text?.trim()) return Response.json({ error: "No text provided" }, { status: 400 });

    // Strip markdown for cleaner speech
    const clean = text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/- /g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .slice(0, 4096); // OpenAI TTS max input

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "alloy",
        input: clean,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[hum/speak] OpenAI TTS error:", res.status, err);
      return Response.json({ error: "TTS failed", detail: `OpenAI ${res.status}: ${err.slice(0, 200)}` }, { status: 502 });
    }

    // Stream the audio back
    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[hum/speak] Error:", err.message);
    return Response.json({ error: "Internal error", detail: err.message }, { status: 500 });
  }
}
