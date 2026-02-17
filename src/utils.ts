/**
 * Internal helpers – no external dependencies.
 */

/** Check whether a value is a plain object (not an array, Date, RegExp, etc.). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

/** Check whether a value is an array. */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Check whether a value is a primitive (non-object or null). */
export function isPrimitive(value: unknown): boolean {
  return value === null || typeof value !== 'object';
}

/**
 * Build a dot-notation path string.
 *
 * @example
 * buildPath('a', 'b')    // "a.b"
 * buildPath('a', 0)       // "a[0]"
 * buildPath('', 'root')   // "root"
 */
export function buildPath(base: string, key: string | number): string {
  if (typeof key === 'number') {
    return base === '' ? `[${key}]` : `${base}[${key}]`;
  }
  return base === '' ? key : `${base}.${key}`;
}

/**
 * Gather all unique keys from two objects.
 */
export function allKeys(
  lhs: Record<string, unknown>,
  rhs: Record<string, unknown>,
): string[] {
  const set = new Set<string>([...Object.keys(lhs), ...Object.keys(rhs)]);
  return Array.from(set);
}

/**
 * Default equality using Object.is (handles NaN, ±0 correctly).
 */
export function defaultIsEqual(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}
