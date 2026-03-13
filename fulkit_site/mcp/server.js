import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from the Next.js app
config({ path: resolve(__dirname, "../app/.env.local") });

const OWNER_ID = process.env.FULKIT_OWNER_ID || "83a2efaa-0e90-4c10-b1e1-cc32b2330fe2";
const PROJECT_ROOT = resolve(__dirname, "..");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const server = new McpServer({
  name: "fulkit",
  version: "1.0.0",
});

// ─── Read Tools ───

server.tool(
  "fulkit_actions",
  "List Fulkit action items. Optionally filter by status (active, done, deferred, dismissed).",
  { status: z.string().optional().describe("Filter by status: active, done, deferred, dismissed") },
  async ({ status }) => {
    let query = supabase
      .from("actions")
      .select("id, title, status, priority, bucket, source, created_at, completed_at")
      .eq("user_id", OWNER_ID)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: `No actions found${status ? ` with status "${status}"` : ""}.` }] };
    }

    const lines = data.map((a) => {
      const check = a.status === "done" ? "[x]" : "[ ]";
      const meta = [a.priority && `P${a.priority}`, a.bucket, a.source].filter(Boolean).join(" · ");
      return `- ${check} **${a.title}** (${a.status}) ${meta ? `— ${meta}` : ""} [id: ${a.id}]`;
    });

    return { content: [{ type: "text", text: `## Actions (${data.length})\n\n${lines.join("\n")}` }] };
  }
);

server.tool(
  "fulkit_notes_search",
  "Search Fulkit notes by keyword (matches title and content).",
  { query: z.string().describe("Search keyword") },
  async ({ query }) => {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, folder, source, created_at")
      .eq("user_id", OWNER_ID)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: `No notes found matching "${query}".` }] };
    }

    const lines = data.map((n) => `- **${n.title}** (${n.folder || "no folder"}, ${n.source || "unknown"}) [id: ${n.id}]`);
    return { content: [{ type: "text", text: `## Notes matching "${query}" (${data.length})\n\n${lines.join("\n")}` }] };
  }
);

server.tool(
  "fulkit_notes_read",
  "Read the full content of a Fulkit note by ID.",
  { id: z.string().describe("Note ID (UUID)") },
  async ({ id }) => {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, folder, source, created_at")
      .eq("id", id)
      .eq("user_id", OWNER_ID)
      .single();

    if (error || !data) return { content: [{ type: "text", text: `Note not found (id: ${id}).` }] };

    return {
      content: [{
        type: "text",
        text: `# ${data.title}\n\n**Folder:** ${data.folder || "—"} | **Source:** ${data.source || "—"} | **Created:** ${data.created_at}\n\n---\n\n${data.content}`,
      }],
    };
  }
);

server.tool(
  "fulkit_memories",
  "List all learned memories (preferences with memory: prefix).",
  {},
  async () => {
    const { data, error } = await supabase
      .from("preferences")
      .select("key, value, updated_at")
      .eq("user_id", OWNER_ID)
      .like("key", "memory:%")
      .order("updated_at", { ascending: false });

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No memories found." }] };
    }

    const lines = data.map((m) => {
      const name = m.key.replace("memory:", "");
      return `- **${name}**: ${m.value}`;
    });

    return { content: [{ type: "text", text: `## Memories (${data.length})\n\n${lines.join("\n")}` }] };
  }
);

server.tool(
  "fulkit_conversations",
  "List recent Fulkit conversations (titles + timestamps).",
  { limit: z.number().optional().describe("Number of conversations to return (default 10)") },
  async ({ limit }) => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", OWNER_ID)
      .order("updated_at", { ascending: false })
      .limit(limit || 10);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No conversations found." }] };
    }

    const lines = data.map((c) => `- **${c.title || "(untitled)"}** — updated ${c.updated_at?.split("T")[0]} [id: ${c.id}]`);
    return { content: [{ type: "text", text: `## Recent Conversations (${data.length})\n\n${lines.join("\n")}` }] };
  }
);

// ─── Write Tools ───

server.tool(
  "fulkit_action_create",
  "Create a new action item in Fulkit.",
  {
    title: z.string().describe("Action title"),
    priority: z.number().optional().describe("Priority (1=highest, default 3)"),
    bucket: z.string().optional().describe("Category bucket"),
  },
  async ({ title, priority, bucket }) => {
    const { data, error } = await supabase
      .from("actions")
      .insert({
        user_id: OWNER_ID,
        title,
        status: "active",
        priority: priority || 3,
        bucket: bucket || null,
        source: "Claude Code",
      })
      .select("id, title, status, priority")
      .single();

    if (error) return { content: [{ type: "text", text: `Error creating action: ${error.message}` }] };

    return { content: [{ type: "text", text: `Action created: **${data.title}** (P${data.priority}, ${data.status}) [id: ${data.id}]` }] };
  }
);

server.tool(
  "fulkit_action_update",
  "Update an existing action item (status, priority, title).",
  {
    id: z.string().describe("Action ID (UUID)"),
    status: z.string().optional().describe("New status: active, done, deferred, dismissed"),
    priority: z.number().optional().describe("New priority (1=highest)"),
    title: z.string().optional().describe("New title"),
  },
  async ({ id, status, priority, title }) => {
    const updates = {};
    if (status) {
      updates.status = status;
      if (status === "done") updates.completed_at = new Date().toISOString();
    }
    if (priority) updates.priority = priority;
    if (title) updates.title = title;

    if (Object.keys(updates).length === 0) {
      return { content: [{ type: "text", text: "No updates provided." }] };
    }

    const { data, error } = await supabase
      .from("actions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", OWNER_ID)
      .select("id, title, status, priority")
      .single();

    if (error) return { content: [{ type: "text", text: `Error updating action: ${error.message}` }] };

    return { content: [{ type: "text", text: `Action updated: **${data.title}** (${data.status}, P${data.priority}) [id: ${data.id}]` }] };
  }
);

server.tool(
  "fulkit_note_create",
  "Save a note to Fulkit's vault.",
  {
    title: z.string().describe("Note title"),
    content: z.string().describe("Note content (markdown)"),
    folder: z.string().optional().describe("Folder (e.g., 04-DEV, 03-PROJECTS). Default: 00-INBOX"),
  },
  async ({ title, content, folder }) => {
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: OWNER_ID,
        title,
        content,
        folder: folder || "00-INBOX",
        source: "claude-code",
        encrypted: false,
        context_mode: "available",
      })
      .select("id, title")
      .single();

    if (error) return { content: [{ type: "text", text: `Error creating note: ${error.message}` }] };

    return { content: [{ type: "text", text: `Note saved: **${data.title}** [id: ${data.id}]` }] };
  }
);

// ─── File Tools ───

server.tool(
  "fulkit_devlog",
  "Read the latest devlog entries from md/devlog.md.",
  { lines: z.number().optional().describe("Number of lines to read from top (default 100)") },
  async ({ lines }) => {
    try {
      const content = readFileSync(resolve(PROJECT_ROOT, "md/devlog.md"), "utf-8");
      const allLines = content.split("\n");
      const result = allLines.slice(0, lines || 100).join("\n");
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error reading devlog: ${err.message}` }] };
    }
  }
);

server.tool(
  "fulkit_todo",
  "Read the TODO.md master action list.",
  {},
  async () => {
    try {
      const content = readFileSync(resolve(PROJECT_ROOT, "TODO.md"), "utf-8");
      return { content: [{ type: "text", text: content }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error reading TODO.md: ${err.message}` }] };
    }
  }
);

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
