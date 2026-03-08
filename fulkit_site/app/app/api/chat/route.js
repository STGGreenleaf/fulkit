import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { getGitHubToken, githubFetch } from "../../../lib/github";
import { getNumbrlyToken, numbrlyFetch } from "../../../lib/numbrly";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getModelConfig(role, seatType) {
  if (role === "owner") {
    return { model: "claude-opus-4-6", maxTokens: 128000, compressAt: 180000 };
  }
  if (seatType === "pro") {
    return { model: "claude-sonnet-4-6", maxTokens: 4096, compressAt: 80000 };
  }
  return { model: "claude-sonnet-4-6", maxTokens: 2048, compressAt: 80000 };
}

const BASE_PROMPT = `You are Fülkit — a thinking partner, not an assistant. You're warm, direct, and useful. You have bestie energy — you care, you push back when needed, and you remember what matters.

Guidelines:
- Be concise. Don't over-explain unless asked.
- Match the user's energy — short question, short answer. Deep question, deep answer.
- You can be funny, but never forced. Never use emojis unless the user does first.
- If the user shares something personal, acknowledge it genuinely before moving on.
- When you don't know something, say so directly.
- Suggest action items when they naturally arise from conversation. Frame them as "Want me to add that to your action list?" rather than creating them silently.`;

// Estimate tokens for conversation compression
function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

// Compress old messages when conversation gets too long
// Keeps recent messages verbatim, summarizes older ones
function compressConversation(messages, maxTokens = 80000) {
  let total = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  if (total <= maxTokens) return messages;

  // Keep the most recent messages verbatim
  const keep = [];
  let keepTokens = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (keepTokens + msgTokens > maxTokens * 0.6) break;
    keep.unshift(messages[i]);
    keepTokens += msgTokens;
  }

  // Summarize older messages into a compressed block
  const older = messages.slice(0, messages.length - keep.length);
  if (older.length === 0) return keep;

  const summary = older
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}${m.content.length > 200 ? "..." : ""}`)
    .join("\n");

  return [
    {
      role: "user",
      content: `[Earlier in this conversation, we discussed:\n${summary}\n\nContinuing from there:]`,
    },
    ...keep,
  ];
}

export async function POST(request) {
  try {
    // Authenticate user via Supabase
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

    // Dev mode bypass — no auth header means local dev
    const isDev = !authHeader && process.env.NODE_ENV === "development";
    if (!userId && !isDev) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch profile for tier-based model selection
    let profile = null;
    if (userId) {
      const { data } = await getSupabaseAdmin()
        .from("profiles")
        .select("role, seat_type")
        .eq("id", userId)
        .single();
      profile = data;
    }
    const config = getModelConfig(profile?.role, profile?.seat_type);

    const { messages, context = [] } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages required" }, { status: 400 });
    }

    // Compress conversation if it's getting long
    const compressed = compressConversation(messages, config.compressAt);

    // Load user preferences for personality tuning
    let prefs = null;
    if (userId) {
      const { data } = await getSupabaseAdmin()
        .from("preferences")
        .select("key, value")
        .eq("user_id", userId)
        .in("key", ["tone", "frequency", "chronotype"]);
      prefs = data;
    }

    // Enrich GitHub tree context with actual file contents
    if (userId && Array.isArray(context)) {
      const ghToken = await getGitHubToken(userId);
      if (ghToken) {
        const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
        const words = lastMessage.split(/\W+/).filter((w) => w.length > 2);

        for (let i = 0; i < context.length; i++) {
          if (!context[i].title?.startsWith("GitHub: ")) continue;
          const repoName = context[i].title.replace("GitHub: ", "");
          const filePaths = context[i].content
            .split("\n")
            .filter((l) => l && !l.startsWith("Full repository"));

          // Score each file path against the user's message
          const CODE_EXTS = /\.(js|jsx|ts|tsx|py|rb|go|rs|java|css|html|json|sql|sh|yaml|yml|toml|md|txt|env|mjs|cjs)$/i;
          const scored = filePaths
            .filter((p) => CODE_EXTS.test(p))
            .map((p) => {
              const parts = p.toLowerCase().split(/[/.]/);
              let score = 0;
              for (const w of words) {
                if (parts.some((part) => part.includes(w))) score += 2;
                if (p.toLowerCase().includes(w)) score += 1;
              }
              const name = p.split("/").pop().toLowerCase();
              if (name === "readme.md" || name === "package.json") score += 1;
              return { path: p, score };
            })
            .filter((f) => f.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          // Fetch files in parallel with a timeout
          if (scored.length > 0) {
            const MAX_CODE_TOKENS = 30000;
            const fetchWithTimeout = (path) =>
              Promise.race([
                githubFetch(ghToken, `/repos/${repoName}/contents/${path}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
              ]);

            const results = await Promise.allSettled(scored.map((f) => fetchWithTimeout(f.path)));
            const fetched = [];
            let fetchedTokens = 0;
            for (const result of results) {
              if (result.status !== "fulfilled") continue;
              const data = result.value;
              if (!data.content || data.size > 100000) continue;
              const content = Buffer.from(data.content, "base64").toString("utf-8");
              const tokens = estimateTokens(content);
              if (fetchedTokens + tokens > MAX_CODE_TOKENS) continue;
              fetched.push({ path: data.path, content });
              fetchedTokens += tokens;
            }

            if (fetched.length > 0) {
              const codeBlock = fetched
                .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
                .join("\n\n");
              context[i] = {
                title: context[i].title,
                content: context[i].content + `\n\n## Relevant source files\n${codeBlock}`,
              };
            }
          }
        }
      }
    }

    // Inject Numbrly business context if connected
    if (userId) {
      try {
        const nblKey = await getNumbrlyToken(userId);
        if (nblKey) {
          const nblData = await numbrlyFetch(nblKey, "fulkit_context");
          if (nblData?.message) {
            context.push({ title: "Numbrly (Business Data)", content: nblData.message });
          }
        }
      } catch {}
    }

    // Build system prompt
    let system = BASE_PROMPT;

    // Inject preferences
    if (prefs && prefs.length > 0) {
      const prefBlock = prefs
        .map((p) => `- ${p.key}: ${p.value}`)
        .join("\n");
      system += `\n\n## User Preferences\n${prefBlock}`;
    }

    // Inject vault context
    if (Array.isArray(context) && context.length > 0) {
      const contextBlock = context
        .map((c) => `### ${c.title}\n${c.content}`)
        .join("\n\n---\n\n");
      system += `\n\n## User's Notes & Context\nThe following are notes and documents from the user's vault. Use them to inform your responses naturally. Reference this knowledge when relevant but don't announce that you have access to notes unless the user asks.\n\n${contextBlock}`;
    }

    const streamOpts = {
      model: config.model,
      max_tokens: config.maxTokens,
      system: system,
      messages: compressed.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
    const stream = anthropic.messages.stream(streamOpts);

    // Increment message count (Fül cap)
    if (userId) {
      getSupabaseAdmin()
        .from("profiles")
        .select("messages_this_month")
        .eq("id", userId)
        .single()
        .then(({ data }) => {
          if (data) {
            getSupabaseAdmin()
              .from("profiles")
              .update({ messages_this_month: (data.messages_this_month || 0) + 1 })
              .eq("id", userId)
              .then(() => {});
          }
        });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
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
    console.error("[api/chat] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
