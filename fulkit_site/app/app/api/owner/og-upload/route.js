import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// POST /api/owner/og-upload — upload OG image to slot (1-3)
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return Response.json({ error: "Owner only" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file");
    const slotRaw = formData.get("slot") || "1";

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "file required" }, { status: 400 });
    }

    // Accept numeric slots 1-3 or "twitter"
    const isTwitter = slotRaw === "twitter";
    const slot = isTwitter ? "twitter" : parseInt(slotRaw, 10);
    if (!isTwitter && (slot < 1 || slot > 3)) {
      return Response.json({ error: "slot must be 1-3 or 'twitter'" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `og-${slot}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload (upsert to overwrite existing)
    const { error: uploadError } = await admin.storage
      .from("og-images")
      .upload(path, buffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = admin.storage.from("og-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now(); // cache bust

    return Response.json({ url: publicUrl, slot });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
