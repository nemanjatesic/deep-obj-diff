import { _parsePath, _toJsonPointer, toFlat, toNested, toPatch, toList } from '../src/formatters';
import { DiffChange, DiffKind } from '../src/types';

describe('parsePath', () => {
  it('parses simple key', () => {
    expect(_parsePath('a')).toEqual(['a']);
  });

  it('parses dot-separated keys', () => {
    expect(_parsePath('a.b.c')).toEqual(['a', 'b', 'c']);
  });

  it('parses array indices', () => {
    expect(_parsePath('a[0]')).toEqual(['a', '0']);
  });

  it('parses mixed paths', () => {
    expect(_parsePath('a.b[0].c[1].d')).toEqual(['a', 'b', '0', 'c', '1', 'd']);
  });

  it('handles empty string', () => {
    expect(_parsePath('')).toEqual([]);
  });

  it('handles leading array index', () => {
    expect(_parsePath('[0]')).toEqual(['0']);
  });
});

describe('toJsonPointer', () => {
  it('converts dot paths', () => {
    expect(_toJsonPointer('a.b.c')).toBe('/a/b/c');
  });

  it('converts array indices', () => {
    expect(_toJsonPointer('a[0].b')).toBe('/a/0/b');
  });

  it('escapes tildes and slashes', () => {
    expect(_toJsonPointer('a~b.c/d')).toBe('/a~0b/c~1d');
  });
});

describe('toList', () => {
  it('returns changes as-is', () => {
    const changes: DiffChange[] = [
      { kind: DiffKind.Added, path: 'x', rhs: 1 },
    ];
    expect(toList(changes)).toBe(changes);
  });
});

describe('toFlat', () => {
  it('maps changes to keyed object', () => {
    const changes: DiffChange[] = [
      { kind: DiffKind.Changed, path: 'a', lhs: 1, rhs: 2 },
      { kind: DiffKind.Added, path: 'b', rhs: 3 },
    ];
    const flat = toFlat(changes);
    expect(flat['a']).toEqual({ kind: DiffKind.Changed, lhs: 1, rhs: 2 });
    expect(flat['b']).toEqual({ kind: DiffKind.Added, lhs: undefined, rhs: 3 });
  });
});

describe('toNested', () => {
  it('builds nested structure', () => {
    const changes: DiffChange[] = [
      { kind: DiffKind.Changed, path: 'a.b.c', lhs: 1, rhs: 2 },
      { kind: DiffKind.Added, path: 'a.d', rhs: 3 },
    ];
    const nested = toNested(changes);
    expect(nested['a'].children?.['b'].children?.['c'].kind).toBe(DiffKind.Changed);
    expect(nested['a'].children?.['d'].kind).toBe(DiffKind.Added);
  });

  it('handles empty changes', () => {
    expect(toNested([])).toEqual({});
  });
});

describe('toPatch', () => {
  it('generates add operations', () => {
    const changes: DiffChange[] = [
      { kind: DiffKind.Added, path: 'x.y', rhs: 42 },
    ];
    expect(toPatch(changes)).toEqual([
      { op: 'add', path: '/x/y', value: 42 },
    ]);
  });

  it('generates remove operations', () => {
    const changes: DiffChange[] = [
      { kind: DiffKind.Removed, path: 'a', lhs: 'old' },
    ];
    expect(toPatch(changes)).toEqual([
      { op: 'remove', path: '/a', oldValue: 'old' },
    ]);
  });

  it('generates replace operations', () => {
    const changes: DiffChange[] = [
      { kind: DiffKind.Changed, path: 'a.b', lhs: 1, rhs: 2 },
    ];
    expect(toPatch(changes)).toEqual([
      { op: 'replace', path: '/a/b', value: 2, oldValue: 1 },
    ]);
  });

  it('skips unchanged entries', () => {
    const changes: DiffChange[] = [
      { kind: DiffKind.Unchanged, path: 'x', lhs: 1, rhs: 1 },
    ];
    expect(toPatch(changes)).toEqual([]);
  });
});
