"use client";

import Link from "next/link";
import DocLayout, { DocSection } from "../../components/DocLayout";
import { TIERS, CREDITS } from "../../lib/ful-config";

export default function Terms() {
  return (
    <DocLayout title="Terms of Service" subtitle="Last updated: March 2026">
      <DocSection title="What Fülkit is">
        <p>
          Fülkit is an AI-powered personal knowledge assistant. You store notes,
          connect sources, and talk to an AI that has context on everything
          you've saved. It's your second brain.
        </p>
      </DocSection>

      <DocSection title="Your account">
        <p>
          You sign in with Google. You're responsible for your account activity.
          One account per person. Don't share your access.
        </p>
      </DocSection>

      <DocSection title="Subscriptions and billing">
        <p>
          {TIERS.standard.label} ({TIERS.standard.priceLabel}) and {TIERS.pro.label} ({TIERS.pro.priceLabel}) plans are billed monthly. Credits
          ({CREDITS.description}) are one-time purchases. Referral credits reduce your
          monthly bill but cannot be cashed out. Cancel anytime from Settings.
        </p>
      </DocSection>

      <DocSection title="Your data">
        <p>
          You own your data. We store it to provide the service. You can export
          everything as markdown and delete your account at any time. See our{" "}
          <Link href="/privacy" style={{ color: "var(--color-text)", textDecoration: "underline" }}>
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
      </DocSection>

      <DocSection title="AI limitations">
        <p>
          Fülkit uses AI that can make mistakes. Don't rely on it for medical,
          legal, or financial advice. It's a thinking partner, not an authority.
        </p>
      </DocSection>

      <DocSection title="Acceptable use">
        <p>
          Don't use Fülkit for anything illegal, harmful, or that violates
          others' rights. We reserve the right to suspend accounts that abuse
          the service.
        </p>
      </DocSection>

      <DocSection title="Contact">
        <p>
          Questions? Reach us at hello@fulkit.app.
        </p>
      </DocSection>
    </DocLayout>
  );
}
