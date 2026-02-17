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

/**
 * Check whether a dot-notation path matches an ignore pattern.
 *
 * Pattern rules:
 * - `"foo.bar"` — exact match
 * - `"*.type"` — matches any path ending with `.type` (e.g. `"a.type"`, `"x.y.type"`)
 * - `"settings.*"` — matches any path starting with `"settings."` (e.g. `"settings.theme"`)
 * - `"**.id"` — matches any path containing `.id` or equal to `"id"` at any depth
 */
export function matchesIgnorePattern(path: string, pattern: string): boolean {
  // Exact match
  if (path === pattern) return true;

  // "**.segment" — any depth wildcard: matches paths ending with the segment
  if (pattern.startsWith('**.')) {
    const suffix = pattern.slice(3); // after "**."
    return path === suffix || path.endsWith(`.${suffix}`);
  }

  // "*.segment" — single-level wildcard on the left
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // includes the leading dot: ".type"
    return path.endsWith(suffix);
  }

  // "prefix.*" — wildcard on the right
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2); // before ".*"
    return path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`);
  }

  return false;
}

/**
 * Check whether a path should be ignored based on an array of ignore patterns.
 */
export function shouldIgnorePath(path: string, ignorePaths: string[]): boolean {
  return ignorePaths.some((pattern) => matchesIgnorePattern(path, pattern));
}

/**
 * Recursively walk a value and expand any string properties that
 * contain valid JSON (objects or arrays) into their parsed form.
 *
 * @example
 * ```ts
 * expandJsonStrings({ data: '{"name":"Alice"}' })
 * // => { data: { name: 'Alice' } }
 * ```
 */
export function expandJsonStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return expandJsonStrings(JSON.parse(trimmed));
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(expandJsonStrings);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = expandJsonStrings((value as Record<string, unknown>)[key]);
    }
    return result;
  }

  return value;
}
