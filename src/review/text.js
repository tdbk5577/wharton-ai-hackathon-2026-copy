export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\|mask\|/g, ' ')
    .replace(/<br>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeHtmlSnippet(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\|MASK\|/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatTopic(topic) {
  return String(topic || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function sentenceCase(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

export function trimSentence(text, maxLength) {
  const normalized = sentenceCase(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}
