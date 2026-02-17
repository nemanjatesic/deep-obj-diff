import { DiffChange, DiffKind, DiffOptions } from './types';
import { isPlainObject, isArray, isPrimitive, buildPath, allKeys, defaultIsEqual } from './utils';

/**
 * Internal recursive diff collector.
 *
 * Walks both object trees in parallel and emits `DiffChange` entries into `out`.
 */
export function collectChanges(
  lhs: unknown,
  rhs: unknown,
  path: string,
  options: Required<Pick<DiffOptions, 'includeUnchanged' | 'maxDepth' | 'arrayOrderMatters'>> & {
    filter?: DiffOptions['filter'];
    isEqual?: DiffOptions['isEqual'];
  },
  depth: number,
  out: DiffChange[],
): void {
  const eq = options.isEqual ?? defaultIsEqual;

  // ── Filter check ────────────────────────────────────────────────────
  if (options.filter && !options.filter(path, lhs, rhs)) {
    return;
  }

  // ── Both primitive ──────────────────────────────────────────────────
  if (isPrimitive(lhs) && isPrimitive(rhs)) {
    if (eq(lhs, rhs, path)) {
      if (options.includeUnchanged) {
        out.push({ kind: DiffKind.Unchanged, path, lhs, rhs });
      }
    } else {
      out.push({ kind: DiffKind.Changed, path, lhs, rhs });
    }
    return;
  }

  // ── One side is primitive, the other is not ─────────────────────────
  if (isPrimitive(lhs) || isPrimitive(rhs)) {
    if (lhs === undefined) {
      out.push({ kind: DiffKind.Added, path, rhs });
    } else if (rhs === undefined) {
      out.push({ kind: DiffKind.Removed, path, lhs });
    } else {
      out.push({ kind: DiffKind.Changed, path, lhs, rhs });
    }
    return;
  }

  // ── Type mismatch (e.g. array vs object) ────────────────────────────
  if (isArray(lhs) !== isArray(rhs)) {
    out.push({ kind: DiffKind.Changed, path, lhs, rhs });
    return;
  }

  // ── Max depth reached – compare by reference ───────────────────────
  if (depth >= options.maxDepth) {
    if (eq(lhs, rhs, path)) {
      if (options.includeUnchanged) {
        out.push({ kind: DiffKind.Unchanged, path, lhs, rhs });
      }
    } else {
      out.push({ kind: DiffKind.Changed, path, lhs, rhs });
    }
    return;
  }

  // ── Arrays ──────────────────────────────────────────────────────────
  if (isArray(lhs) && isArray(rhs)) {
    diffArrays(lhs, rhs, path, options, depth, out);
    return;
  }

  // ── Plain objects ───────────────────────────────────────────────────
  if (isPlainObject(lhs) && isPlainObject(rhs)) {
    const keys = allKeys(lhs, rhs);
    for (const key of keys) {
      const childPath = buildPath(path, key);
      const lVal = lhs[key];
      const rVal = rhs[key];

      if (!(key in lhs)) {
        if (!options.filter || options.filter(childPath, undefined, rVal)) {
          out.push({ kind: DiffKind.Added, path: childPath, rhs: rVal });
        }
      } else if (!(key in rhs)) {
        if (!options.filter || options.filter(childPath, lVal, undefined)) {
          out.push({ kind: DiffKind.Removed, path: childPath, lhs: lVal });
        }
      } else {
        collectChanges(lVal, rVal, childPath, options, depth + 1, out);
      }
    }
    return;
  }

  // ── Dates ───────────────────────────────────────────────────────────
  if (lhs instanceof Date && rhs instanceof Date) {
    if (lhs.getTime() === rhs.getTime()) {
      if (options.includeUnchanged) {
        out.push({ kind: DiffKind.Unchanged, path, lhs, rhs });
      }
    } else {
      out.push({ kind: DiffKind.Changed, path, lhs, rhs });
    }
    return;
  }

  // ── RegExp ──────────────────────────────────────────────────────────
  if (lhs instanceof RegExp && rhs instanceof RegExp) {
    if (lhs.toString() === rhs.toString()) {
      if (options.includeUnchanged) {
        out.push({ kind: DiffKind.Unchanged, path, lhs, rhs });
      }
    } else {
      out.push({ kind: DiffKind.Changed, path, lhs, rhs });
    }
    return;
  }

  // ── Fallback – different types of complex objects ───────────────────
  if (eq(lhs, rhs, path)) {
    if (options.includeUnchanged) {
      out.push({ kind: DiffKind.Unchanged, path, lhs, rhs });
    }
  } else {
    out.push({ kind: DiffKind.Changed, path, lhs, rhs });
  }
}

/**
 * Diff two arrays, either by index (ordered) or by best-effort matching (unordered).
 */
function diffArrays(
  lhs: unknown[],
  rhs: unknown[],
  path: string,
  options: Required<Pick<DiffOptions, 'includeUnchanged' | 'maxDepth' | 'arrayOrderMatters'>> & {
    filter?: DiffOptions['filter'];
    isEqual?: DiffOptions['isEqual'];
  },
  depth: number,
  out: DiffChange[],
): void {
  if (options.arrayOrderMatters) {
    // ── Ordered comparison (by index) ───────────────────────────────
    const maxLen = Math.max(lhs.length, rhs.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = buildPath(path, i);
      if (i >= lhs.length) {
        if (!options.filter || options.filter(childPath, undefined, rhs[i])) {
          out.push({ kind: DiffKind.Added, path: childPath, rhs: rhs[i] });
        }
      } else if (i >= rhs.length) {
        if (!options.filter || options.filter(childPath, lhs[i], undefined)) {
          out.push({ kind: DiffKind.Removed, path: childPath, lhs: lhs[i] });
        }
      } else {
        collectChanges(lhs[i], rhs[i], childPath, options, depth + 1, out);
      }
    }
  } else {
    // ── Unordered comparison ────────────────────────────────────────
    // Use JSON.stringify as a fast heuristic for matching elements.
    const rhsMatched = new Set<number>();

    for (let i = 0; i < lhs.length; i++) {
      const childPath = buildPath(path, i);
      let matched = false;

      for (let j = 0; j < rhs.length; j++) {
        if (rhsMatched.has(j)) continue;
        if (deepEqual(lhs[i], rhs[j])) {
          rhsMatched.add(j);
          matched = true;
          if (options.includeUnchanged) {
            if (!options.filter || options.filter(childPath, lhs[i], rhs[j])) {
              out.push({ kind: DiffKind.Unchanged, path: childPath, lhs: lhs[i], rhs: rhs[j] });
            }
          }
          break;
        }
      }

      if (!matched) {
        if (!options.filter || options.filter(childPath, lhs[i], undefined)) {
          out.push({ kind: DiffKind.Removed, path: childPath, lhs: lhs[i] });
        }
      }
    }

    // Remaining unmatched rhs items are additions
    for (let j = 0; j < rhs.length; j++) {
      if (rhsMatched.has(j)) continue;
      const childPath = buildPath(path, j);
      if (!options.filter || options.filter(childPath, undefined, rhs[j])) {
        out.push({ kind: DiffKind.Added, path: childPath, rhs: rhs[j] });
      }
    }
  }
}

/**
 * Simple deep equality check used internally for unordered array matching.
 * No external deps – pure recursive comparison.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((el, i) => deepEqual(el, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Object.prototype.hasOwnProperty.call(bObj, k) && deepEqual(aObj[k], bObj[k]));
}

// Re-export for testing
export { deepEqual as _deepEqual };
