"use client";

import { useAuth } from "../lib/auth";

const INTEGRATION_TIPS = {
  square: { name: "Square", try: "\"How did we do today?\"", also: "\"What's our inventory?\"" },
  numbrly: { name: "Numbrly", try: "\"What did that project cost?\"", also: "\"Show me vendor expenses\"" },
  truegauge: { name: "TrueGauge", try: "\"What's my customer satisfaction?\"", also: "\"Show me trends\"" },
  spotify: { name: "Spotify", try: "\"Play something chill\"", also: "\"What's playing?\"" },
  github: { name: "GitHub", try: "\"Show me recent commits\"", also: "\"Search the repo for...\"" },
  shopify: { name: "Shopify", try: "\"How are sales today?\"", also: "\"Show me orders\"" },
  stripe: { name: "Stripe", try: "\"Show recent payments\"", also: "\"Any failed charges?\"" },
  toast: { name: "Toast", try: "\"How did we do today?\"", also: "\"Any open orders?\"" },
  trello: { name: "Trello", try: "\"What's on my board?\"", also: "\"Show my cards\"" },
};

export default function OnboardingStatusLine() {
  const { onboardingState, newlyConnectedIntegration, dismissIntegrationTip } = useAuth();

  // Integration tip — shows regardless of onboarding state
  if (newlyConnectedIntegration) {
    const provider = newlyConnectedIntegration.provider?.toLowerCase();
    const tip = INTEGRATION_TIPS[provider];
    if (tip) {
      return (
        <div style={{ marginBottom: "var(--space-3)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", padding: "var(--space-2-5) var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
              You just connected {tip.name}. Try asking: {tip.try} or {tip.also}
            </span>
          </div>
          <button
            onClick={() => dismissIntegrationTip(provider)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", padding: "var(--space-1)" }}
          >
            Got it
          </button>
        </div>
      );
    }
  }

  if (!onboardingState || onboardingState.isOnboardingDone) return null;
  if (!onboardingState.isInTrial && onboardingState.tiersCompleted >= 5) return null;

  const { trialDay, tiersCompleted, currentTier, isInTrial } = onboardingState;

  const TIER_LABELS = {
    1: "Let's get started",
    2: "Getting to Know You",
    3: "Your brain's taking shape",
    4: "Almost dialed in",
    5: "The deep stuff",
  };

  let statusText;
  if (tiersCompleted >= 5) {
    const daysLeft = Math.max(0, 30 - trialDay);
    statusText = `Day ${trialDay} of 30 \u00b7 F\u00fclkit's dialed in. ${daysLeft} day${daysLeft !== 1 ? "s" : ""} to fall in love.`;
  } else if (isInTrial) {
    const label = TIER_LABELS[currentTier] || `Tier ${currentTier} of 5`;
    statusText = `Day ${trialDay} of 30 \u00b7 ${label} \u2014 Tier ${currentTier} of 5`;
  } else {
    statusText = `Tier ${tiersCompleted} of 5 \u00b7 Pick up where you left off?`;
  }

  const progressPct = (tiersCompleted / 5) * 100;

  return (
    <div style={{ marginBottom: "var(--space-3)" }}>
      <div
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-1-5)",
          letterSpacing: "var(--letter-spacing-wide)",
        }}
      >
        {statusText}
      </div>
      <div
        style={{
          height: 3,
          background: "var(--color-border-light)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "var(--color-text-dim)",
            borderRadius: 2,
            transition: "width 600ms ease",
          }}
        />
      </div>
    </div>
  );
}
