import { matchesIgnorePattern, shouldIgnorePath } from '../src/utils';
import { diff, hasDiff, addedDiff, removedDiff, changedDiff } from '../src/diff';
import { DiffChange } from '../src/types';

// ─── Unit: matchesIgnorePattern ──────────────────────────────────────────────

describe('matchesIgnorePattern', () => {
  describe('exact match', () => {
    it('matches identical simple paths', () => {
      expect(matchesIgnorePattern('a', 'a')).toBe(true);
      expect(matchesIgnorePattern('a.b', 'a.b')).toBe(true);
      expect(matchesIgnorePattern('a.b.c', 'a.b.c')).toBe(true);
    });

    it('rejects different paths', () => {
      expect(matchesIgnorePattern('a', 'b')).toBe(false);
      expect(matchesIgnorePattern('a.b', 'a.c')).toBe(false);
      expect(matchesIgnorePattern('a.b.c', 'a.b.d')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(matchesIgnorePattern('Name', 'name')).toBe(false);
      expect(matchesIgnorePattern('a.Type', 'a.type')).toBe(false);
    });

    it('matches paths with array notation', () => {
      expect(matchesIgnorePattern('items[0]', 'items[0]')).toBe(true);
      expect(matchesIgnorePattern('a[0].b[1]', 'a[0].b[1]')).toBe(true);
    });

    it('does not partially match', () => {
      expect(matchesIgnorePattern('a.b', 'a')).toBe(false);
      expect(matchesIgnorePattern('a', 'a.b')).toBe(false);
      expect(matchesIgnorePattern('ab', 'a')).toBe(false);
    });
  });

  describe('*.suffix pattern (requires parent)', () => {
    it('matches single-level nesting', () => {
      expect(matchesIgnorePattern('a.type', '*.type')).toBe(true);
      expect(matchesIgnorePattern('obj.name', '*.name')).toBe(true);
      expect(matchesIgnorePattern('x.id', '*.id')).toBe(true);
    });

    it('matches multi-level nesting', () => {
      expect(matchesIgnorePattern('a.b.type', '*.type')).toBe(true);
      expect(matchesIgnorePattern('x.y.z.name', '*.name')).toBe(true);
      expect(matchesIgnorePattern('deep.nested.path.id', '*.id')).toBe(true);
    });

    it('does NOT match top-level (bare segment)', () => {
      expect(matchesIgnorePattern('type', '*.type')).toBe(false);
      expect(matchesIgnorePattern('name', '*.name')).toBe(false);
      expect(matchesIgnorePattern('id', '*.id')).toBe(false);
    });

    it('does not match partial suffixes', () => {
      expect(matchesIgnorePattern('a.types', '*.type')).toBe(false);
      expect(matchesIgnorePattern('a.mytype', '*.type')).toBe(false);
      expect(matchesIgnorePattern('a.typename', '*.type')).toBe(false);
    });

    it('does not match if suffix appears in the middle', () => {
      expect(matchesIgnorePattern('type.other', '*.type')).toBe(false);
    });
  });

  describe('**.suffix pattern (any depth, including top-level)', () => {
    it('matches top-level bare segment', () => {
      expect(matchesIgnorePattern('id', '**.id')).toBe(true);
      expect(matchesIgnorePattern('type', '**.type')).toBe(true);
    });

    it('matches single-level nesting', () => {
      expect(matchesIgnorePattern('a.id', '**.id')).toBe(true);
      expect(matchesIgnorePattern('obj.type', '**.type')).toBe(true);
    });

    it('matches deeply nested paths', () => {
      expect(matchesIgnorePattern('a.b.c.id', '**.id')).toBe(true);
      expect(matchesIgnorePattern('x.y.z.w.type', '**.type')).toBe(true);
    });

    it('does not match partial suffixes', () => {
      expect(matchesIgnorePattern('a.idx', '**.id')).toBe(false);
      expect(matchesIgnorePattern('a.identify', '**.id')).toBe(false);
      expect(matchesIgnorePattern('myid', '**.id')).toBe(false);
      expect(matchesIgnorePattern('a.ids', '**.id')).toBe(false);
    });

    it('does not match if suffix appears only in middle', () => {
      expect(matchesIgnorePattern('id.other', '**.id')).toBe(false);
      expect(matchesIgnorePattern('a.id.b', '**.id')).toBe(false);
    });
  });

  describe('prefix.* pattern (wildcard on the right)', () => {
    it('matches direct children with dot notation', () => {
      expect(matchesIgnorePattern('settings.theme', 'settings.*')).toBe(true);
      expect(matchesIgnorePattern('settings.color', 'settings.*')).toBe(true);
      expect(matchesIgnorePattern('settings.fontSize', 'settings.*')).toBe(true);
    });

    it('matches array-index children', () => {
      expect(matchesIgnorePattern('settings[0]', 'settings.*')).toBe(true);
      expect(matchesIgnorePattern('settings[99]', 'settings.*')).toBe(true);
    });

    it('matches deeply nested paths starting with prefix', () => {
      expect(matchesIgnorePattern('settings.theme.dark', 'settings.*')).toBe(true);
      expect(matchesIgnorePattern('settings.a.b.c', 'settings.*')).toBe(true);
    });

    it('does NOT match the prefix itself', () => {
      expect(matchesIgnorePattern('settings', 'settings.*')).toBe(false);
    });

    it('does not match different prefix', () => {
      expect(matchesIgnorePattern('other.theme', 'settings.*')).toBe(false);
      expect(matchesIgnorePattern('mysettings.theme', 'settings.*')).toBe(false);
    });

    it('works with nested prefix', () => {
      expect(matchesIgnorePattern('a.b.c', 'a.b.*')).toBe(true);
      expect(matchesIgnorePattern('a.b.c.d', 'a.b.*')).toBe(true);
      expect(matchesIgnorePattern('a.b', 'a.b.*')).toBe(false);
      expect(matchesIgnorePattern('x.b.c', 'a.b.*')).toBe(false);
    });
  });

  describe('no pattern match (fallthrough)', () => {
    it('returns false for patterns without wildcards that do not match', () => {
      expect(matchesIgnorePattern('foo', 'bar')).toBe(false);
      expect(matchesIgnorePattern('foo.bar', 'baz.qux')).toBe(false);
    });

    it('returns false for unrelated wildcard patterns', () => {
      expect(matchesIgnorePattern('foo.bar', '*.baz')).toBe(false);
      expect(matchesIgnorePattern('foo.bar', 'baz.*')).toBe(false);
      expect(matchesIgnorePattern('foo.bar', '**.baz')).toBe(false);
    });
  });
});

// ─── Unit: shouldIgnorePath ──────────────────────────────────────────────────

describe('shouldIgnorePath', () => {
  it('returns true when any pattern in the array matches', () => {
    expect(shouldIgnorePath('a.type', ['*.type', 'x.y'])).toBe(true);
    expect(shouldIgnorePath('x.y', ['*.type', 'x.y'])).toBe(true);
  });

  it('returns false when no pattern matches', () => {
    expect(shouldIgnorePath('a.name', ['*.type', 'x.y'])).toBe(false);
  });

  it('handles empty patterns array', () => {
    expect(shouldIgnorePath('a.type', [])).toBe(false);
  });

  it('handles single pattern', () => {
    expect(shouldIgnorePath('a.type', ['*.type'])).toBe(true);
    expect(shouldIgnorePath('a.name', ['*.type'])).toBe(false);
  });

  it('handles many patterns', () => {
    const patterns = ['*.type', '**.id', 'metadata', 'settings.*', 'a.b.c'];
    expect(shouldIgnorePath('x.type', patterns)).toBe(true);
    expect(shouldIgnorePath('deep.nested.id', patterns)).toBe(true);
    expect(shouldIgnorePath('metadata', patterns)).toBe(true);
    expect(shouldIgnorePath('settings.theme', patterns)).toBe(true);
    expect(shouldIgnorePath('a.b.c', patterns)).toBe(true);
    expect(shouldIgnorePath('other.field', patterns)).toBe(false);
  });
});

// ─── Integration: diff() with ignorePaths ────────────────────────────────────

describe('diff with ignorePaths option', () => {
  // ── Exact path ignoring ──────────────────────────────────────────────

  describe('exact path patterns', () => {
    it('ignores a single top-level key', () => {
      const lhs = { a: 1, b: 2, c: 3 };
      const rhs = { a: 1, b: 99, c: 3 };
      const result = diff(lhs, rhs, { ignorePaths: ['b'] });
      expect(result).toEqual([]);
    });

    it('ignores multiple exact top-level keys', () => {
      const lhs = { a: 1, b: 2, c: 3 };
      const rhs = { a: 10, b: 20, c: 30 };
      const result = diff(lhs, rhs, { ignorePaths: ['a', 'b'] });
      expect(result).toEqual([
        expect.objectContaining({ kind: 'changed', path: 'c' }),
      ]);
    });

    it('ignores a nested exact path', () => {
      const lhs = { user: { name: 'Alice', age: 30 } };
      const rhs = { user: { name: 'Bob', age: 30 } };
      const result = diff(lhs, rhs, { ignorePaths: ['user.name'] });
      expect(result).toEqual([]);
    });

    it('ignores deeply nested exact path', () => {
      const lhs = { a: { b: { c: { d: 1 } } } };
      const rhs = { a: { b: { c: { d: 999 } } } };
      const result = diff(lhs, rhs, { ignorePaths: ['a.b.c.d'] });
      expect(result).toEqual([]);
    });

    it('ignores path with array indices', () => {
      const lhs = { items: [{ id: 1 }, { id: 2 }] };
      const rhs = { items: [{ id: 99 }, { id: 2 }] };
      const result = diff(lhs, rhs, { ignorePaths: ['items[0].id'] });
      expect(result).toEqual([]);
    });
  });

  // ── *.suffix patterns ────────────────────────────────────────────────

  describe('*.suffix patterns', () => {
    it('ignores all nested .type fields but keeps top-level type', () => {
      const lhs = { type: 'user', meta: { type: 'v1' }, info: { type: 'basic' } };
      const rhs = { type: 'admin', meta: { type: 'v2' }, info: { type: 'premium' } };
      const result = diff(lhs, rhs, { ignorePaths: ['*.type'] });
      // *.type does NOT match top-level 'type', only nested ones
      expect(result).toEqual([
        expect.objectContaining({ kind: 'changed', path: 'type' }),
      ]);
    });

    it('ignores *.timestamp across siblings', () => {
      const lhs = {
        order: { timestamp: '2025-01-01', amount: 100 },
        payment: { timestamp: '2025-01-02', method: 'card' },
      };
      const rhs = {
        order: { timestamp: '2026-01-01', amount: 100 },
        payment: { timestamp: '2026-01-02', method: 'card' },
      };
      const result = diff(lhs, rhs, { ignorePaths: ['*.timestamp'] });
      expect(result).toEqual([]);
    });

    it('ignores *.id at various depths', () => {
      const lhs = {
        a: { id: 1, val: 'x' },
        b: { c: { id: 2, val: 'y' } },
      };
      const rhs = {
        a: { id: 99, val: 'x' },
        b: { c: { id: 99, val: 'y' } },
      };
      const result = diff(lhs, rhs, { ignorePaths: ['*.id'] });
      expect(result).toEqual([]);
    });
  });

  // ── **.suffix patterns ───────────────────────────────────────────────

  describe('**.suffix patterns (any depth)', () => {
    it('ignores top-level and nested type fields', () => {
      const lhs = { type: 'user', meta: { type: 'v1' } };
      const rhs = { type: 'admin', meta: { type: 'v2' } };
      const result = diff(lhs, rhs, { ignorePaths: ['**.type'] });
      expect(result).toEqual([]);
    });

    it('ignores **.id across all depths', () => {
      const lhs = {
        id: 1,
        user: { id: 2, profile: { id: 3, name: 'Alice' } },
      };
      const rhs = {
        id: 100,
        user: { id: 200, profile: { id: 300, name: 'Alice' } },
      };
      const result = diff(lhs, rhs, { ignorePaths: ['**.id'] });
      expect(result).toEqual([]);
    });

    it('keeps non-matching fields when using **.suffix', () => {
      const lhs = { id: 1, name: 'Alice', meta: { id: 2, role: 'user' } };
      const rhs = { id: 99, name: 'Bob', meta: { id: 99, role: 'admin' } };
      const result = diff(lhs, rhs, { ignorePaths: ['**.id'] });
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'changed', path: 'name' }),
        expect.objectContaining({ kind: 'changed', path: 'meta.role' }),
      ]));
    });
  });

  // ── prefix.* patterns ────────────────────────────────────────────────

  describe('prefix.* patterns', () => {
    it('ignores all direct children of a key', () => {
      const lhs = { settings: { theme: 'dark', font: 14 }, name: 'app' };
      const rhs = { settings: { theme: 'light', font: 16 }, name: 'app' };
      const result = diff(lhs, rhs, { ignorePaths: ['settings.*'] });
      expect(result).toEqual([]);
    });

    it('ignores nested subtree under prefix', () => {
      const lhs = { config: { db: { host: 'localhost', port: 5432 } } };
      const rhs = { config: { db: { host: 'remote', port: 3306 } } };
      const result = diff(lhs, rhs, { ignorePaths: ['config.*'] });
      expect(result).toEqual([]);
    });

    it('does not ignore the prefix key itself when it changes type', () => {
      const lhs = { settings: { a: 1 }, other: 'x' };
      const rhs = { settings: 'flat', other: 'x' };
      // settings itself is changed (object → string); prefix.* won't suppress the parent
      const result = diff(lhs, rhs, { ignorePaths: ['settings.*'] });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: 'changed', path: 'settings' });
    });
  });

  // ── Multiple patterns combined ───────────────────────────────────────

  describe('multiple patterns combined', () => {
    it('applies all patterns simultaneously', () => {
      const lhs = {
        id: 1,
        name: 'Alice',
        meta: { type: 'user', version: 1 },
        settings: { theme: 'dark', lang: 'en' },
        score: 100,
      };
      const rhs = {
        id: 999,
        name: 'Bob',
        meta: { type: 'admin', version: 2 },
        settings: { theme: 'light', lang: 'fr' },
        score: 200,
      };
      const result = diff(lhs, rhs, {
        ignorePaths: ['**.id', '*.type', 'settings.*'],
      });
      // Ignored: id (top, **.id), meta.type (*.type), settings.theme, settings.lang (settings.*)
      // Remaining: name, meta.version, score
      expect(result).toHaveLength(3);
      const paths = result.map((c: DiffChange) => c.path).sort();
      expect(paths).toEqual(['meta.version', 'name', 'score']);
    });

    it('handles overlapping patterns (both * and **)', () => {
      const lhs = { type: 'a', data: { type: 'b' } };
      const rhs = { type: 'x', data: { type: 'y' } };
      // *.type ignores data.type; **.type ignores both
      const starOnly = diff(lhs, rhs, { ignorePaths: ['*.type'] });
      const dstarOnly = diff(lhs, rhs, { ignorePaths: ['**.type'] });
      expect(starOnly).toHaveLength(1); // top-level 'type' still shows
      expect(dstarOnly).toHaveLength(0);
    });
  });

  // ── Arrays ───────────────────────────────────────────────────────────

  describe('arrays', () => {
    it('ignores paths inside array elements (ordered)', () => {
      const lhs = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };
      const rhs = { items: [{ id: 99, name: 'a' }, { id: 99, name: 'b' }] };
      const result = diff(lhs, rhs, { ignorePaths: ['**.id'] });
      expect(result).toEqual([]);
    });

    it('ignores specific array element path', () => {
      const lhs = [10, 20, 30];
      const rhs = [10, 99, 30];
      const result = diff(lhs, rhs, { ignorePaths: ['[1]'] });
      expect(result).toEqual([]);
    });

    it('ignores nested field in array with *.suffix', () => {
      const lhs = { users: [{ name: 'A', role: 'admin' }, { name: 'B', role: 'user' }] };
      const rhs = { users: [{ name: 'A', role: 'superadmin' }, { name: 'B', role: 'moderator' }] };
      const result = diff(lhs, rhs, { ignorePaths: ['*.role'] });
      expect(result).toEqual([]);
    });

    it('preserves non-ignored changes in arrays', () => {
      const lhs = { items: [{ id: 1, value: 'old' }, { id: 2, value: 'keep' }] };
      const rhs = { items: [{ id: 99, value: 'new' }, { id: 99, value: 'keep' }] };
      const result = diff(lhs, rhs, { ignorePaths: ['**.id'] });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: 'changed', path: 'items[0].value' });
    });

    it('ignores added array elements at specific index', () => {
      const lhs = { tags: ['a', 'b'] };
      const rhs = { tags: ['a', 'b', 'c'] };
      const result = diff(lhs, rhs, { ignorePaths: ['tags[2]'] });
      expect(result).toEqual([]);
    });

    it('handles nested arrays with deep ignore', () => {
      const lhs = { matrix: [[1, 2], [3, 4]] };
      const rhs = { matrix: [[1, 99], [3, 4]] };
      const result = diff(lhs, rhs, { ignorePaths: ['matrix[0][1]'] });
      expect(result).toEqual([]);
    });
  });

  // ── Additions and removals ───────────────────────────────────────────

  describe('additions and removals', () => {
    it('ignores added keys that match pattern', () => {
      const lhs = { name: 'Alice' } as Record<string, unknown>;
      const rhs = { name: 'Alice', type: 'user' };
      const result = diff(lhs, rhs, { ignorePaths: ['type'] });
      expect(result).toEqual([]);
    });

    it('ignores removed keys that match pattern', () => {
      const lhs = { name: 'Alice', type: 'user' };
      const rhs = { name: 'Alice' } as Record<string, unknown>;
      const result = diff(lhs, rhs, { ignorePaths: ['type'] });
      expect(result).toEqual([]);
    });

    it('ignores added nested key with *.suffix', () => {
      const lhs = { data: { name: 'a' } } as Record<string, unknown>;
      const rhs = { data: { name: 'a', type: 'new' } };
      const result = diff(lhs, rhs, { ignorePaths: ['*.type'] });
      expect(result).toEqual([]);
    });

    it('ignores removed nested key with **.suffix', () => {
      const lhs = { data: { id: 1, name: 'a' } };
      const rhs = { data: { name: 'a' } } as Record<string, unknown>;
      const result = diff(lhs, rhs, { ignorePaths: ['**.id'] });
      expect(result).toEqual([]);
    });

    it('keeps non-ignored additions and removals', () => {
      const lhs = { a: 1, b: 2 } as Record<string, unknown>;
      const rhs = { a: 1, c: 3 } as Record<string, unknown>;
      const result = diff(lhs, rhs, { ignorePaths: ['b'] });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: 'added', path: 'c', rhs: 3 });
    });
  });

  // ── Interaction with other options ───────────────────────────────────

  describe('interaction with other options', () => {
    it('works with includeUnchanged', () => {
      const lhs = { a: 1, b: 2, c: 3 };
      const rhs = { a: 1, b: 99, c: 3 };
      const result = diff(lhs, rhs, { ignorePaths: ['b'], includeUnchanged: true });
      // b is fully ignored (not even "unchanged"); a and c are unchanged
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'unchanged', path: 'a' }),
        expect.objectContaining({ kind: 'unchanged', path: 'c' }),
      ]));
    });

    it('works with maxDepth', () => {
      const lhs = { a: { b: { c: 1 } }, x: 1 };
      const rhs = { a: { b: { c: 2 } }, x: 2 };
      const result = diff(lhs, rhs, { ignorePaths: ['x'], maxDepth: 3 });
      expect(result).toEqual([
        expect.objectContaining({ kind: 'changed', path: 'a.b.c' }),
      ]);
    });

    it('works with filter (ignorePaths takes priority before filter)', () => {
      const lhs = { a: 1, b: 2, c: 3 };
      const rhs = { a: 10, b: 20, c: 30 };
      // filter includes root, a and b; ignorePaths removes b
      const result = diff(lhs, rhs, {
        ignorePaths: ['b'],
        filter: (path) => !path || path === 'a' || path === 'b',
      });
      expect(result).toEqual([
        expect.objectContaining({ kind: 'changed', path: 'a' }),
      ]);
    });

    it('works with expandJsonStrings', () => {
      const lhs = { data: '{"id":1,"name":"Alice"}' };
      const rhs = { data: '{"id":99,"name":"Alice"}' };
      const result = diff(lhs, rhs, { expandJsonStrings: true, ignorePaths: ['**.id'] });
      expect(result).toEqual([]);
    });

    it('works with custom isEqual', () => {
      const lhs = { a: 1, b: 'HELLO' };
      const rhs = { a: 1, b: 'hello' };
      // Case-insensitive equality for strings
      const result = diff(lhs, rhs, {
        ignorePaths: ['a'],
        isEqual: (l, r) => {
          if (typeof l === 'string' && typeof r === 'string') return l.toLowerCase() === r.toLowerCase();
          return Object.is(l, r);
        },
      });
      expect(result).toEqual([]);
    });

    it('works with arrayOrderMatters=false', () => {
      const lhs = { tags: [{ id: 1, v: 'a' }, { id: 2, v: 'b' }] };
      const rhs = { tags: [{ id: 2, v: 'b' }, { id: 3, v: 'a' }] };
      // id changes are ignored; unordered means it tries to match elements
      const result = diff(lhs, rhs, {
        ignorePaths: ['**.id'],
        arrayOrderMatters: false,
      });
      // { id: 2, v: 'b' } matches in both; { id: 1, v: 'a' } matches { id: 3, v: 'a' } (only id differs, ignored)
      // But unordered matching uses deepEqual before ignore applies, so they might not match
      // The key point: ignorePaths suppresses id-related changes from the output
      const idChanges = result.filter((c: DiffChange) => c.path.endsWith('.id') || c.path === 'id');
      expect(idChanges).toEqual([]);
    });
  });

  // ── Output formats with ignorePaths ──────────────────────────────────

  describe('output formats', () => {
    const lhs = { id: 1, name: 'Alice', meta: { id: 10, role: 'user' } };
    const rhs = { id: 2, name: 'Bob', meta: { id: 20, role: 'admin' } };
    const ignorePaths = ['**.id'];

    it('works with flat format', () => {
      const result = diff(lhs, rhs, { ignorePaths, format: 'flat' });
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty(['meta.role']);
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('meta.id');
    });

    it('works with nested format', () => {
      const result = diff(lhs, rhs, { ignorePaths, format: 'nested' });
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('meta');
      expect(result).not.toHaveProperty('id');
      expect((result as any).meta.children).not.toHaveProperty('id');
    });

    it('works with patch format', () => {
      const result = diff(lhs, rhs, { ignorePaths, format: 'patch' });
      const paths = result.map((op) => op.path);
      expect(paths).toContain('/name');
      expect(paths).toContain('/meta/role');
      expect(paths).not.toContain('/id');
      expect(paths).not.toContain('/meta/id');
    });

    it('works with custom formatter', () => {
      const formatter = (changes: DiffChange[]) => changes.map((c) => c.path);
      const result = diff(lhs, rhs, { ignorePaths, format: formatter });
      expect(result).toContain('name');
      expect(result).toContain('meta.role');
      expect(result).not.toContain('id');
      expect(result).not.toContain('meta.id');
    });
  });

  // ── Convenience functions ────────────────────────────────────────────

  describe('convenience functions', () => {
    it('hasDiff returns false when all diffs are ignored', () => {
      const lhs = { id: 1, name: 'Alice' };
      const rhs = { id: 2, name: 'Alice' };
      expect(hasDiff(lhs, rhs, { ignorePaths: ['id'] })).toBe(false);
    });

    it('hasDiff returns true when non-ignored diffs exist', () => {
      const lhs = { id: 1, name: 'Alice' };
      const rhs = { id: 2, name: 'Bob' };
      expect(hasDiff(lhs, rhs, { ignorePaths: ['id'] })).toBe(true);
    });

    it('addedDiff excludes ignored additions', () => {
      const lhs = { a: 1 } as Record<string, unknown>;
      const rhs = { a: 1, b: 2, c: 3 };
      const result = addedDiff(lhs, rhs, { ignorePaths: ['b'] });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: 'added', path: 'c' });
    });

    it('removedDiff excludes ignored removals', () => {
      const lhs = { a: 1, b: 2, c: 3 };
      const rhs = { a: 1 } as Record<string, unknown>;
      const result = removedDiff(lhs, rhs, { ignorePaths: ['b'] });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: 'removed', path: 'c' });
    });

    it('changedDiff excludes ignored changes', () => {
      const lhs = { a: 1, b: 2, c: 3 };
      const rhs = { a: 10, b: 20, c: 30 };
      const result = changedDiff(lhs, rhs, { ignorePaths: ['a', 'b'] });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: 'changed', path: 'c' });
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('empty ignorePaths array behaves like no option', () => {
      const lhs = { a: 1 };
      const rhs = { a: 2 };
      const withEmpty = diff(lhs, rhs, { ignorePaths: [] });
      const without = diff(lhs, rhs);
      expect(withEmpty).toEqual(without);
    });

    it('ignoring all paths produces empty result', () => {
      const lhs = { a: 1, b: 2 };
      const rhs = { a: 10, b: 20 };
      const result = diff(lhs, rhs, { ignorePaths: ['a', 'b'] });
      expect(result).toEqual([]);
    });

    it('ignoring non-existent paths has no effect', () => {
      const lhs = { a: 1 };
      const rhs = { a: 2 };
      const result = diff(lhs, rhs, { ignorePaths: ['nonexistent', '**.missing', 'x.*'] });
      expect(result).toEqual([
        expect.objectContaining({ kind: 'changed', path: 'a' }),
      ]);
    });

    it('handles objects with many keys and selective ignoring', () => {
      const lhs: Record<string, number> = {};
      const rhs: Record<string, number> = {};
      for (let i = 0; i < 50; i++) {
        lhs[`key${i}`] = i;
        rhs[`key${i}`] = i * 10;
      }
      const ignoreEvens = Array.from({ length: 25 }, (_, i) => `key${i * 2}`);
      const result = diff(lhs, rhs, { ignorePaths: ignoreEvens });
      // Only odd keys should appear
      expect(result).toHaveLength(25);
      for (const change of result as DiffChange[]) {
        const num = parseInt(change.path.replace('key', ''), 10);
        expect(num % 2).toBe(1);
      }
    });

    it('handles deeply nested structure (6 levels) with **.suffix', () => {
      const lhs = { a: { b: { c: { d: { e: { f: { id: 1, val: 'x' } } } } } } };
      const rhs = { a: { b: { c: { d: { e: { f: { id: 999, val: 'x' } } } } } } };
      const result = diff(lhs, rhs, { ignorePaths: ['**.id'] });
      expect(result).toEqual([]);
    });

    it('wildcards do not interfere with literal dots in segment names', () => {
      // If a key literally contains a dot (unusual but possible via bracket access)
      // The path built would be a normal dot-separated path, so patterns work on segments
      const lhs = { config: { 'api.url': 'http://old', 'api.key': 'abc' } };
      const rhs = { config: { 'api.url': 'http://new', 'api.key': 'abc' } };
      // path is "config.api.url" — *.url would match
      const result = diff(lhs, rhs, { ignorePaths: ['*.url'] });
      expect(result).toEqual([]);
    });

    it('handles null and undefined values with ignore', () => {
      const lhs = { a: null, b: undefined, c: 1 } as Record<string, unknown>;
      const rhs = { a: 'defined', b: 'defined', c: 1 } as Record<string, unknown>;
      const result = diff(lhs, rhs, { ignorePaths: ['a', 'b'] });
      expect(result).toEqual([]);
    });

    it('handles boolean and numeric values', () => {
      const lhs = { active: true, count: 0 };
      const rhs = { active: false, count: 100 };
      const result = diff(lhs, rhs, { ignorePaths: ['active'] });
      expect(result).toEqual([
        expect.objectContaining({ kind: 'changed', path: 'count' }),
      ]);
    });

    it('handles Date values with ignore', () => {
      const lhs = { created: new Date('2025-01-01'), name: 'old' };
      const rhs = { created: new Date('2026-01-01'), name: 'new' };
      const result = diff(lhs, rhs, { ignorePaths: ['created'] });
      expect(result).toEqual([
        expect.objectContaining({ kind: 'changed', path: 'name' }),
      ]);
    });
  });

  // ── Complex real-world scenarios ─────────────────────────────────────

  describe('complex real-world scenarios', () => {
    it('API response diffing — ignore metadata', () => {
      const oldResponse = {
        data: {
          users: [
            { id: 'u1', name: 'Alice', createdAt: '2025-01-01', updatedAt: '2025-06-01' },
            { id: 'u2', name: 'Bob', createdAt: '2025-02-01', updatedAt: '2025-06-01' },
          ],
        },
        meta: { requestId: 'req-001', duration: 120 },
      };
      const newResponse = {
        data: {
          users: [
            { id: 'u1', name: 'Alice', createdAt: '2025-01-01', updatedAt: '2026-01-15' },
            { id: 'u2', name: 'Robert', createdAt: '2025-02-01', updatedAt: '2026-01-15' },
          ],
        },
        meta: { requestId: 'req-002', duration: 95 },
      };
      const result = diff(oldResponse, newResponse, {
        ignorePaths: ['**.updatedAt', '**.createdAt', 'meta.*'],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        kind: 'changed',
        path: 'data.users[1].name',
        lhs: 'Bob',
        rhs: 'Robert',
      });
    });

    it('config diffing — ignore volatile fields', () => {
      const oldConfig = {
        version: '1.0.0',
        build: { hash: 'abc123', timestamp: 1700000000 },
        features: { darkMode: true, beta: false },
        logging: { level: 'info', destination: 'stdout' },
      };
      const newConfig = {
        version: '1.1.0',
        build: { hash: 'def456', timestamp: 1710000000 },
        features: { darkMode: true, beta: true },
        logging: { level: 'debug', destination: 'stdout' },
      };
      const result = diff(oldConfig, newConfig, {
        ignorePaths: ['version', 'build.*'],
      });
      expect(result).toHaveLength(2);
      const paths = (result as DiffChange[]).map((c) => c.path).sort();
      expect(paths).toEqual(['features.beta', 'logging.level']);
    });

    it('database record diffing — ignore auto-generated fields', () => {
      const oldRecord = {
        _id: '507f1f77bcf86cd799439011',
        __v: 0,
        data: { name: 'Product A', price: 29.99, category: { _id: 'cat1', name: 'Electronics' } },
        timestamps: { created: '2025-01-01', modified: '2025-06-01' },
      };
      const newRecord = {
        _id: '507f1f77bcf86cd799439011',
        __v: 3,
        data: { name: 'Product A+', price: 34.99, category: { _id: 'cat1', name: 'Electronics' } },
        timestamps: { created: '2025-01-01', modified: '2026-02-17' },
      };
      const result = diff(oldRecord, newRecord, {
        ignorePaths: ['**._id', '__v', 'timestamps.*'],
      });
      expect(result).toHaveLength(2);
      const paths = (result as DiffChange[]).map((c) => c.path).sort();
      expect(paths).toEqual(['data.name', 'data.price']);
    });

    it('deployment manifest comparison — ignore annotations', () => {
      const oldManifest = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'my-app',
          namespace: 'production',
          annotations: {
            'kubectl.kubernetes.io/last-applied': '...',
            'deployment.kubernetes.io/revision': '5',
          },
          labels: { app: 'my-app', version: 'v1' },
        },
        spec: { replicas: 3, image: 'my-app:1.0' },
      };
      const newManifest = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'my-app',
          namespace: 'production',
          annotations: {
            'kubectl.kubernetes.io/last-applied': '... different ...',
            'deployment.kubernetes.io/revision': '6',
          },
          labels: { app: 'my-app', version: 'v2' },
        },
        spec: { replicas: 5, image: 'my-app:2.0' },
      };
      const result = diff(oldManifest, newManifest, {
        ignorePaths: ['metadata.annotations.*'],
      });
      const paths = (result as DiffChange[]).map((c) => c.path).sort();
      expect(paths).toEqual([
        'metadata.labels.version',
        'spec.image',
        'spec.replicas',
      ]);
    });

    it('event log comparison — ignore volatile timestamps and request IDs', () => {
      const oldEvents = {
        events: [
          { type: 'click', target: 'btn-a', timestamp: 1000, requestId: 'r1' },
          { type: 'click', target: 'btn-b', timestamp: 2000, requestId: 'r2' },
        ],
      };
      const newEvents = {
        events: [
          { type: 'click', target: 'btn-a', timestamp: 9000, requestId: 'r9' },
          { type: 'hover', target: 'btn-b', timestamp: 9500, requestId: 'r10' },
        ],
      };
      const result = diff(oldEvents, newEvents, {
        ignorePaths: ['**.timestamp', '**.requestId'],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        kind: 'changed',
        path: 'events[1].type',
        lhs: 'click',
        rhs: 'hover',
      });
    });

    it('form state comparison with mixed ignore patterns', () => {
      const saved = {
        form: {
          personal: { firstName: 'John', lastName: 'Doe', _dirty: false, _touched: false },
          address: { city: 'NYC', zip: '10001', _dirty: false, _touched: false },
          preferences: { newsletter: true, _dirty: false, _touched: false },
        },
        _meta: { lastSaved: '2025-01-01', version: 1 },
      };
      const current = {
        form: {
          personal: { firstName: 'John', lastName: 'Smith', _dirty: true, _touched: true },
          address: { city: 'LA', zip: '90001', _dirty: true, _touched: true },
          preferences: { newsletter: false, _dirty: true, _touched: true },
        },
        _meta: { lastSaved: '2026-02-17', version: 2 },
      };
      const result = diff(saved, current, {
        ignorePaths: ['**._dirty', '**._touched', '_meta.*'],
      });
      const paths = (result as DiffChange[]).map((c) => c.path).sort();
      expect(paths).toEqual([
        'form.address.city',
        'form.address.zip',
        'form.personal.lastName',
        'form.preferences.newsletter',
      ]);
    });

    it('large nested structure with selective field suppression', () => {
      // Simulate a response with many entities each having an id and audit fields
      const makeEntity = (id: number, name: string, audit: string) => ({
        id, name, audit: { createdBy: audit, modifiedBy: audit },
      });
      const lhs = {
        departments: [
          { id: 1, name: 'Engineering', members: [makeEntity(10, 'Alice', 'sys'), makeEntity(11, 'Bob', 'sys')] },
          { id: 2, name: 'Design', members: [makeEntity(20, 'Carol', 'sys')] },
        ],
      };
      const rhs = {
        departments: [
          { id: 1, name: 'Engineering', members: [makeEntity(10, 'Alice', 'admin'), makeEntity(11, 'Bobby', 'admin')] },
          { id: 2, name: 'Creative', members: [makeEntity(20, 'Carol', 'admin')] },
        ],
      };
      const result = diff(lhs, rhs, {
        ignorePaths: ['**.id', '**.audit'],
      });
      const paths = (result as DiffChange[]).map((c) => c.path).sort();
      expect(paths).toEqual([
        'departments[0].members[1].name',
        'departments[1].name',
      ]);
    });
  });
});
