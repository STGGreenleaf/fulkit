export const maxDuration = 60; // seconds — PDF parsing + Claude analysis

import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { getQueryEmbedding } from "../embed/route";
import { VAULT_FOLDERS } from "../../../lib/vault-writeback";

const defaultAnthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB combined
const TRIAGE_MODEL = "claude-sonnet-4-6-20250514";

// Build the folder list for Claude's system prompt
const FOLDER_GUIDE = VAULT_FOLDERS.map((f) => `- ${f.id} — ${f.description}`).join("\n");

const TRIAGE_SYSTEM = `You are Fulkit's document triage system. You read documents and produce structured analysis.

Given a document, return a JSON object with these exact fields:
{
  "summary": "2-3 sentence summary of the document's content and purpose",
  "documentType": "one of: meeting notes, invoice, contract, article, code, personal, research, recipe, checklist, other",
  "suggestedFolder": "the folder ID from the list below",
  "suggestedTitle": "a clean, descriptive title for filing (max 100 chars)",
  "actionItems": [{ "text": "action item text", "dueDate": "YYYY-MM-DD or null" }],
  "keyFacts": ["fact 1", "fact 2"],
  "searchQuery": "3-5 keywords for finding related notes in the user's vault"
}

Vault folders:
${FOLDER_GUIDE}

Rules:
- Pick the BEST folder based on content, not just keywords. "Learning React" = 04-DEV, not 06-LEARNING.
- Only use 00-INBOX if truly uncategorizable.
- Action items: only include real actionable tasks, not vague observations.
- keyFacts: max 5, only genuinely useful data points (dates, numbers, names, decisions).
- searchQuery: pick terms that would match related existing notes, not just document keywords.
- Return ONLY valid JSON. No markdown fences, no explanation.`;

// ─── Extract text from a file ──────────────────────────────────────

async function extractContent(file) {
  if (file.type === "text") {
    return { text: file.content, method: "text" };
  }

  if (file.type === "pdf") {
    try {
      const buffer = Buffer.from(file.data, "base64");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      await parser.load();
      const text = (await parser.getText() || "").trim();
      let info = {};
      try { info = await parser.getInfo(); } catch { /* optional */ }
      const numpages = info.numPages || 1;
      // If very little text relative to pages, it's likely a scanned PDF
      const charsPerPage = text.length / numpages;
      if (charsPerPage < 100 && numpages > 0 && text.length < 200) {
        // Scanned PDF — fall back to vision (return as image)
        return { scanned: true, data: file.data, pages: numpages, method: "vision-fallback" };
      }
      return { text, pages: numpages, method: "pdf-parse" };
    } catch {
      return { error: "PDF parsing failed" };
    }
  }

  if (file.type === "image") {
    // Images go straight to Claude vision
    return { image: true, data: file.data, media_type: file.media_type, method: "vision" };
  }

  return { error: "Unsupported file type" };
}

// ─── Build Claude message content for a file ───────────────────────

function buildContentBlocks(extracted, fileName) {
  if (extracted.error) return null;

  if (extracted.text) {
    const truncated = extracted.text.slice(0, 100000); // ~25K tokens cap
    return [{ type: "text", text: `Document: ${fileName}\n\n${truncated}` }];
  }

  if (extracted.image || extracted.scanned) {
    return [
      { type: "image", source: { type: "base64", media_type: extracted.media_type || "application/pdf", data: extracted.data } },
      { type: "text", text: `Document: ${fileName}\nAnalyze this image/scanned document.` },
    ];
  }

  return null;
}

// ─── Find related notes via semantic search ────────────────────────

async function findConnections(searchQuery, userId) {
  try {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey || !searchQuery) return [];

    const embedding = await getQueryEmbedding(searchQuery);
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("match_notes", {
      query_embedding: JSON.stringify(embedding),
      match_user_id: userId,
      match_threshold: 0.5, // slightly lower for broader discovery
      match_count: 5,
    });
    if (error) return [];

    return (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      folder: n.folder,
      snippet: (n.content || "").slice(0, 200),
      similarity: Math.round(n.similarity * 100) / 100,
    }));
  } catch {
    return [];
  }
}

// ─── POST /api/triage ──────────────────────────────────────────────

export async function POST(request) {
  const encoder = new TextEncoder();

  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const files = body.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return Response.json({ error: `Max ${MAX_FILES} files per triage` }, { status: 400 });
    }

    // Stream response
    const stream = new ReadableStream({
      async start(controller) {
        function send(data) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch { /* client disconnected */ }
        }

        try {
          // Process all files in parallel
          const triageResults = await Promise.allSettled(
            files.map(async (file, idx) => {
              send({ phase: "parsing", fileName: file.name, fileIndex: idx, totalFiles: files.length });

              // Extract content
              const extracted = await extractContent(file);
              if (extracted.error) {
                return { fileIndex: idx, fileName: file.name, error: extracted.error };
              }

              // Build content blocks for Claude
              const contentBlocks = buildContentBlocks(extracted, file.name);
              if (!contentBlocks) {
                return { fileIndex: idx, fileName: file.name, error: "Could not read file content" };
              }

              send({ phase: "analyzing", fileName: file.name, fileIndex: idx });

              // Call Claude for triage analysis
              let triage;
              try {
                const response = await defaultAnthropic.messages.create({
                  model: TRIAGE_MODEL,
                  max_tokens: 1500,
                  system: TRIAGE_SYSTEM,
                  messages: [{ role: "user", content: contentBlocks }],
                });

                const text = response.content
                  .filter((b) => b.type === "text")
                  .map((b) => b.text)
                  .join("");

                triage = JSON.parse(text);
              } catch (err) {
                return { fileIndex: idx, fileName: file.name, error: "Analysis failed" };
              }

              // Find related notes
              const connections = await findConnections(triage.searchQuery, user.id);

              // Include the raw content for "Discuss it" action
              const rawContent = extracted.text || null;

              return {
                fileIndex: idx,
                fileName: file.name,
                triage,
                connections,
                rawContent,
                fileType: file.type,
                fileData: file.type === "image" ? file.data : undefined,
                fileMediaType: file.media_type,
              };
            })
          );

          // Stream results
          for (const result of triageResults) {
            if (result.status === "fulfilled") {
              const val = result.value;
              if (val.error) {
                send({ error: val.error, fileName: val.fileName, fileIndex: val.fileIndex });
              } else {
                send({ triage: val.triage, fileName: val.fileName, fileIndex: val.fileIndex, connections: val.connections, rawContent: val.rawContent, fileType: val.fileType, fileData: val.fileData, fileMediaType: val.fileMediaType });
              }
            } else {
              send({ error: "Processing failed", fileIndex: -1 });
            }
          }

          // Track spend (fire-and-forget)
          admin.from("profiles")
            .select("messages_this_month")
            .eq("id", user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile) {
                admin.from("profiles")
                  .update({ messages_this_month: (profile.messages_this_month || 0) + 1 })
                  .eq("id", user.id)
                  .then(() => {}).catch(() => {});
              }
            }).catch(() => {});

          send("[DONE]");
        } catch (err) {
          send({ error: err.message || "Triage failed" });
          send("[DONE]");
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[triage] Error:", err.message);
    return Response.json({ error: "Triage failed" }, { status: 500 });
  }
}
