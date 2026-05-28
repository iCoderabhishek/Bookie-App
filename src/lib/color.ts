/**
 * Convert a hex color (#RGB / #RRGGBB / #RRGGBBAA) to an rgba() string with
 * the supplied alpha. Returns the original string unchanged if it can't be
 * parsed as a hex (e.g. it's already rgba/named/transparent).
 */
export function withAlpha(color: string, alpha: number): string {
  if (alpha >= 1) return color;
  if (!color || color[0] !== '#') return color;

  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return color;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return color;

  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
