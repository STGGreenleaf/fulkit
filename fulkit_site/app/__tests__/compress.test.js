import { describe, it, expect } from "vitest";

// ── Copy of compression logic from route.js (pure functions, no imports) ──

function estimateTokens(content) {
  if (typeof content === "string") return Math.ceil((content || "").length / 4);
  if (Array.isArray(content)) {
    return content.reduce((sum, block) => {
      if (block.type === "text") return sum + Math.ceil((block.text || "").length / 4);
      if (block.type === "image") return sum + 1000;
      return sum;
    }, 0);
  }
  return 0;
}

function compressConversation(messages, maxTokens = 80000, chapterSummaries = null) {
  if (chapterSummaries && chapterSummaries.length > 0) {
    const chapterBlock = chapterSummaries.map((ch, i) => {
      const parts = [`Chapter ${i + 1} (${ch.turnCount} turns):`];
      if (ch.userIntents?.length) parts.push("  Topics: " + ch.userIntents.join(" | "));
      if (ch.assistantDecisions?.length) parts.push("  Key points: " + ch.assistantDecisions.slice(0, 5).join("; "));
      if (ch.extractedNotes?.length) {
        const grouped = {};
        for (const n of ch.extractedNotes) {
          if (!grouped[n.type]) grouped[n.type] = [];
          grouped[n.type].push(n.text);
        }
        for (const [type, items] of Object.entries(grouped)) {
          parts.push(`  ${type}s: ${items.join("; ")}`);
        }
      }
      return parts.join("\n");
    }).join("\n\n");

    return [
      {
        role: "user",
        content: `[Previous chapters in this planning session:\n${chapterBlock}\n\nContinuing in a new chapter:]`,
      },
      ...messages.slice(1),
    ];
  }

  let total = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  if (total <= maxTokens) return messages;

  const keep = [];
  let keepTokens = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (keep.length > 0 && keepTokens + msgTokens > maxTokens * 0.6) break;
    keep.unshift(messages[i]);
    keepTokens += msgTokens;
  }

  const older = messages.slice(0, messages.length - keep.length);
  if (older.length === 0) return keep;

  const userTopics = [];
  const assistantPoints = [];
  const maxPoints = Math.min(25, Math.max(15, Math.ceil(older.length * 0.8)));

  for (const m of older) {
    const text = typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? m.content.filter((b) => b.type === "text").map((b) => b.text).join(" ")
        : "";
    if (!text) continue;

    if (m.role === "user") {
      const sentences = text.match(/[^.!?\n]+[.!?]*/g) || [text];
      const topic = sentences.slice(0, 2).join("").trim();
      if (topic) userTopics.push(topic.length > 250 ? topic.slice(0, 247) + "..." : topic);
    } else {
      if (assistantPoints.length >= maxPoints) continue;
      const lines = text.split("\n");
      const bullets = [];
      const proseLines = [];

      for (const line of lines) {
        const t = line.trim();
        if ((t.startsWith("- ") || t.startsWith("* ") || t.match(/^\d+\./)) && t.length > 10 && t.length < 200) {
          bullets.push(t);
        } else if (t.length > 20) {
          proseLines.push(t);
        }
      }

      if (bullets.length > 0) {
        const room = maxPoints - assistantPoints.length;
        assistantPoints.push(...bullets.slice(0, Math.min(5, room)));
      }

      if (proseLines.length > 0 && assistantPoints.length < maxPoints) {
        const prose = proseLines[0];
        const firstSentence = prose.split(/[.!?]\s/)[0];
        if (firstSentence && firstSentence.length > 15) {
          assistantPoints.push(firstSentence.slice(0, 200));
        }
      }
    }
  }

  const summaryParts = [];
  if (userTopics.length > 0) summaryParts.push("Topics discussed:\n" + userTopics.map((t) => `- ${t}`).join("\n"));
  if (assistantPoints.length > 0) summaryParts.push("Key points:\n" + assistantPoints.join("\n"));

  return [
    {
      role: "user",
      content: `[Earlier in this conversation (${older.length} messages):\n${summaryParts.join("\n\n")}\n\nContinuing from there:]`,
    },
    ...keep,
  ];
}

// ── Helpers ──

function msg(role, content) {
  return { role, content };
}

function longText(words) {
  return Array(words).fill("lorem ipsum dolor sit amet consectetur").join(" ");
}

function bulletResponse(bullets) {
  return bullets.map(b => `- ${b}`).join("\n");
}

function proseResponse(text) {
  return text; // no bullets, forces fallback
}

// ── Tests ──

describe("estimateTokens", () => {
  it("estimates string tokens at ~4 chars/token", () => {
    expect(estimateTokens("hello")).toBe(2); // 5 / 4 = 1.25 → ceil 2
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });

  it("handles content block arrays", () => {
    const blocks = [
      { type: "text", text: "a".repeat(100) },
      { type: "text", text: "b".repeat(200) },
    ];
    expect(estimateTokens(blocks)).toBe(75); // 25 + 50
  });

  it("counts images as 1000 tokens", () => {
    const blocks = [
      { type: "text", text: "hello" },
      { type: "image" },
    ];
    expect(estimateTokens(blocks)).toBe(1002); // 2 + 1000
  });

  it("returns 0 for null/undefined/empty", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });
});

describe("compressConversation — no compression needed", () => {
  it("returns messages unchanged when under threshold", () => {
    const messages = [
      msg("user", "hello"),
      msg("assistant", "hi there"),
      msg("user", "how are you"),
    ];
    const result = compressConversation(messages, 80000);
    expect(result).toBe(messages); // same reference — no copy
  });

  it("returns messages unchanged with 20 short messages", () => {
    const messages = [];
    for (let i = 0; i < 20; i++) {
      messages.push(msg(i % 2 === 0 ? "user" : "assistant", `Message number ${i}`));
    }
    const result = compressConversation(messages, 80000);
    expect(result).toBe(messages);
  });
});

describe("compressConversation — triggers compression", () => {
  it("compresses when total tokens exceed threshold", () => {
    // Create messages that total > 1000 tokens (using low threshold for test)
    const messages = [];
    for (let i = 0; i < 30; i++) {
      messages.push(msg(
        i % 2 === 0 ? "user" : "assistant",
        longText(20) // ~180 chars each ≈ 45 tokens
      ));
    }
    // Total ≈ 30 * 45 = 1350 tokens. Set threshold at 500.
    const result = compressConversation(messages, 500);
    expect(result.length).toBeLessThan(messages.length);
    expect(result[0].content).toContain("[Earlier in this conversation");
  });

  it("keeps ~60% of token budget in recent messages", () => {
    const messages = [];
    for (let i = 0; i < 40; i++) {
      messages.push(msg(
        i % 2 === 0 ? "user" : "assistant",
        `Message ${i}: ` + "x".repeat(100) // ~28 tokens each
      ));
    }
    // Total ≈ 40 * 28 = 1120 tokens. Threshold 500, so 60% = 300 tokens ≈ 10-11 messages
    const result = compressConversation(messages, 500);
    // First message is the summary, rest are kept recent messages
    const keptCount = result.length - 1; // minus the summary
    expect(keptCount).toBeGreaterThan(8);
    expect(keptCount).toBeLessThan(20);
  });

  it("summary includes user topics", () => {
    const messages = [
      msg("user", "I want to talk about my business plan for a juice bar in downtown Portland"),
      msg("assistant", "Great idea! " + "x".repeat(300) + "\n- Start with a menu\n- Calculate food costs\n- Find a location"),
      msg("user", "What about pricing strategy for the cold pressed juices specifically"),
      msg("assistant", "For pricing: " + "x".repeat(300) + "\n- Research competitors\n- Cost-plus pricing works well"),
      msg("user", "Now let's discuss the marketing plan for our grand opening"),
      msg("assistant", "Marketing: " + "x".repeat(300) + "\n- Social media is key\n- Local partnerships matter"),
      // These recent messages should be kept
      msg("user", "What about the lease negotiation"),
      msg("assistant", "For the lease: " + "x".repeat(300) + "\n- Commercial leases are typically 5-10 years"),
    ];
    const result = compressConversation(messages, 500);
    const summary = result[0].content;
    expect(summary).toContain("juice bar");
  });

  it("summary includes assistant bullet points", () => {
    const messages = [
      msg("user", "What should I do to start my business?"),
      msg("assistant", "Here's what I suggest:\n- Start with a menu and test recipes\n- Calculate food costs per item\n- Find a good location with foot traffic\n" + "x".repeat(400)),
      msg("user", "Thanks, what else should I consider?"),
      msg("assistant", "Also consider:\n- Research competitors nearby and their pricing\n- Cost-plus pricing works well for food businesses\n" + "x".repeat(400)),
      // Recent — should be kept
      msg("user", "Got it, let's move forward"),
      msg("assistant", "Great, let me know when you're ready to take the next step. " + "x".repeat(200)),
    ];
    const result = compressConversation(messages, 300);
    const summary = result[0].content;
    expect(summary).toContain("Start with a menu");
    expect(summary).toContain("Calculate food costs");
  });

  it("falls back to first sentence when no bullets in older messages", () => {
    const messages = [
      msg("user", "Tell me about the weather"),
      msg("assistant", "The weather today is going to be warm and sunny with temperatures reaching the mid 80s. You might want to bring sunscreen if you're heading outside."),
      msg("user", "What about tomorrow"),
      msg("assistant", "Tomorrow looks like rain is expected in the afternoon."),
    ];
    const result = compressConversation(messages, 50);
    const summary = result[0].content;
    // Should contain first sentence of the first prose response
    expect(summary).toContain("The weather today is going to be warm and sunny");
  });

  it("always keeps at least one recent message", () => {
    const messages = [
      msg("user", longText(500)),  // huge message
      msg("assistant", longText(500)),
      msg("user", "short follow up"),
    ];
    const result = compressConversation(messages, 100);
    // Last message should always be kept
    expect(result[result.length - 1].content).toBe("short follow up");
  });

  it("handles content block arrays in messages", () => {
    const messages = [
      msg("user", [{ type: "text", text: "What is this image about?" }, { type: "image" }]),
      msg("assistant", "That appears to be a chart showing revenue growth."),
      msg("user", "Can you summarize it?"),
      msg("assistant", "The chart shows steady quarterly growth from Q1 to Q4."),
    ];
    // Image = 1000 tokens, forces compression even at high threshold
    const result = compressConversation(messages, 500);
    expect(result.length).toBeLessThanOrEqual(messages.length);
  });
});

describe("compressConversation — summary quality", () => {
  it("caps bullet points with maxPoints scaling", () => {
    const messages = [];
    // 20 exchanges with lots of bullets + padding to ensure compression triggers
    for (let i = 0; i < 20; i++) {
      messages.push(msg("user", `Question ${i}: What about topic ${i}? ` + "x".repeat(100)));
      messages.push(msg("assistant", Array.from({ length: 5 }, (_, j) => `- Point ${i}.${j}: Important detail here`).join("\n") + "\n" + "x".repeat(100)));
    }
    messages.push(msg("user", "Final question"));
    messages.push(msg("assistant", "Final answer here."));

    const result = compressConversation(messages, 500);
    const summary = result[0].content;
    const bulletCount = (summary.match(/- Point \d+\.\d+/g) || []).length;
    // maxPoints scales with older.length but caps at 25, and per-message cap of 5
    expect(bulletCount).toBeLessThanOrEqual(25);
    expect(bulletCount).toBeGreaterThan(0);
  });

  it("preserves message count in summary header", () => {
    const messages = [];
    for (let i = 0; i < 30; i++) {
      messages.push(msg(i % 2 === 0 ? "user" : "assistant", `Message ${i} with some content here`));
    }
    const result = compressConversation(messages, 200);
    const summary = result[0].content;
    // Should mention how many messages were summarized
    expect(summary).toMatch(/\d+ messages/);
  });

  it("user topics are truncated at 250 chars", () => {
    const longQuestion = "a".repeat(400);
    const messages = [
      msg("user", longQuestion),
      msg("assistant", "- Sure thing, here is the info"),
      msg("user", "short"),
      msg("assistant", "- OK sounds good to me"),
    ];
    const result = compressConversation(messages, 50);
    const summary = result[0].content;
    // Should cap at 250, not full 400
    expect(summary.includes("a".repeat(300))).toBe(false);
    expect(summary.includes("a".repeat(247))).toBe(true);
  });
});

describe("compressConversation — prose retention (the fix)", () => {
  it("captures prose EVEN when bullets exist in other messages", () => {
    // Heavy older messages, light recent — forces older into summary
    const pad = "x".repeat(800);
    const messages = [
      msg("user", "What should I prioritize?" + pad),
      msg("assistant", "Based on your situation, I think the most important thing is to focus on cash flow before expanding. " + pad),
      msg("user", "What about the menu?" + pad),
      msg("assistant", "For the menu:\n- Start with 10 core items\n- Test each recipe 3 times\n- Price at 3x food cost\n" + pad),
      msg("user", "And marketing?" + pad),
      msg("assistant", "Marketing needs a plan too. " + pad),
      msg("user", "Anything else?" + pad),
      msg("assistant", "That covers the main points for now. " + pad),
      // light recent — kept by 60% window
      msg("user", "OK next steps"),
      msg("assistant", "Let's schedule a tasting session."),
    ];
    const result = compressConversation(messages, 300);
    expect(result.length).toBeLessThan(messages.length);
    const summary = result[0].content;
    expect(summary).toContain("Start with 10 core items");
    expect(summary).toContain("focus on cash flow before expanding");
  });

  it("captures lead sentence from every assistant response, not just first", () => {
    const pad = "x".repeat(800);
    const messages = [
      msg("user", "How do I start?" + pad),
      msg("assistant", "The first step is getting your business license from the city. That usually takes about two weeks. " + pad),
      msg("user", "And then what?" + pad),
      msg("assistant", "Once you have the license, you need to secure a commercial kitchen space. There are shared kitchen co-ops. " + pad),
      msg("user", "What about funding?" + pad),
      msg("assistant", "For funding, most juice bars start with personal savings or a small SBA loan. The typical cost is $50-150K. " + pad),
      msg("user", "Location tips?" + pad),
      msg("assistant", "For location, focus on foot traffic and proximity to gyms and health food stores. " + pad),
      // light recent
      msg("user", "Thanks"),
      msg("assistant", "Happy to help!"),
    ];
    const result = compressConversation(messages, 300);
    expect(result.length).toBeLessThan(messages.length);
    const summary = result[0].content;
    expect(summary).toContain("business license");
    expect(summary).toContain("commercial kitchen");
    expect(summary).toContain("funding");
  });

  it("extracts full user sentences instead of mid-word truncation", () => {
    const pad = "x".repeat(800);
    const messages = [
      msg("user", "I want to update the pricing for all cold-pressed juices in the menu, specifically the 12oz bottles, and also adjust the loyalty program discounts." + pad),
      msg("assistant", "Got it, let me pull up the current pricing. " + pad),
      msg("user", "Also check the seasonal items." + pad),
      msg("assistant", "Sure, pulling those too. " + pad),
      // light recent
      msg("user", "Yes proceed"),
      msg("assistant", "Done."),
    ];
    const result = compressConversation(messages, 300);
    expect(result.length).toBeLessThan(messages.length);
    const summary = result[0].content;
    expect(summary).toContain("cold-pressed juices");
    expect(summary).toContain("loyalty program");
  });

  it("caps bullets per message at 5 so one response doesn't dominate", () => {
    const pad = "x".repeat(800);
    const messages = [
      msg("user", "Give me everything" + pad),
      msg("assistant", Array.from({ length: 12 }, (_, i) => `- Important point number ${i + 1} that matters`).join("\n") + "\n" + pad),
      msg("user", "What else?" + pad),
      msg("assistant", "- This point from second response should also appear\n" + pad),
      msg("user", "More?" + pad),
      msg("assistant", "That's all the main points. " + pad),
      // light recent
      msg("user", "thanks"),
      msg("assistant", "welcome"),
    ];
    const result = compressConversation(messages, 300);
    expect(result.length).toBeLessThan(messages.length);
    const summary = result[0].content;
    expect(summary).toContain("point number 1");
    expect(summary).toContain("point number 5");
    expect(summary).not.toContain("point number 6");
    expect(summary).toContain("second response should also appear");
  });
});

describe("compressConversation — sandbox chapters", () => {
  it("uses chapter summaries when provided", () => {
    const messages = [
      msg("user", "Start planning"),
      msg("assistant", "Let's begin."),
      msg("user", "Continue planning"),
    ];
    const chapters = [
      {
        turnCount: 8,
        userIntents: ["pricing strategy", "menu design"],
        assistantDecisions: ["Use cost-plus pricing", "Start with 10 items"],
        extractedNotes: [{ type: "decision", text: "Cost-plus pricing" }],
      },
    ];
    const result = compressConversation(messages, 100, chapters);
    expect(result[0].content).toContain("Previous chapters");
    expect(result[0].content).toContain("pricing strategy");
    expect(result[0].content).toContain("cost-plus pricing");
    // Should keep all messages after the first
    expect(result.length).toBe(3); // chapter summary + 2 remaining messages
  });

  it("skips chapter compression when no chapters provided", () => {
    const messages = [msg("user", "hello"), msg("assistant", "hi")];
    const result = compressConversation(messages, 80000, null);
    expect(result).toBe(messages);
  });
});

describe("compressConversation — edge cases", () => {
  it("handles single message (no compression possible)", () => {
    const messages = [msg("user", longText(500))];
    const result = compressConversation(messages, 50);
    // Can't compress further than 1 message
    expect(result.length).toBe(1);
  });

  it("handles two messages where both are huge", () => {
    const messages = [
      msg("user", longText(200)),
      msg("assistant", longText(200)),
    ];
    const result = compressConversation(messages, 50);
    // Should keep last message + summarize first
    expect(result.length).toBe(2);
    expect(result[0].content).toContain("[Earlier in this conversation");
  });

  it("handles empty content gracefully", () => {
    const messages = [
      msg("user", ""),
      msg("assistant", ""),
      msg("user", "actual question"),
      msg("assistant", "actual answer"),
    ];
    const result = compressConversation(messages, 80000);
    expect(result).toBe(messages); // under threshold, no compression
  });
});
