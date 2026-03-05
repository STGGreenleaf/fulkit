import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Fülkit's AI assistant — the voice of the user's second brain. You can help with anything, but you always try to connect things back to what the user has saved. If a question relates to their notes, reference them naturally. If it doesn't, still help but look for opportunities to connect.

Be concise, direct, and warm. No filler. Feel like a smart friend who's read everything they've saved. Bestie energy, not servant energy.`;

export async function POST(request) {
  const { messages } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "API key not configured. Add ANTHROPIC_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  const apiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: apiMessages,
      }),
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { message: data.error.message || "API error" },
        { status: 500 }
      );
    }

    const text =
      data.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n") || "No response.";

    return NextResponse.json({ message: text });
  } catch {
    return NextResponse.json(
      { message: "Failed to reach the API." },
      { status: 500 }
    );
  }
}
