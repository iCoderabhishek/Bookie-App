/**
 * Strip the leading `http://` or `https://` from a URL.
 * Used to render URLs in inputs without the scheme noise — the scheme
 * is implicit and added back at submit time by `normalizeUrl`.
 */
export function stripScheme(url: string): string {
  return url.replace(/^\s*https?:\/\//i, '');
}

/**
 * Ensure a URL has a scheme. Prepends `https://` if missing.
 * Returns the input unchanged when it's empty or already has http(s)://.
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
