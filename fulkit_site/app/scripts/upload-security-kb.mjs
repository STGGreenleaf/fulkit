#!/usr/bin/env node
// One-time script: upload security.md to owner-context KB
// Run: node scripts/upload-security-kb.mjs

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const content = readFileSync("../md/security.md", "utf-8");

// Check if it already exists
const { data: existing } = await supabase
  .from("vault_broadcasts")
  .select("id")
  .eq("title", "Security Architecture")
  .eq("channel", "owner-context")
  .maybeSingle();

if (existing) {
  // Update existing
  const { error } = await supabase
    .from("vault_broadcasts")
    .update({ content, active: true })
    .eq("id", existing.id);
  if (error) {
    console.error("FAILED to update:", error.message);
    process.exit(1);
  }
  console.log(`Updated existing doc (id: ${existing.id})`);
} else {
  // Insert new
  const { data, error } = await supabase
    .from("vault_broadcasts")
    .insert({
      title: "Security Architecture",
      content,
      channel: "owner-context",
      subtype: "doc",
      tag: "security",
    })
    .select()
    .single();
  if (error) {
    console.error("FAILED to insert:", error.message);
    process.exit(1);
  }
  console.log(`Inserted: Security Architecture (id: ${data.id})`);
}
