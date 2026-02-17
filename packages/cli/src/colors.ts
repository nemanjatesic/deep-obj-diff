// ─── ANSI escape codes ──────────────────────────────────────────────────────

export const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
} as const;

/** Whether the current stdout supports ANSI color codes. */
export function supportsColor(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout.isTTY === true;
}

/** Wrap `text` in the given ANSI color, resetting afterwards. No-ops when color is unsupported. */
export function colorize(text: string, color: string): string {
  return supportsColor() ? `${color}${text}${COLORS.reset}` : text;
}

/** Pretty-print a value for terminal display. */
export function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
}
