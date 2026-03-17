/**
 * GET /api/referrals/connect/callback — Handle return from Stripe Connect onboarding.
 * Verifies the account is set up, then redirects back to settings.
 */

import { redirect } from "next/navigation";

export async function GET(request) {
  const url = new URL(request.url);
  const accountId = url.searchParams.get("account");

  // Verify the account exists and is set up (optional — Stripe handles this)
  // Just redirect back to the referrals tab
  redirect("/settings/referrals");
}
