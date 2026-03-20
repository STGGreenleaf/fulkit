/**
 * POST /api/bluesky/post — Publish to Bluesky via AT Protocol.
 * Owner-only. Accepts text + optional imageUrl (from Supabase storage).
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const BSKY_SERVICE = "https://bsky.social";

async function getUser(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") return null;
  return user;
}

async function createSession() {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) throw new Error("Bluesky credentials not configured");

  const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Bluesky auth failed: ${err.message || res.status}`);
  }

  return await res.json();
}

async function uploadBlob(session, imageBytes, mimeType) {
  const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: imageBytes,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Blob upload failed: ${err.message || res.status}`);
  }

  const data = await res.json();
  return data.blob;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { text, imageUrl, altText } = await request.json();

    if (!text || typeof text !== "string" || text.length === 0) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.length > 300) {
      return Response.json({ error: "Text exceeds 300 character limit" }, { status: 400 });
    }

    // Create Bluesky session
    const session = await createSession();

    // Build the post record
    const record = {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date().toISOString(),
    };

    // Parse facets (links, mentions) from text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const facets = [];
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[1];
      const byteStart = new TextEncoder().encode(text.slice(0, match.index)).length;
      const byteEnd = byteStart + new TextEncoder().encode(url).length;
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
      });
    }
    if (facets.length > 0) record.facets = facets;

    // Upload image if provided
    if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to fetch image from URL");
      const mimeType = imgRes.headers.get("content-type") || "image/png";
      const imageBytes = await imgRes.arrayBuffer();

      const blob = await uploadBlob(session, imageBytes, mimeType);

      record.embed = {
        $type: "app.bsky.embed.images",
        images: [{
          alt: altText || "",
          image: blob,
        }],
      };
    }

    // Create the post
    const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Post failed: ${err.message || res.status}`);
    }

    const result = await res.json();
    return Response.json({ success: true, uri: result.uri });
  } catch (err) {
    console.error("[bluesky/post] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
