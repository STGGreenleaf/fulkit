#!/usr/bin/env node

// Import Fulkit source code + specs into notes table for RAG.
// Usage: node scripts/import-codebase.js [--dry-run] [--embed]
//
// Imports:
//   - app/**/*.js (pages, API routes, components, lib modules)
//   - ../md/**/*.md (specs, design docs — excluding archive)
//   - ../CLAUDE.md, ../TODO.md
//
// Each file becomes a note with source="codebase", folder="fulkit-code" or "fulkit-specs".
// Deduplicates by title — re-running updates existing notes.
// Pass --embed to batch-embed all unembedded notes after import.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync, existsSync } from "fs";
import { readdir } from "fs/promises";
import { join, relative, extname } from "path";

const scriptDir = new URL(".", import.meta.url).pathname;
const envFile = readFileSync(join(scriptDir, "../.env.local"), "utf-8");
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq > 0) process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const doEmbed = args.includes("--embed");

// Project roots
const APP_ROOT = join(scriptDir, "..");          // fulkit_site/app
const SITE_ROOT = join(scriptDir, "../..");      // fulkit_site

// Code extensions to include
const CODE_EXTS = new Set([".js", ".mjs", ".ts", ".tsx", ".css"]);

// Directories to skip
const SKIP_DIRS = new Set([".next", "node_modules", ".git", "supabase", "scripts"]);

// Max file size (skip huge generated files)
const MAX_FILE_SIZE = 200_000; // 200KB

async function walkDir(dir, base) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...(await walkDir(fullPath, base)));
    } else if (CODE_EXTS.has(extname(entry.name))) {
      const stat = statSync(fullPath);
      if (stat.size === 0 || stat.size > MAX_FILE_SIZE) continue;
      files.push({ path: fullPath, relPath: relative(base, fullPath), size: stat.size });
    }
  }
  return files;
}

async function collectSpecs() {
  const mdRoot = join(SITE_ROOT, "md");
  const files = [];

  async function walkMd(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "archive") continue; // skip archived docs
        await walkMd(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const stat = statSync(fullPath);
        if (stat.size === 0) continue;
        files.push({ path: fullPath, relPath: `md/${relative(mdRoot, fullPath)}`, size: stat.size });
      }
    }
  }

  await walkMd(mdRoot);

  // Also include root-level project docs
  for (const name of ["CLAUDE.md", "TODO.md"]) {
    const p = join(SITE_ROOT, name);
    if (existsSync(p)) {
      const stat = statSync(p);
      files.push({ path: p, relPath: name, size: stat.size });
    }
  }

  return files;
}

async function getOwnerId() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .single();
  if (error || !data) {
    console.error("Could not find owner profile:", error?.message);
    process.exit(1);
  }
  return data.id;
}

async function run() {
  console.log(`\nMode: ${dryRun ? "DRY RUN" : "LIVE IMPORT"}\n`);

  // Collect files
  const codeFiles = await walkDir(APP_ROOT, APP_ROOT);
  const specFiles = await collectSpecs();

  // Build notes
  const notes = [];

  for (const f of codeFiles) {
    const content = readFileSync(f.path, "utf-8");
    notes.push({
      title: `fulkit/${f.relPath}`,
      content,
      source: "codebase",
      folder: "fulkit-code",
      size: content.length,
    });
  }

  for (const f of specFiles) {
    const content = readFileSync(f.path, "utf-8");
    notes.push({
      title: `fulkit/${f.relPath}`,
      content,
      source: "codebase",
      folder: "fulkit-specs",
      size: content.length,
    });
  }

  // Summary
  console.log(`Code files:  ${codeFiles.length}`);
  console.log(`Spec files:  ${specFiles.length}`);
  console.log(`Total notes: ${notes.length}`);
  console.log(`Total size:  ${(notes.reduce((s, n) => s + n.size, 0) / 1024).toFixed(0)} KB\n`);

  if (dryRun) {
    console.log("Files to import:");
    for (const n of notes) {
      console.log(`  [${n.folder}] ${n.title} (${(n.size / 1024).toFixed(1)} KB)`);
    }
    console.log(`\nDry run complete. No changes made.`);
    return;
  }

  const userId = await getOwnerId();
  console.log(`Owner: ${userId}\n`);

  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];

    // Dedup by title + source + user
    const { data: existing } = await supabase
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .eq("title", note.title)
      .eq("source", "codebase")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("notes")
        .update({
          content: note.content,
          folder: note.folder,
          updated_at: new Date().toISOString(),
          embedding: null, // clear old embedding so re-embed picks it up
        })
        .eq("id", existing.id);
      if (error) {
        console.error(`  ERROR updating "${note.title}": ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          title: note.title,
          content: note.content,
          source: "codebase",
          folder: note.folder,
          encrypted: false,
          context_mode: "available",
        });
      if (error) {
        console.error(`  ERROR inserting "${note.title}": ${error.message}`);
        errors++;
      } else {
        imported++;
      }
    }

    // Progress every 25 files
    if ((i + 1) % 25 === 0 || i === notes.length - 1) {
      console.log(`  ${i + 1}/${notes.length} — ${imported} new, ${updated} updated, ${errors} errors`);
    }
  }

  console.log(`\nImport done: ${imported} new, ${updated} updated, ${errors} errors.`);

  // Batch embed if requested
  if (doEmbed) {
    console.log("\nStarting batch embed...");
    // Find unembedded notes
    const { data: unembedded, error: fetchErr } = await supabase
      .from("notes")
      .select("id, title, content")
      .eq("user_id", userId)
      .eq("source", "codebase")
      .is("embedding", null)
      .limit(500);

    if (fetchErr || !unembedded?.length) {
      console.log(fetchErr ? `Embed fetch error: ${fetchErr.message}` : "No unembedded notes found.");
      return;
    }

    console.log(`${unembedded.length} notes to embed.`);

    const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
    if (!VOYAGE_API_KEY) {
      console.error("VOYAGE_API_KEY not set — skipping embed.");
      return;
    }

    const BATCH_SIZE = 10;
    let embedded = 0;
    let embedErrors = 0;

    for (let i = 0; i < unembedded.length; i += BATCH_SIZE) {
      const batch = unembedded.slice(i, i + BATCH_SIZE);
      const texts = batch.map(n => `${n.title}\n\n${n.content}`.slice(0, 32000));

      try {
        const res = await fetch("https://api.voyageai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${VOYAGE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "voyage-3.5-lite",
            input: texts,
            input_type: "document",
          }),
        });

        if (!res.ok) {
          console.error(`  Voyage API error: ${res.status} ${await res.text()}`);
          embedErrors += batch.length;
          continue;
        }

        const { data: embeddings } = await res.json();

        for (let j = 0; j < batch.length; j++) {
          const { error } = await supabase
            .from("notes")
            .update({ embedding: JSON.stringify(embeddings[j].embedding) })
            .eq("id", batch[j].id);
          if (error) {
            console.error(`  Embed save error for "${batch[j].title}": ${error.message}`);
            embedErrors++;
          } else {
            embedded++;
          }
        }
      } catch (err) {
        console.error(`  Embed batch error: ${err.message}`);
        embedErrors += batch.length;
      }

      console.log(`  Embedded ${Math.min(i + BATCH_SIZE, unembedded.length)}/${unembedded.length}`);
    }

    console.log(`\nEmbed done: ${embedded} embedded, ${embedErrors} errors.`);
  }
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
