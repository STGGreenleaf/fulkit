#!/usr/bin/env node
/**
 * Creates Fabric tables in Supabase using the service role key.
 * Run once: node scripts/fabric-create-tables.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: new URL("../.env.local", import.meta.url).pathname });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test if tables already exist by trying to query them
async function tablesExist() {
  const { error } = await supabase.from("fabric_tracks").select("id").limit(0);
  return !error;
}

async function main() {
  if (await tablesExist()) {
    console.log("✓ fabric_tracks table already exists. Skipping creation.");
    console.log("  If you need to recreate, drop the tables first in the Supabase dashboard.");
    return;
  }

  console.log("Tables don't exist yet. Please create them:");
  console.log("");
  console.log("1. Go to: https://supabase.com/dashboard/project/zwezmthocrbavowrprzl/sql/new");
  console.log("2. Paste the contents of scripts/fabric-setup.sql");
  console.log("3. Click 'Run'");
  console.log("");
  console.log("Then re-run this script to verify.");
}

main();
