"use client";

import DocLayout, { DocSection } from "../../components/DocLayout";

export default function Privacy() {
  return (
    <DocLayout title="Privacy Policy" subtitle="Last updated: March 2026">
      <DocSection title="The short version">
        <p>
          Your data is yours. We store what you give us so your second brain works.
          We don't sell your data. We don't train on your data. You can export
          everything and delete your account at any time.
        </p>
      </DocSection>

      <DocSection title="What we collect">
        <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <li>Account info (name, email via Google sign-in)</li>
          <li>Notes and documents you upload or create</li>
          <li>AI conversation history</li>
          <li>Preferences you set (display, AI behavior, vault mode)</li>
          <li>A referral cookie if you arrived via a referral link (30-day expiry)</li>
          <li>Usage data (message counts, feature usage)</li>
        </ul>
      </DocSection>

      <DocSection title="How we use it">
        <p>
          To make your second brain work. Your notes are embedded and stored so
          the AI can retrieve them. Your preferences are learned so the AI can
          talk to you the way you want. That's it.
        </p>
      </DocSection>

      <DocSection title="Third parties">
        <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <li>Anthropic (Claude API) — processes your messages, does not retain them</li>
          <li>Voyage AI — generates note embeddings for semantic search, does not store content</li>
          <li>Supabase — database and authentication hosting</li>
          <li>Vercel — application hosting and serverless functions</li>
          <li>Stripe — payment processing and referral payouts</li>
          <li>Upstash — distributed rate limiting (Redis)</li>
          <li>Google — OAuth sign-in and connected services (Calendar, Gmail, Drive) when enabled by you</li>
          <li>Spotify, GitHub, Square, Stripe, Shopify, Toast, Trello, Fitbit, QuickBooks, Notion, Dropbox, Slack, OneNote, Todoist, Readwise — only when connected by you, for the features you enable</li>
          <li>Invisible intelligence APIs (server-side, no user data shared): OpenWeatherMap (weather), WAQI (air quality), USDA &amp; Open Food Facts (nutrition), Open Library (books), Frankfurter (currency), Free Dictionary API, Nominatim (geocoding), Wikipedia, NASA (APOD), Wolfram Alpha, Currents (news), Have I Been Pwned (breach check)</li>
        </ul>
      </DocSection>

      <DocSection title="Your rights">
        <p>
          Export all your data at any time from Settings. Delete
          specific memories, conversations, or your entire account. No lock-in,
          ever.
        </p>
      </DocSection>

      <DocSection title="Contact">
        <p>
          Questions? Reach us at privacy@fulkit.app.
        </p>
      </DocSection>
    </DocLayout>
  );
}
