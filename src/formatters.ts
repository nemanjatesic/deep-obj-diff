import {
  DiffChange,
  DiffKind,
  FlatDiff,
  NestedDiff,
  NestedDiffNode,
  PatchOperation,
} from './types';

// ─── List (identity) ────────────────────────────────────────────────────────

/** Returns the change list as-is. */
export function toList(changes: DiffChange[]): DiffChange[] {
  return changes;
}

// ─── Flat ────────────────────────────────────────────────────────────────────

/** Converts the change list into a flat object keyed by path. */
export function toFlat(changes: DiffChange[]): FlatDiff {
  const result: FlatDiff = {};
  for (const c of changes) {
    result[c.path] = { kind: c.kind, lhs: c.lhs, rhs: c.rhs };
  }
  return result;
}

// ─── Nested ──────────────────────────────────────────────────────────────────

/**
 * Converts the flat change list into a nested object that mirrors the
 * shape of the compared objects, with diff metadata at each node.
 */
export function toNested(changes: DiffChange[]): NestedDiff {
  const root: NestedDiff = {};

  for (const change of changes) {
    const segments = parsePath(change.path);
    if (segments.length === 0) continue;

    let current: NestedDiff = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current[seg]) {
        current[seg] = { kind: DiffKind.Changed, children: {} };
      }
      const node = current[seg];
      if (!node.children) {
        node.children = {};
      }
      current = node.children;
    }

    const lastSeg = segments[segments.length - 1];
    const node: NestedDiffNode = { kind: change.kind };
    if (change.lhs !== undefined) node.lhs = change.lhs;
    if (change.rhs !== undefined) node.rhs = change.rhs;
    current[lastSeg] = node;
  }

  return root;
}

// ─── JSON Patch (RFC 6902 subset) ────────────────────────────────────────────

/**
 * Converts the change list into an array of JSON-Patch–style operations.
 * The `path` uses RFC 6901 JSON Pointer notation.
 */
export function toPatch(changes: DiffChange[]): PatchOperation[] {
  const ops: PatchOperation[] = [];

  for (const c of changes) {
    const pointer = toJsonPointer(c.path);

    switch (c.kind) {
      case DiffKind.Added:
        ops.push({ op: 'add', path: pointer, value: c.rhs });
        break;
      case DiffKind.Removed:
        ops.push({ op: 'remove', path: pointer, oldValue: c.lhs });
        break;
      case DiffKind.Changed:
        ops.push({ op: 'replace', path: pointer, value: c.rhs, oldValue: c.lhs });
        break;
      // Unchanged entries are skipped in patch output
    }
  }

  return ops;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a dot-notation path like `"a.b[0].c"` into `["a", "b", "0", "c"]`.
 */
function parsePath(path: string): string[] {
  if (path === '') return [];
  const segments: string[] = [];
  let current = '';

  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '.') {
      if (current !== '') {
        segments.push(current);
        current = '';
      }
    } else if (ch === '[') {
      if (current !== '') {
        segments.push(current);
        current = '';
      }
      // read until ]
      i++;
      while (i < path.length && path[i] !== ']') {
        current += path[i];
        i++;
      }
      segments.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current !== '') {
    segments.push(current);
  }

  return segments;
}

/**
 * Convert dot-notation path to JSON Pointer (RFC 6901).
 * `"a.b[0].c"` → `"/a/b/0/c"`
 */
function toJsonPointer(dotPath: string): string {
  const segments = parsePath(dotPath);
  return '/' + segments.map((s) => s.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

// Export for testing
export { parsePath as _parsePath, toJsonPointer as _toJsonPointer };
