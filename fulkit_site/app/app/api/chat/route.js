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

// Numbrly tool schemas — Claude can call these mid-conversation
const NUMBRLY_TOOLS = [
  {
    name: "numbrly_summary",
    description: "High-level business overview: build count, vendor count, margin stats, top vendors by spend, recent activity, alerts.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "numbrly_get_build",
    description: "Get a specific build/product with full recipe, cost breakdown, margin, and pricing.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Build name (e.g. 'Green Machine')" },
        id: { type: "string", description: "Build ID. Use name OR id, not both." },
      },
      required: [],
    },
  },
  {
    name: "numbrly_get_component",
    description: "Get a component/ingredient with current cost, vendor, and which builds use it.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Component name (e.g. 'Banana')" },
        id: { type: "string", description: "Component ID. Use name OR id." },
      },
      required: [],
    },
  },
  {
    name: "numbrly_get_vendor",
    description: "Get a vendor with all their components and pricing.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Vendor name (e.g. 'Sysco')" },
        id: { type: "string", description: "Vendor ID. Use name OR id." },
      },
      required: [],
    },
  },
  {
    name: "numbrly_search",
    description: "Fuzzy search across all builds, components, vendors, and composites.",
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
      },
      required: ["q"],
    },
  },
  {
    name: "numbrly_simulate_price",
    description: "What-if: simulate changing a build's sale price. Returns new margin.",
    input_schema: {
      type: "object",
      properties: {
        build: { type: "string", description: "Build name or ID" },
        price: { type: "number", description: "Hypothetical new price" },
      },
      required: ["build", "price"],
    },
  },
  {
    name: "numbrly_simulate_cost",
    description: "What-if: simulate a component cost change. Returns affected builds and new margins.",
    input_schema: {
      type: "object",
      properties: {
        component: { type: "string", description: "Component name or ID" },
        cost: { type: "number", description: "Hypothetical new cost per unit" },
      },
      required: ["component", "cost"],
    },
  },
  {
    name: "numbrly_target_margin",
    description: "Calculate what price a build needs to hit a target margin percentage.",
    input_schema: {
      type: "object",
      properties: {
        build: { type: "string", description: "Build name or ID" },
        margin: { type: "number", description: "Target margin percentage (e.g. 70)" },
      },
      required: ["build", "margin"],
    },
  },
  {
    name: "numbrly_list_builds",
    description: "List all builds/products with names, prices, and margins.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "numbrly_list_alerts",
    description: "Get active alerts: low stock, price changes, margin risks.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

const TOOL_ACTION_MAP = {
  numbrly_summary: "summary",
  numbrly_get_build: "get_build",
  numbrly_get_component: "get_component",
  numbrly_get_vendor: "get_vendor",
  numbrly_search: "search",
  numbrly_simulate_price: "simulate_price",
  numbrly_simulate_cost: "simulate_cost",
  numbrly_target_margin: "target_margin",
  numbrly_list_builds: "list_builds",
  numbrly_list_alerts: "list_alerts",
};

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

    // Fetch Numbrly API key (needed for tool execution)
    let nblKey = null;
    if (userId) {
      nblKey = await getNumbrlyToken(userId);
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

    const MAX_TOOL_ROUNDS = 5;
    const baseOpts = {
      model: config.model,
      max_tokens: config.maxTokens,
      system,
      ...(nblKey ? { tools: NUMBRLY_TOOLS } : {}),
    };

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let loopMessages = compressed.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          let needsFinalResponse = false;
          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const stream = anthropic.messages.stream({
              ...baseOpts,
              messages: loopMessages,
            });

            // Stream text deltas to client
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

            const finalMessage = await stream.finalMessage();

            // If Claude didn't request tools, we're done
            if (finalMessage.stop_reason !== "tool_use") break;

            // Execute each tool call via numbrlyFetch
            const toolResults = [];
            for (const block of finalMessage.content) {
              if (block.type !== "tool_use") continue;
              const action = TOOL_ACTION_MAP[block.name];
              if (!action || !nblKey) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify({ error: "Unknown tool" }),
                  is_error: true,
                });
                continue;
              }
              try {
                const result = await numbrlyFetch(nblKey, action, block.input || {});
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
              } catch (err) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify({ error: err.message }),
                  is_error: true,
                });
              }
            }

            // Feed results back for next round
            loopMessages = [
              ...loopMessages,
              { role: "assistant", content: finalMessage.content },
              { role: "user", content: toolResults },
            ];

            // If this was the last allowed round, flag so we send a final response
            if (round === MAX_TOOL_ROUNDS - 1) needsFinalResponse = true;
          }

          // If tool loop exhausted, make one final call without tools so Claude responds
          if (needsFinalResponse) {
            const finalStream = anthropic.messages.stream({
              model: config.model,
              max_tokens: config.maxTokens,
              system,
              messages: loopMessages,
            });
            for await (const event of finalStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                );
              }
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
