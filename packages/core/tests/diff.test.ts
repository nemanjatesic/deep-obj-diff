import { diff, hasDiff, addedDiff, removedDiff, changedDiff } from '../src/diff';
import { DiffKind, DiffChange, FlatDiff, NestedDiff, PatchOperation } from '../src/types';

// ─── Basic Diff (list format – default) ──────────────────────────────────────

describe('diff() – list format (default)', () => {
  it('returns empty array for identical primitives', () => {
    expect(diff(1, 1)).toEqual([]);
    expect(diff('a', 'a')).toEqual([]);
    expect(diff(null, null)).toEqual([]);
    expect(diff(true, true)).toEqual([]);
  });

  it('detects changed primitives', () => {
    const result = diff(1, 2);
    expect(result).toEqual([
      { kind: DiffKind.Changed, path: '', lhs: 1, rhs: 2 },
    ]);
  });

  it('handles NaN vs NaN as unchanged', () => {
    expect(diff(NaN, NaN)).toEqual([]);
  });

  it('handles +0 vs -0 as changed', () => {
    const result = diff(+0, -0);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Changed);
  });

  it('returns empty array for identical objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    expect(diff(obj, { a: 1, b: { c: 2 } })).toEqual([]);
  });

  it('detects added properties', () => {
    const result = diff({ a: 1 }, { a: 1, b: 2 });
    expect(result).toEqual([
      { kind: DiffKind.Added, path: 'b', rhs: 2 },
    ]);
  });

  it('detects removed properties', () => {
    const result = diff({ a: 1, b: 2 }, { a: 1 });
    expect(result).toEqual([
      { kind: DiffKind.Removed, path: 'b', lhs: 2 },
    ]);
  });

  it('detects changed properties', () => {
    const result = diff({ a: 1 }, { a: 2 });
    expect(result).toEqual([
      { kind: DiffKind.Changed, path: 'a', lhs: 1, rhs: 2 },
    ]);
  });

  it('handles deeply nested objects', () => {
    const lhs = { a: { b: { c: { d: 1 } } } };
    const rhs = { a: { b: { c: { d: 2 } } } };
    const result = diff(lhs, rhs);
    expect(result).toEqual([
      { kind: DiffKind.Changed, path: 'a.b.c.d', lhs: 1, rhs: 2 },
    ]);
  });

  it('detects multiple changes at different levels', () => {
    const lhs = { a: 1, b: { c: 2, d: 3 }, e: 5 };
    const rhs = { a: 10, b: { c: 2, d: 30 }, f: 6 };
    const result = diff(lhs, rhs);

    const kinds = result.map((c) => `${c.kind}:${c.path}`);
    expect(kinds).toContain('changed:a');
    expect(kinds).toContain('changed:b.d');
    expect(kinds).toContain('removed:e');
    expect(kinds).toContain('added:f');
    // b.c should NOT be in the result (unchanged, includeUnchanged=false)
    expect(kinds).not.toContain('unchanged:b.c');
  });

  it('handles null ↔ object transitions', () => {
    const r1 = diff({ a: null }, { a: { b: 1 } });
    expect(r1).toEqual([{ kind: DiffKind.Changed, path: 'a', lhs: null, rhs: { b: 1 } }]);

    const r2 = diff({ a: { b: 1 } }, { a: null });
    expect(r2).toEqual([{ kind: DiffKind.Changed, path: 'a', lhs: { b: 1 }, rhs: null }]);
  });

  it('handles undefined values correctly', () => {
    // Both keys exist with defined → undefined or vice versa = Changed
    const r1 = diff({ a: undefined }, { a: 1 });
    expect(r1[0].kind).toBe(DiffKind.Changed);

    const r2 = diff({ a: 1 }, { a: undefined });
    expect(r2[0].kind).toBe(DiffKind.Changed);

    // When key is truly missing vs present → Added/Removed
    const r3 = diff({}, { a: 1 });
    expect(r3[0].kind).toBe(DiffKind.Added);

    const r4 = diff({ a: 1 }, {});
    expect(r4[0].kind).toBe(DiffKind.Removed);
  });

  it('handles type changes (array ↔ object)', () => {
    const result = diff({ a: [1, 2] }, { a: { 0: 1, 1: 2 } });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Changed);
  });
});

// ─── Arrays ──────────────────────────────────────────────────────────────────

describe('diff() – arrays', () => {
  it('detects ordered array element changes', () => {
    const result = diff([1, 2, 3], [1, 20, 3]);
    expect(result).toEqual([
      { kind: DiffKind.Changed, path: '[1]', lhs: 2, rhs: 20 },
    ]);
  });

  it('detects added array elements', () => {
    const result = diff([1, 2], [1, 2, 3]);
    expect(result).toEqual([
      { kind: DiffKind.Added, path: '[2]', rhs: 3 },
    ]);
  });

  it('detects removed array elements', () => {
    const result = diff([1, 2, 3], [1, 2]);
    expect(result).toEqual([
      { kind: DiffKind.Removed, path: '[2]', lhs: 3 },
    ]);
  });

  it('handles nested arrays in objects', () => {
    const lhs = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };
    const rhs = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'B' }] };
    const result = diff(lhs, rhs);
    expect(result).toEqual([
      { kind: DiffKind.Changed, path: 'items[1].name', lhs: 'b', rhs: 'B' },
    ]);
  });

  it('handles unordered array comparison', () => {
    const result = diff([3, 1, 2], [2, 3, 1], { arrayOrderMatters: false });
    // all elements exist in both → no changes
    expect(result).toEqual([]);
  });

  it('detects additions in unordered arrays', () => {
    const result = diff([1, 2], [2, 3, 1], { arrayOrderMatters: false });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Added);
  });

  it('detects removals in unordered arrays', () => {
    const result = diff([1, 2, 3], [2, 1], { arrayOrderMatters: false });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Removed);
  });

  it('handles empty arrays', () => {
    expect(diff([], [])).toEqual([]);
    const r1 = diff([], [1]);
    expect(r1).toEqual([{ kind: DiffKind.Added, path: '[0]', rhs: 1 }]);
    const r2 = diff([1], []);
    expect(r2).toEqual([{ kind: DiffKind.Removed, path: '[0]', lhs: 1 }]);
  });
});

// ─── Special Values ──────────────────────────────────────────────────────────

describe('diff() – special values', () => {
  it('handles Date comparison', () => {
    const d1 = new Date('2025-01-01');
    const d2 = new Date('2025-06-15');
    const d1Copy = new Date('2025-01-01');

    expect(diff({ d: d1 }, { d: d1Copy })).toEqual([]);
    const result = diff({ d: d1 }, { d: d2 });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Changed);
  });

  it('handles RegExp comparison', () => {
    expect(diff({ r: /abc/gi }, { r: /abc/gi })).toEqual([]);
    const result = diff({ r: /abc/ }, { r: /def/ });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Changed);
  });
});

// ─── Options ─────────────────────────────────────────────────────────────────

describe('diff() – options', () => {
  describe('includeUnchanged', () => {
    it('includes unchanged entries when enabled', () => {
      const result = diff({ a: 1, b: 2 }, { a: 1, b: 3 }, { includeUnchanged: true });
      const unchanged = result.filter((c) => c.kind === DiffKind.Unchanged);
      expect(unchanged).toHaveLength(1);
      expect(unchanged[0].path).toBe('a');
    });
  });

  describe('maxDepth', () => {
    it('stops recursing at maxDepth', () => {
      const lhs = { a: { b: { c: 1 } } };
      const rhs = { a: { b: { c: 2 } } };

      // maxDepth=1: the root object recurses (depth 0→1), depth 1 = objects
      // at 'a' are entered. At depth 1 we compare 'a.b' which is at the limit,
      // so objects are compared by reference → changed.
      const result = diff(lhs, rhs, { maxDepth: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('a');
      expect(result[0].kind).toBe(DiffKind.Changed);
    });

    it('maxDepth 0 compares only top-level by reference', () => {
      const obj = { a: { x: 1 }, b: 2 };

      // maxDepth 0: entire objects compared by reference at the root
      const result = diff(obj, obj, { maxDepth: 0 });
      // Same reference → no diff
      expect(result).toEqual([]);

      // Different references but same shape → Changed at root
      const result2 = diff({ a: 1 }, { a: 1 }, { maxDepth: 0 });
      expect(result2).toHaveLength(1);
      expect(result2[0].path).toBe('');
      expect(result2[0].kind).toBe(DiffKind.Changed);
    });
  });

  describe('filter', () => {
    it('excludes paths that fail the filter', () => {
      const lhs = { a: 1, b: 2, c: 3 };
      const rhs = { a: 10, b: 20, c: 30 };
      const result = diff(lhs, rhs, {
        filter: (path) => path !== 'b',
      });
      const paths = result.map((c) => c.path);
      expect(paths).toContain('a');
      expect(paths).not.toContain('b');
      expect(paths).toContain('c');
    });
  });

  describe('isEqual', () => {
    it('uses custom equality function', () => {
      const lhs = { a: 'Hello' };
      const rhs = { a: 'hello' };
      const result = diff(lhs, rhs, {
        isEqual: (a, b) =>
          typeof a === 'string' && typeof b === 'string'
            ? a.toLowerCase() === b.toLowerCase()
            : Object.is(a, b),
      });
      expect(result).toEqual([]); // case-insensitive → same
    });
  });
});

// ─── Output Formats ──────────────────────────────────────────────────────────

describe('diff() – output formats', () => {
  const lhs = { a: 1, b: { c: 2 }, d: 3 };
  const rhs = { a: 1, b: { c: 20 }, e: 5 };

  describe('flat format', () => {
    it('returns a flat object keyed by path', () => {
      const result = diff(lhs, rhs, { format: 'flat' }) as FlatDiff;
      expect(result['b.c']).toEqual({ kind: DiffKind.Changed, lhs: 2, rhs: 20 });
      expect(result['d']).toEqual({ kind: DiffKind.Removed, lhs: 3, rhs: undefined });
      expect(result['e']).toEqual({ kind: DiffKind.Added, lhs: undefined, rhs: 5 });
    });
  });

  describe('nested format', () => {
    it('returns a nested structure with diff metadata', () => {
      const result = diff(lhs, rhs, { format: 'nested' }) as NestedDiff;
      expect(result['b'].children?.['c'].kind).toBe(DiffKind.Changed);
      expect(result['d'].kind).toBe(DiffKind.Removed);
      expect(result['e'].kind).toBe(DiffKind.Added);
    });
  });

  describe('patch format', () => {
    it('returns JSON Patch operations', () => {
      const result = diff(lhs, rhs, { format: 'patch' }) as PatchOperation[];
      const ops = result.map((op) => `${op.op}:${op.path}`);
      expect(ops).toContain('replace:/b/c');
      expect(ops).toContain('remove:/d');
      expect(ops).toContain('add:/e');
    });

    it('includes value and oldValue in replace ops', () => {
      const result = diff({ x: 1 }, { x: 2 }, { format: 'patch' }) as PatchOperation[];
      expect(result[0]).toEqual({
        op: 'replace',
        path: '/x',
        value: 2,
        oldValue: 1,
      });
    });
  });

  describe('custom formatter', () => {
    it('passes changes through custom function', () => {
      const result = diff(
        { a: 1, b: 2 },
        { a: 1, b: 3 },
        { format: (changes: DiffChange[]) => changes.length },
      );
      expect(result).toBe(1);
    });

    it('custom formatter receives all changes', () => {
      const spy = jest.fn((changes: DiffChange[]) => changes);
      diff({ a: 1 }, { a: 2, b: 3 }, { format: spy });
      expect(spy).toHaveBeenCalledTimes(1);
      const changes = spy.mock.calls[0][0] as DiffChange[];
      expect(changes).toHaveLength(2);
    });
  });
});

// ─── Convenience Functions ───────────────────────────────────────────────────

describe('convenience functions', () => {
  const lhs = { a: 1, b: 2, c: 3 };
  const rhs = { a: 10, c: 3, d: 4 };

  it('hasDiff returns true when different', () => {
    expect(hasDiff(lhs, rhs)).toBe(true);
  });

  it('hasDiff returns false when identical', () => {
    expect(hasDiff({ x: 1 }, { x: 1 })).toBe(false);
  });

  it('addedDiff returns only additions', () => {
    const result = addedDiff(lhs, rhs);
    expect(result.every((c) => c.kind === DiffKind.Added)).toBe(true);
    expect(result.map((c) => c.path)).toEqual(['d']);
  });

  it('removedDiff returns only removals', () => {
    const result = removedDiff(lhs, rhs);
    expect(result.every((c) => c.kind === DiffKind.Removed)).toBe(true);
    expect(result.map((c) => c.path)).toEqual(['b']);
  });

  it('changedDiff returns only modifications', () => {
    const result = changedDiff(lhs, rhs);
    expect(result.every((c) => c.kind === DiffKind.Changed)).toBe(true);
    expect(result.map((c) => c.path)).toEqual(['a']);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles empty objects', () => {
    expect(diff({}, {})).toEqual([]);
  });

  it('handles both sides undefined', () => {
    expect(diff(undefined, undefined)).toEqual([]);
  });

  it('handles both sides null', () => {
    expect(diff(null, null)).toEqual([]);
  });

  it('handles lhs=undefined rhs=object', () => {
    const result = diff(undefined, { a: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Added);
  });

  it('handles lhs=object rhs=undefined', () => {
    const result = diff({ a: 1 }, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe(DiffKind.Removed);
  });

  it('handles deeply nested additions', () => {
    const result = diff({}, { a: { b: { c: 1 } } });
    expect(result).toEqual([
      { kind: DiffKind.Added, path: 'a', rhs: { b: { c: 1 } } },
    ]);
  });

  it('handles string ↔ number', () => {
    const result = diff({ a: '1' }, { a: 1 });
    expect(result[0].kind).toBe(DiffKind.Changed);
  });

  it('handles boolean ↔ number', () => {
    const result = diff({ a: true }, { a: 1 });
    expect(result[0].kind).toBe(DiffKind.Changed);
  });

  it('handles large flat objects', () => {
    const lhs: Record<string, number> = {};
    const rhs: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      lhs[`key${i}`] = i;
      rhs[`key${i}`] = i % 2 === 0 ? i : i * 10;
    }
    const result = diff(lhs, rhs);
    expect(result).toHaveLength(50); // every odd key changed
    expect(result.every((c) => c.kind === DiffKind.Changed)).toBe(true);
  });
});
