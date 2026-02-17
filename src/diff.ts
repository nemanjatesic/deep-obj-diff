import {
  DiffChange,
  DiffOptions,
  DiffResult,
  OutputFormat,
  CustomFormatter,
} from './types';
import { collectChanges } from './engine';
import { toList, toFlat, toNested, toPatch } from './formatters';
import { expandJsonStrings } from './utils';

/**
 * Deeply compare two objects and return the differences.
 *
 * @param lhs  - The original (left-hand side) value.
 * @param rhs  - The updated (right-hand side) value.
 * @param options - Optional configuration for the diff.
 * @returns The diff result in the requested format.
 *
 * @example
 * ```ts
 * import { diff } from 'deep-obj-diff';
 *
 * const result = diff(
 *   { a: 1, b: { c: 2 } },
 *   { a: 1, b: { c: 3 }, d: 4 },
 * );
 * // => [
 * //   { kind: 'changed', path: 'b.c', lhs: 2, rhs: 3 },
 * //   { kind: 'added', path: 'd', rhs: 4 },
 * // ]
 * ```
 */
export function diff(lhs: unknown, rhs: unknown, options?: DiffOptions<'list'>): DiffChange[];
export function diff(lhs: unknown, rhs: unknown, options: DiffOptions<'flat'>): import('./types').FlatDiff;
export function diff(lhs: unknown, rhs: unknown, options: DiffOptions<'nested'>): import('./types').NestedDiff;
export function diff(lhs: unknown, rhs: unknown, options: DiffOptions<'patch'>): import('./types').PatchOperation[];
export function diff<R>(lhs: unknown, rhs: unknown, options: DiffOptions<CustomFormatter<R>>): R;
export function diff<F extends OutputFormat | CustomFormatter = 'list'>(
  lhs: unknown,
  rhs: unknown,
  options?: DiffOptions<F>,
): DiffResult<F> {
  const opts = {
    format: (options?.format ?? 'list') as F,
    includeUnchanged: options?.includeUnchanged ?? false,
    maxDepth: options?.maxDepth ?? Infinity,
    filter: options?.filter,
    isEqual: options?.isEqual,
    arrayOrderMatters: options?.arrayOrderMatters ?? true,
    ignorePaths: options?.ignorePaths,
  };

  // Expand JSON-stringified string values before diffing
  const left = options?.expandJsonStrings ? expandJsonStrings(lhs) : lhs;
  const right = options?.expandJsonStrings ? expandJsonStrings(rhs) : rhs;

  const changes: DiffChange[] = [];
  collectChanges(left, right, '', opts, 0, changes);

  return formatOutput(changes, opts.format);
}

/**
 * A convenience function that returns `true` if the two values differ.
 */
export function hasDiff(lhs: unknown, rhs: unknown, options?: DiffOptions): boolean {
  const changes = diff(lhs, rhs, { ...options, format: 'list', includeUnchanged: false });
  return changes.length > 0;
}

/**
 * Returns only additions from the diff.
 */
export function addedDiff(lhs: unknown, rhs: unknown, options?: DiffOptions): DiffChange[] {
  const changes = diff(lhs, rhs, { ...options, format: 'list', includeUnchanged: false });
  return changes.filter((c) => c.kind === 'added');
}

/**
 * Returns only removals from the diff.
 */
export function removedDiff(lhs: unknown, rhs: unknown, options?: DiffOptions): DiffChange[] {
  const changes = diff(lhs, rhs, { ...options, format: 'list', includeUnchanged: false });
  return changes.filter((c) => c.kind === 'removed');
}

/**
 * Returns only changed (modified) entries from the diff.
 */
export function changedDiff(lhs: unknown, rhs: unknown, options?: DiffOptions): DiffChange[] {
  const changes = diff(lhs, rhs, { ...options, format: 'list', includeUnchanged: false });
  return changes.filter((c) => c.kind === 'changed');
}

// ─── Internal ────────────────────────────────────────────────────────────────

function formatOutput<F extends OutputFormat | CustomFormatter>(
  changes: DiffChange[],
  format: F,
): DiffResult<F> {
  if (typeof format === 'function') {
    return (format as CustomFormatter)(changes) as DiffResult<F>;
  }

  switch (format as OutputFormat) {
    case 'list':
      return toList(changes) as DiffResult<F>;
    case 'flat':
      return toFlat(changes) as DiffResult<F>;
    case 'nested':
      return toNested(changes) as DiffResult<F>;
    case 'patch':
      return toPatch(changes) as DiffResult<F>;
    default:
      return toList(changes) as DiffResult<F>;
  }
}
