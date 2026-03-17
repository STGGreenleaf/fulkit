import { getSupabaseAdmin } from "../../../../lib/supabase-server";

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

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await request.json();
  if (!code) return Response.json({ error: "No referral code" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Check if user already has a referrer (prevent double-claim)
  const { data: myProfile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .single();

  if (myProfile?.referred_by) {
    return Response.json({ error: "Already referred" }, { status: 409 });
  }

  // Look up who owns this referral code
  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .single();

  if (!referrer) {
    return Response.json({ error: "Invalid referral code" }, { status: 404 });
  }

  // Can't refer yourself
  if (referrer.id === user.id) {
    return Response.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  // Check for existing referral relationship
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referrer_id", referrer.id)
    .eq("referred_id", user.id)
    .single();

  if (existing) {
    return Response.json({ error: "Referral already exists" }, { status: 409 });
  }

  // Create referral row (status: trial until they subscribe)
  const { error: refError } = await admin
    .from("referrals")
    .insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      status: "trial",
      credit_ful_per_month: 0,
    });

  if (refError) {
    console.error("[referrals/claim] insert error:", refError.message);
    return Response.json({ error: "Failed to create referral" }, { status: 500 });
  }

  // Set referred_by on the new user's profile
  await admin
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", user.id);

  return Response.json({ ok: true });
}
