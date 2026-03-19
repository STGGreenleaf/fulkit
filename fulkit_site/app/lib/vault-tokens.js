// Token budget manager — shared by all three vault models
// Estimates token counts, scores relevance, selects notes that fit within budget

const TOKEN_BUDGET = 25000; // ~25K tokens — reduced from 100K, server caps at 20 items

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Score relevance of a note to the current message
function relevanceScore(note, message) {
  if (!message) return 0;

  const messageLower = message.toLowerCase();
  const words = messageLower.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return 0;

  const titleLower = (note.title || "").toLowerCase();
  const contentLower = (note.content || "").toLowerCase();

  let score = 0;
  for (const word of words) {
    if (titleLower.includes(word)) score += 3;
    if (contentLower.includes(word)) score += 1;
  }

  return score;
}

export function selectContext(notes, message, budget = TOKEN_BUDGET, maxNotes = Infinity) {
  if (!notes || notes.length === 0) return [];

  // Step 1: Filter out 'off' notes entirely
  const active = notes.filter((n) => n.context_mode !== "off");

  // Step 2: 'always' notes + _FULKIT/ path → priority tier
  const priority = active.filter(
    (n) =>
      n.context_mode === "always" ||
      n.pinned ||
      (n.path && (n.path.includes("_FULKIT/") || n.path.includes("_CHAPPIE/")))
  );
  const rest = active.filter(
    (n) =>
      n.context_mode !== "always" &&
      !n.pinned &&
      !(n.path && (n.path.includes("_FULKIT/") || n.path.includes("_CHAPPIE/")))
  );

  // Score rest by relevance to current message, then by recency (array order)
  const scored = rest
    .map((n, i) => ({
      ...n,
      score: relevanceScore(n, message),
      recency: rest.length - i,
    }))
    .sort((a, b) => b.score - a.score || b.recency - a.recency);

  let tokens = 0;
  const selected = [];

  // Always notes go in first
  for (const note of priority) {
    if (selected.length >= maxNotes) break;
    const noteTokens = estimateTokens(note.content);
    selected.push({ title: note.title, content: note.content });
    tokens += noteTokens;
  }

  // Fill remaining budget with highest-relevance available notes
  for (const note of scored) {
    if (selected.length >= maxNotes) break;
    const noteTokens = estimateTokens(note.content);
    if (tokens + noteTokens > budget) continue;
    selected.push({ title: note.title, content: note.content });
    tokens += noteTokens;
  }

  return selected;
}

export function selectContextWithMetadata(notes, message, budget = TOKEN_BUDGET, maxNotes = Infinity) {
  if (!notes || notes.length === 0) {
    return { selected: [], metadata: { includedCount: 0, alwaysCount: 0, totalTokens: 0 } };
  }

  // Step 1: Filter out 'off' notes entirely
  const active = notes.filter((n) => n.context_mode !== "off");

  // Step 2: 'always' notes + _FULKIT/ path → priority tier
  const priority = active.filter(
    (n) =>
      n.context_mode === "always" ||
      n.pinned ||
      (n.path && (n.path.includes("_FULKIT/") || n.path.includes("_CHAPPIE/")))
  );
  const rest = active.filter(
    (n) =>
      n.context_mode !== "always" &&
      !n.pinned &&
      !(n.path && (n.path.includes("_FULKIT/") || n.path.includes("_CHAPPIE/")))
  );

  // Score rest by relevance to current message, then by recency
  const scored = rest
    .map((n, i) => ({
      ...n,
      score: relevanceScore(n, message),
      recency: rest.length - i,
    }))
    .sort((a, b) => b.score - a.score || b.recency - a.recency);

  let tokens = 0;
  const selected = [];

  // Always notes go in first
  for (const note of priority) {
    if (selected.length >= maxNotes) break;
    const noteTokens = estimateTokens(note.content);
    selected.push({ title: note.title, content: note.content });
    tokens += noteTokens;
  }

  // Fill remaining budget with highest-relevance available notes
  for (const note of scored) {
    if (selected.length >= maxNotes) break;
    const noteTokens = estimateTokens(note.content);
    if (tokens + noteTokens > budget) continue;
    selected.push({ title: note.title, content: note.content });
    tokens += noteTokens;
  }

  return {
    selected,
    metadata: {
      includedCount: selected.length,
      alwaysCount: priority.length,
      totalTokens: tokens,
    },
  };
}
