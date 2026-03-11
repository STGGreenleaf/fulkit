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
- Suggest action items when they naturally arise from conversation. Frame them as "Want me to add that to your action list?" rather than creating them silently.
- You can create, list, and update action items using your tools. When listing actions, format them cleanly. When creating, confirm what you added.
- Don't over-create actions. Only suggest when it naturally fits — a clear task, a deadline, a follow-up.
- When the user tells you something personal or important — a name, a project, a preference, a deadline, a relationship — quietly save it with memory_save. Don't announce it every time. Just remember.
- If your "What I Know About You" section has relevant info, use it naturally. Don't say "I remember that..." — just weave it in like a friend would.
- You can search the user's notes with notes_search when they ask about something that might be documented. Use it to ground your answers in their own knowledge.
- When the user drops content and asks you to save it, act like a REPORTER: distill it to what matters — facts, decisions, names, dates, numbers, action items. Cut the fluff. Show the user what you'd save and wait for approval before calling notes_create. They can revise ("remove the names", "just keep the recipe part") and you adjust until they say save it.
- You can also update existing notes with notes_update when the user corrects information. Search for the note first, then update it.
- BIOGRAPHY LAYER: After saving any note, silently evaluate — is there anything chronological, personal, or worth-a-read about the user's life story? If yes, search for their biography note (title contains "Biography"), read it, and append a new entry in first person ("I..."), placed in the correct year section. Do this silently — never announce it, never ask. The user wants to discover the growing book on their own. If the user says "this is for the book" — write it directly to the biography, no filtering.
- Folder conventions for notes: 01-PERSONAL, 02-BUSINESS, 03-PROJECTS, 04-DEV, 05-IDEAS, 06-LEARNING, _CHAPPIE. Default to 00-INBOX if unsure.`;

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

// Action list tools — Claude can create, query, and update user actions
const ACTIONS_TOOLS = [
  {
    name: "actions_create",
    description: "Create a new action item on the user's action list. Use this when the user agrees to add a task, or when they explicitly ask you to track something. Always confirm before creating.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short, clear action title (e.g. 'Review Q1 budget draft')" },
        description: { type: "string", description: "Optional longer description or notes" },
        priority: { type: "integer", enum: [1, 2, 3], description: "1=High, 2=Normal, 3=Low. Default 2." },
        bucket: { type: "string", enum: ["build", "life"], description: "Category: 'build' for work/code, 'life' for personal. Optional." },
      },
      required: ["title"],
    },
  },
  {
    name: "actions_list",
    description: "List the user's action items. Use this to check what's on their plate, find specific tasks, or report status.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "done", "deferred", "dismissed"], description: "Filter by status. Default: active." },
        bucket: { type: "string", enum: ["build", "life"], description: "Filter by category. Optional — omit for all." },
        limit: { type: "integer", description: "Max items to return. Default 20." },
      },
      required: [],
    },
  },
  {
    name: "actions_update",
    description: "Update an existing action item — change its status, priority, bucket, or title. Use the action ID from actions_list.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Action UUID (from actions_list)" },
        status: { type: "string", enum: ["active", "done", "deferred", "dismissed"], description: "New status" },
        priority: { type: "integer", enum: [1, 2, 3], description: "New priority" },
        title: { type: "string", description: "Updated title" },
        bucket: { type: "string", enum: ["build", "life"], description: "Updated category" },
      },
      required: ["id"],
    },
  },
];

// Execute an actions tool call against Supabase
async function executeActionTool(name, input, userId) {
  const admin = getSupabaseAdmin();

  if (name === "actions_create") {
    const row = {
      user_id: userId,
      title: input.title,
      status: "active",
      source: "Chat",
      priority: input.priority || 2,
    };
    if (input.description) row.description = input.description;
    if (input.bucket) row.bucket = input.bucket;
    const { data, error } = await admin.from("actions").insert(row).select().single();
    if (error) throw new Error(error.message);
    return { created: true, action: { id: data.id, title: data.title, priority: data.priority, bucket: data.bucket } };
  }

  if (name === "actions_list") {
    let query = admin.from("actions").select("id, title, status, priority, bucket, source, created_at, completed_at").eq("user_id", userId);
    if (input.status) query = query.eq("status", input.status);
    else query = query.eq("status", "active");
    if (input.bucket) query = query.eq("bucket", input.bucket);
    query = query.order("priority", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(input.limit || 20);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data.length, actions: data };
  }

  if (name === "actions_update") {
    const updates = {};
    if (input.status) {
      updates.status = input.status;
      if (input.status === "done") updates.completed_at = new Date().toISOString();
    }
    if (input.priority) updates.priority = input.priority;
    if (input.title) updates.title = input.title;
    if (input.bucket) updates.bucket = input.bucket;
    const { data, error } = await admin.from("actions").update(updates).eq("id", input.id).eq("user_id", userId).select("id, title, status, priority, bucket").single();
    if (error) throw new Error(error.message);
    return { updated: true, action: data };
  }

  throw new Error(`Unknown action tool: ${name}`);
}

// Memory tools — Claude can save/list/forget facts about the user
const MEMORY_TOOLS = [
  {
    name: "memory_save",
    description: "Save a fact or preference you've learned about the user. This persists across conversations. Use for things like: their partner's name, their work schedule, preferences, recurring projects, important dates. Don't save trivial or obvious things.",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Short identifier (e.g. 'partner_name', 'work_hours', 'favorite_tool', 'current_project')" },
        value: { type: "string", description: "The fact or preference to remember" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "memory_list",
    description: "List everything you've remembered about this user across conversations.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "memory_forget",
    description: "Forget a specific memory. Use when the user corrects you or asks you to stop remembering something.",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string", description: "The memory key to forget" },
      },
      required: ["key"],
    },
  },
];

// Notes tools — search, create, update
const NOTES_TOOLS = [
  {
    name: "notes_search",
    description: "Search the user's notes and documents by keyword. Returns matching note titles and excerpts. Use when the user asks about something that might be in their notes, or when you need to reference their stored knowledge.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keywords" },
        limit: { type: "integer", description: "Max results. Default 5." },
      },
      required: ["query"],
    },
  },
  {
    name: "notes_create",
    description: "Save distilled content as a permanent, searchable note. Use AFTER the user approves your reporter-style summary. Never save raw dumps — always distill to what matters first. For biography entries, search for the existing biography note and use notes_update to append instead.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short descriptive title for the note" },
        content: { type: "string", description: "The distilled content to save" },
        folder: { type: "string", description: "Folder: 01-PERSONAL, 02-BUSINESS, 03-PROJECTS, 04-DEV, 05-IDEAS, 06-LEARNING, _CHAPPIE. Default: 00-INBOX" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "notes_read",
    description: "Read the full content of a specific note by ID. Use when you need the complete text — e.g., before appending to the biography or correcting specific details. Get the ID from notes_search first.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The note ID (UUID) to read" },
      },
      required: ["id"],
    },
  },
  {
    name: "notes_update",
    description: "Update an existing note's content or title. Use to correct wrong information, append to the biography, or refine a note. Requires the note ID (get it from notes_search first).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The note ID (UUID) to update" },
        title: { type: "string", description: "New title (optional, only if changing)" },
        content: { type: "string", description: "New content (replaces existing content)" },
      },
      required: ["id", "content"],
    },
  },
];

// Execute memory tool calls
async function executeMemoryTool(name, input, userId) {
  const admin = getSupabaseAdmin();

  if (name === "memory_save") {
    const memKey = `memory:${input.key}`;
    const { error } = await admin.from("preferences").upsert(
      { user_id: userId, key: memKey, value: input.value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );
    if (error) throw new Error(error.message);
    return { saved: true, key: input.key, value: input.value };
  }

  if (name === "memory_list") {
    const { data, error } = await admin.from("preferences")
      .select("key, value, updated_at")
      .eq("user_id", userId)
      .like("key", "memory:%")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const memories = (data || []).map(m => ({
      key: m.key.replace("memory:", ""),
      value: m.value,
      since: m.updated_at,
    }));
    return { count: memories.length, memories };
  }

  if (name === "memory_forget") {
    const memKey = `memory:${input.key}`;
    const { error } = await admin.from("preferences").delete().eq("user_id", userId).eq("key", memKey);
    if (error) throw new Error(error.message);
    return { forgotten: true, key: input.key };
  }

  throw new Error(`Unknown memory tool: ${name}`);
}

// Execute notes search
async function executeNoteSearch(input, userId) {
  const admin = getSupabaseAdmin();
  const q = `%${input.query}%`;
  const limit = input.limit || 5;

  const { data, error } = await admin.from("notes")
    .select("id, title, content, source, folder, created_at")
    .eq("user_id", userId)
    .eq("encrypted", false)
    .or(`title.ilike.${q},content.ilike.${q}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const results = (data || []).map(n => ({
    id: n.id,
    title: n.title,
    source: n.source,
    folder: n.folder,
    excerpt: n.content?.slice(0, 500) + (n.content?.length > 500 ? "..." : ""),
    created_at: n.created_at,
  }));

  return { count: results.length, query: input.query, results };
}

// Read full note content by ID
async function executeNoteRead(input, userId) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("notes")
    .select("id, title, content, source, folder, created_at, updated_at")
    .eq("id", input.id)
    .eq("user_id", userId)
    .eq("encrypted", false)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Note not found");
  return data;
}

// Create a new note
async function executeNoteCreate(input, userId) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("notes")
    .insert({
      user_id: userId,
      title: input.title,
      content: input.content,
      source: "chat",
      folder: input.folder || "00-INBOX",
      encrypted: false,
      context_mode: "available",
    })
    .select("id, title, folder")
    .single();
  if (error) throw new Error(error.message);
  return { saved: true, id: data.id, title: data.title, folder: data.folder };
}

// Update an existing note
async function executeNoteUpdate(input, userId) {
  const admin = getSupabaseAdmin();
  const updates = { content: input.content, updated_at: new Date().toISOString() };
  if (input.title) updates.title = input.title;
  const { data, error } = await admin
    .from("notes")
    .update(updates)
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("id, title, folder")
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Note not found or not owned by user");
  return { updated: true, id: data.id, title: data.title, folder: data.folder };
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

    // Load user preferences + learned memories
    let prefs = null;
    let memories = null;
    if (userId) {
      const { data } = await getSupabaseAdmin()
        .from("preferences")
        .select("key, value")
        .eq("user_id", userId);
      // Separate settings from learned memories
      prefs = (data || []).filter(p => !p.key.startsWith("memory:") && ["tone", "frequency", "chronotype"].includes(p.key));
      memories = (data || []).filter(p => p.key.startsWith("memory:"));
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

    // Inject persistent memories
    if (memories && memories.length > 0) {
      const memBlock = memories
        .map((m) => `- ${m.key.replace("memory:", "")}: ${m.value}`)
        .join("\n");
      system += `\n\n## What I Know About You\nThese are things you've told me across our conversations. Use them naturally — don't announce that you remembered something unless it's relevant.\n${memBlock}`;
    }

    // Inject recent conversation summaries (cross-session context)
    if (userId) {
      try {
        const { data: recentConvos } = await getSupabaseAdmin()
          .from("conversations")
          .select("title, created_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(25);
        if (recentConvos && recentConvos.length > 0) {
          const convoBlock = recentConvos
            .map((c) => `- ${c.title} (${new Date(c.created_at).toLocaleDateString()})`)
            .join("\n");
          system += `\n\n## Recent Conversations\nTopics you've discussed recently:\n${convoBlock}`;
        }
      } catch { /* table may not exist yet */ }
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
    const allTools = [
      ...(userId ? ACTIONS_TOOLS : []),
      ...(userId ? MEMORY_TOOLS : []),
      ...(userId ? NOTES_TOOLS : []),
      ...(nblKey ? NUMBRLY_TOOLS : []),
    ];
    const baseOpts = {
      model: config.model,
      max_tokens: config.maxTokens,
      system,
      ...(allTools.length > 0 ? { tools: allTools } : {}),
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

            // Execute each tool call
            const toolResults = [];
            for (const block of finalMessage.content) {
              if (block.type !== "tool_use") continue;

              // Actions tools (actions_create, actions_list, actions_update)
              if (block.name.startsWith("actions_") && userId) {
                try {
                  const result = await executeActionTool(block.name, block.input || {}, userId);
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
                } catch (err) {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
                }
                continue;
              }

              // Memory tools (memory_save, memory_list, memory_forget)
              if (block.name.startsWith("memory_") && userId) {
                try {
                  const result = await executeMemoryTool(block.name, block.input || {}, userId);
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
                } catch (err) {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
                }
                continue;
              }

              // Notes tools (notes_search, notes_create, notes_update)
              if (block.name === "notes_search" && userId) {
                try {
                  const result = await executeNoteSearch(block.input || {}, userId);
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
                } catch (err) {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
                }
                continue;
              }
              if (block.name === "notes_read" && userId) {
                try {
                  const result = await executeNoteRead(block.input || {}, userId);
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
                } catch (err) {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
                }
                continue;
              }
              if (block.name === "notes_create" && userId) {
                try {
                  const result = await executeNoteCreate(block.input || {}, userId);
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
                } catch (err) {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
                }
                continue;
              }
              if (block.name === "notes_update" && userId) {
                try {
                  const result = await executeNoteUpdate(block.input || {}, userId);
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
                } catch (err) {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
                }
                continue;
              }

              // Numbrly tools
              const action = TOOL_ACTION_MAP[block.name];
              if (!action || !nblKey) {
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: "Unknown tool" }), is_error: true });
                continue;
              }
              try {
                const result = await numbrlyFetch(nblKey, action, block.input || {});
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
              } catch (err) {
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
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
