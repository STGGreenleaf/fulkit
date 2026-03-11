// ============================================================
// BEHIND THE COUNTER — RESPONSE PIPELINE
// ============================================================
// Pass 0 → Pass 1 → Pass 2
// Import this and call runPipeline() from your chat route.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import {
  PASS_0_CLASSIFY,
  PASS_1_PERSONA,
  PASS_2_COUNTER,
  TEMPERATURE_MODIFIERS,
  LEVEL_MODIFIERS,
} from "./prompts.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

// Ask types where Pass 2 can be skipped (fast path)
const SKIP_COUNTER_TYPES = ["non_music"];

// ------------------------------------------------------------
// PASS 0 — Classification
// ------------------------------------------------------------

export async function classifyMessage(userMessage) {
  const start = Date.now();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 100,
      system: PASS_0_CLASSIFY,
      messages: [
        {
          role: "user",
          content: `Classify this message:\n\n"${userMessage}"`,
        },
      ],
    });

    const text = response.content[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const result = {
      ask_type: parsed.ask_type || "recommendation",
      user_level: parsed.user_level || "casual",
    };

    console.log(
      `[BTC] Pass 0: ${result.ask_type}/${result.user_level} (${Date.now() - start}ms)`
    );

    return result;
  } catch (err) {
    console.error("[BTC] Pass 0 failed:", err.message);
    return { ask_type: "recommendation", user_level: "casual" };
  }
}

// ------------------------------------------------------------
// PASS 1 — The Take (non-streamed, for full pipeline path)
// ------------------------------------------------------------

export async function generateTake(
  userMessage,
  classification,
  dynamicContext = "",
  conversationHistory = []
) {
  const start = Date.now();
  const { ask_type, user_level } = classification;

  const tempMod = TEMPERATURE_MODIFIERS[ask_type] || "";
  const levelMod = LEVEL_MODIFIERS[user_level] || "";

  const systemPrompt = [tempMod, levelMod, PASS_1_PERSONA, dynamicContext]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0]?.text || "";

    console.log(
      `[BTC] Pass 1: ${text.length} chars (${Date.now() - start}ms)`
    );

    return text;
  } catch (err) {
    console.error("[BTC] Pass 1 failed:", err.message);
    throw err;
  }
}

// ------------------------------------------------------------
// PASS 1 — Streamed version (for fast-path, skipping Pass 2)
// ------------------------------------------------------------

export async function generateTakeStreamed(
  userMessage,
  classification,
  dynamicContext = "",
  conversationHistory = []
) {
  const { ask_type, user_level } = classification;

  const tempMod = TEMPERATURE_MODIFIERS[ask_type] || "";
  const levelMod = LEVEL_MODIFIERS[user_level] || "";

  const systemPrompt = [tempMod, levelMod, PASS_1_PERSONA, dynamicContext]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  return stream;
}

// ------------------------------------------------------------
// PASS 2 — The Counter (Quality Gate)
// ------------------------------------------------------------

export async function qualityCheck(
  userMessage,
  draftResponse,
  conversationHistory = []
) {
  const start = Date.now();

  const recentResponses = conversationHistory
    .filter((msg) => msg.role === "assistant")
    .slice(-5)
    .map((msg) => msg.content)
    .join("\n---\n");

  const contextBlock = recentResponses
    ? `\nRECENT BTC RESPONSES (check for phrase repetition):\n${recentResponses}\n`
    : "";

  const conversationBlock = conversationHistory.length
    ? `\nFULL CONVERSATION SO FAR:\n${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}\n`
    : "";

  const messages = [
    {
      role: "user",
      content: `USER'S MESSAGE:\n"${userMessage}"\n\nDRAFT BTC RESPONSE:\n${draftResponse}\n${contextBlock}${conversationBlock}\nEvaluate and output the final response.`,
    },
  ];

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: PASS_2_COUNTER,
    messages,
  });

  console.log(`[BTC] Pass 2: streaming (setup ${Date.now() - start}ms)`);

  return stream;
}

// ------------------------------------------------------------
// FULL PIPELINE
// ------------------------------------------------------------
// Main entry point. Returns a stream for SSE.
//
// For greeting/non_music: 2-pass (skip quality gate, stream Pass 1)
// For everything else: 3-pass (full pipeline, stream Pass 2)
// ------------------------------------------------------------

export async function runPipeline(
  userMessage,
  dynamicContext = "",
  conversationHistory = []
) {
  const pipelineStart = Date.now();

  // PASS 0 — Classify
  const classification = await classifyMessage(userMessage);

  // FAST PATH — skip Pass 2 for simple cases
  if (SKIP_COUNTER_TYPES.includes(classification.ask_type)) {
    console.log(
      `[BTC] Fast path: ${classification.ask_type} — skipping Pass 2`
    );
    const stream = await generateTakeStreamed(
      userMessage,
      classification,
      dynamicContext,
      conversationHistory
    );
    return stream;
  }

  // FULL PATH — Pass 1 then Pass 2
  const rawResponse = await generateTake(
    userMessage,
    classification,
    dynamicContext,
    conversationHistory
  );

  const finalStream = await qualityCheck(
    userMessage,
    rawResponse,
    conversationHistory
  );

  console.log(
    `[BTC] Pipeline total setup: ${Date.now() - pipelineStart}ms`
  );

  return finalStream;
}
