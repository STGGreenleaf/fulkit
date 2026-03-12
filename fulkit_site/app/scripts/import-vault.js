#!/usr/bin/env node

// Import an Obsidian vault into Fulkit's notes table.
// Usage: node scripts/import-vault.js [vault-path] [--include-archive] [--dry-run]
// Defaults: vault = ~/Desktop/fulkit/ChappieBrain, skips 00-INBOX + 07-ARCHIVE

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync, existsSync } from "fs";
import { readdir } from "fs/promises";
import { join, basename, relative, sep } from "path";

// Load env from .env.local (no dotenv dependency)
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const includeArchive = args.includes("--include-archive");
const vaultPath = args.find((a) => !a.startsWith("--")) ||
  join(process.env.HOME, "Desktop/fulkit/ChappieBrain");

// Folders to skip
const SKIP_FOLDERS = new Set([".obsidian"]);
if (!includeArchive) SKIP_FOLDERS.add("07-ARCHIVE");

async function walkDir(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip dotfiles and configured folders
      if (entry.name.startsWith(".") || SKIP_FOLDERS.has(entry.name)) continue;
      files.push(...(await walkDir(fullPath)));
    } else if (entry.name.endsWith(".md") && !entry.name.startsWith(".")) {
      const stat = statSync(fullPath);
      if (stat.size === 0) continue; // skip empty files
      files.push(fullPath);
    }
  }
  return files;
}

function getTopFolder(filePath, vault) {
  const rel = relative(vault, filePath);
  const parts = rel.split(sep);
  return parts.length > 1 ? parts[0] : "00-INBOX";
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
  if (!existsSync(vaultPath)) {
    console.error(`Vault not found: ${vaultPath}`);
    process.exit(1);
  }

  console.log(`\nVault: ${vaultPath}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE IMPORT"}`);
  console.log(`Archive: ${includeArchive ? "included" : "skipped"}\n`);

  // Collect files
  const files = await walkDir(vaultPath);
  files.sort((a, b) => statSync(a).size - statSync(b).size); // smallest first

  // Build notes — use relative path (without .md) as title to avoid collisions
  // e.g., "02-BUSINESS/HBBEVCO-LLC/_BUSINESS" instead of just "_BUSINESS"
  const notes = files.map((f) => {
    const content = readFileSync(f, "utf-8");
    const relPath = relative(vaultPath, f);
    const title = relPath.replace(/\.md$/, "");
    return {
      title,
      content,
      source: "obsidian",
      folder: getTopFolder(f, vaultPath),
      size: content.length,
      path: relPath,
    };
  });

  // Summary by folder
  const folderCounts = {};
  for (const n of notes) {
    folderCounts[n.folder] = (folderCounts[n.folder] || 0) + 1;
  }
  console.log("Files by folder:");
  for (const [folder, count] of Object.entries(folderCounts).sort()) {
    console.log(`  ${folder}: ${count}`);
  }
  console.log(`\nTotal: ${notes.length} files\n`);

  if (dryRun) {
    console.log("Files to import:");
    for (const n of notes) {
      console.log(`  [${n.folder}] ${n.title} (${n.size.toLocaleString()} chars)`);
    }
    console.log("\nDry run complete. No changes made.");
    return;
  }

  // Get owner ID
  const userId = await getOwnerId();
  console.log(`Owner: ${userId}\n`);

  // Upsert in batches
  const BATCH_SIZE = 50;
  let imported = 0;
  let updated = 0;

  for (let i = 0; i < notes.length; i += BATCH_SIZE) {
    const batch = notes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(notes.length / BATCH_SIZE);

    for (const note of batch) {
      // Check if exists (dedup by title + source + user)
      const { data: existing } = await supabase
        .from("notes")
        .select("id")
        .eq("user_id", userId)
        .eq("title", note.title)
        .eq("source", "obsidian")
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("notes")
          .update({ content: note.content, folder: note.folder, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) {
          console.error(`  ERROR updating "${note.title}": ${error.message}`);
        } else {
          updated++;
        }
      } else {
        // Insert
        const { error } = await supabase
          .from("notes")
          .insert({
            user_id: userId,
            title: note.title,
            content: note.content,
            source: "obsidian",
            folder: note.folder,
            encrypted: false,
            context_mode: "available",
          });
        if (error) {
          console.error(`  ERROR inserting "${note.title}": ${error.message}`);
        } else {
          imported++;
        }
      }
    }

    console.log(`Batch ${batchNum}/${totalBatches}: ${batch.length} notes | Total: ${imported} new, ${updated} updated`);
  }

  console.log(`\nDone! ${imported} imported, ${updated} updated.`);
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
