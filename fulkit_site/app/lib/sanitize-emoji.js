// Replace colored/decorative emojis with monochrome typographic alternatives.
// Fulkit is warm monochrome — no decorative color allowed.

const EMOJI_MAP = {
  '✅': '✓',
  '❌': '✕',
  '⚠️': '▲',
  '🔴': '●',
  '🟢': '●',
  '🟡': '●',
  '🔵': '●',
  'ℹ️': '(i)',
  '⭐': '★',
  '👍': '',
  '👎': '',
  '🚀': '',
  '💡': '',
  '🎯': '',
  '📊': '',
  '📈': '',
  '📉': '',
  '💰': '',
  '🔥': '',
  '✨': '',
  '⚡': '',
  '🏆': '',
  '📝': '',
  '🔑': '',
  '💸': '',
};

const EMOJI_RE = new RegExp(Object.keys(EMOJI_MAP).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

export function sanitizeEmoji(text) {
  if (!text) return text;
  return text.replace(EMOJI_RE, (match) => EMOJI_MAP[match] ?? match).replace(/  +/g, ' ');
}
