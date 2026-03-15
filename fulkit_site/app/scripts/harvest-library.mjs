#!/usr/bin/env node
/**
 * Fabric Harvest — Pull all tracks from Spotify library
 *
 * Usage:
 *   node scripts/harvest-library.mjs [--user <user_id>]
 *
 * What it does:
 *   1. Fetches tracks from 5 Spotify sources (saved, playlists, top, artists, recent)
 *   2. Deduplicates by source_id
 *   3. Inserts new tracks into fabric_tracks as 'pending' (skips existing)
 *
 * Requires: Spotify OAuth tokens in integrations table (connect via Fulkit first)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: new URL("../.env.local", import.meta.url).pathname });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SPOTIFY_API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

// ═══════════════════════════════════════════
// Spotify token management
// ═══════════════════════════════════════════
async function getSpotifyToken(userId) {
  const { data } = await supabase
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .single();
  if (!data) throw new Error("No Spotify integration found. Connect Spotify first.");
  return data;
}

async function refreshToken(userId, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenStr,
    }),
  });
  const data = await res.json();
  if (data.error || !data.access_token) throw new Error(`Token refresh failed: ${data.error}`);

  await supabase
    .from("integrations")
    .update({
      access_token: data.access_token,
      metadata: { refresh_token: data.refresh_token || refreshTokenStr, expires_at: Date.now() + data.expires_in * 1000 },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "spotify");

  return data.access_token;
}

let _accessToken = null;
let _userId = null;

async function spotifyFetch(endpoint) {
  const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${_accessToken}` },
  });

  if (res.status === 401) {
    const integration = await getSpotifyToken(_userId);
    _accessToken = await refreshToken(_userId, integration.metadata?.refresh_token);
    const retry = await fetch(`${SPOTIFY_API}${endpoint}`, {
      headers: { Authorization: `Bearer ${_accessToken}` },
    });
    if (!retry.ok) throw new Error(`Spotify ${endpoint}: ${retry.status}`);
    return retry.json();
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "5");
    console.log(`  Rate limited. Waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return spotifyFetch(endpoint);
  }

  if (!res.ok) throw new Error(`Spotify ${endpoint}: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════
// Track extractors
// ═══════════════════════════════════════════
function extractTrack(item) {
  if (!item || !item.id) return null;
  return {
    source_id: item.id,
    title: item.name || "Unknown",
    artist: item.artists?.map(a => a.name).join(", ") || "Unknown",
    duration_ms: item.duration_ms || 0,
    isrc: item.external_ids?.isrc || null,
  };
}

// ═══════════════════════════════════════════
// Source 1: Saved/Liked tracks
// ═══════════════════════════════════════════
async function harvestSaved(tracks) {
  console.log("\n[1/5] Saved tracks...");
  let offset = 0;
  let total = 0;
  while (true) {
    const data = await spotifyFetch(`/me/tracks?limit=50&offset=${offset}`);
    for (const item of (data.items || [])) {
      const t = extractTrack(item.track);
      if (t) tracks.set(t.source_id, t);
    }
    total = data.total || 0;
    offset += 50;
    if (offset >= total || !data.items?.length) break;
  }
  console.log(`  Found ${total} saved tracks`);
}

// ═══════════════════════════════════════════
// Source 2: All playlists → tracks
// ═══════════════════════════════════════════
async function harvestPlaylists(tracks) {
  console.log("\n[2/5] Playlists...");
  let offset = 0;
  const playlists = [];
  while (true) {
    const data = await spotifyFetch(`/me/playlists?limit=50&offset=${offset}`);
    for (const pl of (data.items || [])) {
      playlists.push({ id: pl.id, name: pl.name, total: pl.tracks?.total || 0 });
    }
    offset += 50;
    if (offset >= (data.total || 0) || !data.items?.length) break;
  }
  console.log(`  Found ${playlists.length} playlists`);

  for (const pl of playlists) {
    let plOffset = 0;
    while (plOffset < pl.total) {
      const data = await spotifyFetch(`/playlists/${pl.id}/tracks?limit=100&offset=${plOffset}&fields=items(track(id,name,artists,duration_ms,external_ids))`);
      for (const item of (data.items || [])) {
        const t = extractTrack(item.track);
        if (t) tracks.set(t.source_id, t);
      }
      plOffset += 100;
      if (!data.items?.length) break;
    }
    process.stdout.write(`  ${pl.name} (${pl.total}) ✓\n`);
  }
}

// ═══════════════════════════════════════════
// Source 3: Top tracks (3 time ranges)
// ═══════════════════════════════════════════
async function harvestTopTracks(tracks) {
  console.log("\n[3/5] Top tracks...");
  for (const range of ["short_term", "medium_term", "long_term"]) {
    const data = await spotifyFetch(`/me/top/tracks?limit=50&time_range=${range}`);
    let count = 0;
    for (const item of (data.items || [])) {
      const t = extractTrack(item);
      if (t) { tracks.set(t.source_id, t); count++; }
    }
    console.log(`  ${range}: ${count} tracks`);
  }
}

// ═══════════════════════════════════════════
// Source 4: Top artists → their top tracks
// ═══════════════════════════════════════════
async function harvestTopArtists(tracks) {
  console.log("\n[4/5] Top artists → top tracks...");
  const artistIds = new Set();
  for (const range of ["short_term", "medium_term", "long_term"]) {
    const data = await spotifyFetch(`/me/top/artists?limit=50&time_range=${range}`);
    for (const a of (data.items || [])) {
      artistIds.add(a.id);
    }
  }
  console.log(`  ${artistIds.size} unique artists`);

  for (const artistId of artistIds) {
    try {
      const data = await spotifyFetch(`/artists/${artistId}/top-tracks?market=US`);
      for (const item of (data.tracks || [])) {
        const t = extractTrack(item);
        if (t) tracks.set(t.source_id, t);
      }
    } catch (e) {
      console.log(`  Skipped artist ${artistId}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════
// Source 5: Recently played
// ═══════════════════════════════════════════
async function harvestRecent(tracks) {
  console.log("\n[5/5] Recently played...");
  const data = await spotifyFetch("/me/player/recently-played?limit=50");
  let count = 0;
  for (const item of (data.items || [])) {
    const t = extractTrack(item.track);
    if (t) { tracks.set(t.source_id, t); count++; }
  }
  console.log(`  ${count} recent tracks`);
}

// ═══════════════════════════════════════════
// Insert into fabric_tracks
// ═══════════════════════════════════════════
async function insertTracks(tracks) {
  const trackList = Array.from(tracks.values());
  console.log(`\nInserting ${trackList.length} unique tracks...`);

  // Check which already exist
  const spotifyIds = trackList.map(t => t.source_id);
  const { data: existing } = await supabase
    .from("fabric_tracks")
    .select("source_id")
    .in("source_id", spotifyIds);

  const existingIds = new Set((existing || []).map(t => t.source_id));
  const newTracks = trackList.filter(t => !existingIds.has(t.source_id));

  console.log(`  Already in DB: ${existingIds.size}`);
  console.log(`  New to insert: ${newTracks.length}`);

  if (newTracks.length === 0) {
    console.log("  Nothing new to insert.");
    return;
  }

  // Batch insert in chunks of 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < newTracks.length; i += BATCH) {
    const batch = newTracks.slice(i, i + BATCH).map(t => ({
      source_id: t.source_id,
      title: t.title,
      artist: t.artist,
      duration_ms: t.duration_ms,
      isrc: t.isrc,
      composite_key: `${t.artist.toLowerCase().trim()}|${t.title.toLowerCase().trim()}|${Math.round(t.duration_ms / 5000) * 5}`,
      status: "pending",
    }));

    const { error } = await supabase.from("fabric_tracks").insert(batch);
    if (error) {
      // Fall back to individual inserts on conflict
      for (const row of batch) {
        const { error: singleErr } = await supabase
          .from("fabric_tracks")
          .upsert(row, { onConflict: "source_id", ignoreDuplicates: true });
        if (!singleErr) inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  Inserted: ${inserted} tracks as 'pending'`);
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════
async function main() {
  console.log("\n════════════════════════════════════════════");
  console.log("  Fabric Library Harvest");
  console.log("════════════════════════════════════════════");

  // Find user ID
  const args = process.argv.slice(2);
  let userId = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--user" && args[i + 1]) userId = args[++i];
  }

  if (!userId) {
    // Default: find the first user with Spotify connected
    const { data } = await supabase
      .from("integrations")
      .select("user_id")
      .eq("provider", "spotify")
      .limit(1)
      .single();
    if (!data) {
      console.error("No Spotify integration found. Pass --user <id> or connect Spotify first.");
      process.exit(1);
    }
    userId = data.user_id;
  }

  console.log(`User: ${userId}`);
  _userId = userId;

  // Get token
  const integration = await getSpotifyToken(userId);
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    _accessToken = await refreshToken(userId, integration.metadata?.refresh_token);
  } else {
    _accessToken = integration.access_token;
  }

  // Harvest
  const tracks = new Map();

  await harvestSaved(tracks);
  await harvestPlaylists(tracks);
  await harvestTopTracks(tracks);
  await harvestTopArtists(tracks);
  await harvestRecent(tracks);

  console.log(`\n════════════════════════════════════════════`);
  console.log(`  Total unique tracks: ${tracks.size}`);
  console.log(`════════════════════════════════════════════`);

  await insertTracks(tracks);

  console.log("\nDone.\n");
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
