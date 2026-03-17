import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { generateReferralCode } from "../../../../lib/referral-engine";

async function getUser(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && user) return user;
  } catch {}
  return null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // Check if user already has a referral code
  const { data: profile } = await admin
    .from("profiles")
    .select("referral_code, name")
    .eq("id", user.id)
    .single();

  if (profile?.referral_code) {
    return Response.json({ code: profile.referral_code });
  }

  // Generate one
  const name = profile?.name || user.user_metadata?.full_name || user.email?.split("@")[0];
  let code = generateReferralCode(name);

  // Retry up to 3 times on collision
  for (let i = 0; i < 3; i++) {
    const { error } = await admin
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", user.id);

    if (!error) return Response.json({ code });

    // Unique constraint violation — regenerate
    code = generateReferralCode(name);
  }

  return Response.json({ error: "Failed to generate code" }, { status: 500 });
}
