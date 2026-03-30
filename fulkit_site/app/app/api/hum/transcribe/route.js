import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// POST /api/hum/transcribe — OpenAI Whisper transcription
export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Transcription not configured" }, { status: 503 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const audioFile = formData.get("audio");
    if (!audioFile) return Response.json({ error: "No audio provided" }, { status: 400 });

    // Forward to OpenAI Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "recording.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "en");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[hum/transcribe] Whisper error:", res.status, err);
      return Response.json({ error: "Transcription failed", detail: err.slice(0, 200) }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ text: data.text || "" });
  } catch (err) {
    console.error("[hum/transcribe] Error:", err.message);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
