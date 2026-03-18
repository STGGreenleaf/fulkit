import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken, encryptMeta } from "../../../../lib/token-crypt";
import crypto from "crypto";

export async function POST(request) {
  try {
    const { token, state } = await request.json();
    if (!token || !state) {
      return Response.json({ error: "Missing token or state" }, { status: 400 });
    }

    // Verify HMAC-signed state
    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      const hmac = crypto.createHmac("sha256", process.env.TRELLO_API_SECRET);
      hmac.update(decoded.payload);
      const expected = hmac.digest("hex");
      if (expected !== decoded.signature) throw new Error("Invalid signature");
      userId = JSON.parse(decoded.payload).userId;
    } catch {
      return Response.json({ error: "Invalid state" }, { status: 403 });
    }

    // Validate token by fetching member info
    const memberRes = await fetch(
      `https://api.trello.com/1/members/me?key=${process.env.TRELLO_API_KEY}&token=${token}&fields=id,username,fullName`
    );
    if (!memberRes.ok) {
      return Response.json({ error: "Invalid Trello token" }, { status: 400 });
    }
    const member = await memberRes.json();

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "trello",
          access_token: encryptToken(token),
          scope: "read,write",
          metadata: encryptMeta({
            trello_member_id: member.id,
            trello_username: member.username,
            trello_fullname: member.fullName,
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("[trello/save] DB error:", dbError.message);
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "trello" } }).then(() => {}).catch(() => {});
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[trello/save]", err.message);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
