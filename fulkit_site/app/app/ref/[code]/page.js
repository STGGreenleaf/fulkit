"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ReferralLanding() {
  const { code } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!code) {
      router.replace("/landing");
      return;
    }

    // Store referral code in cookie (30-day expiry)
    document.cookie = `fulkit-ref=${encodeURIComponent(code)};path=/;max-age=${30 * 24 * 60 * 60};SameSite=Lax`;

    // Send to login — cookie survives OAuth redirect
    router.replace("/login");
  }, [code, router]);

  return null;
}
