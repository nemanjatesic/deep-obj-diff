import { isPlainObject, isArray, isPrimitive, buildPath, allKeys, defaultIsEqual } from '../src/utils';

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('returns false for non-plain objects', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(/abc/)).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject('string')).toBe(false);
  });
});

describe('isArray', () => {
  it('returns true for arrays', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2])).toBe(true);
  });

  it('returns false for non-arrays', () => {
    expect(isArray({})).toBe(false);
    expect(isArray('string')).toBe(false);
    expect(isArray(null)).toBe(false);
  });
});

describe('isPrimitive', () => {
  it('returns true for primitives', () => {
    expect(isPrimitive(1)).toBe(true);
    expect(isPrimitive('str')).toBe(true);
    expect(isPrimitive(true)).toBe(true);
    expect(isPrimitive(null)).toBe(true);
    expect(isPrimitive(undefined)).toBe(true);
    expect(isPrimitive(Symbol())).toBe(true);
  });

  it('returns false for objects', () => {
    expect(isPrimitive({})).toBe(false);
    expect(isPrimitive([])).toBe(false);
    expect(isPrimitive(new Date())).toBe(false);
  });
});

describe('buildPath', () => {
  it('builds dot-notation paths', () => {
    expect(buildPath('', 'a')).toBe('a');
    expect(buildPath('a', 'b')).toBe('a.b');
    expect(buildPath('a.b', 'c')).toBe('a.b.c');
  });

  it('builds array-index paths', () => {
    expect(buildPath('', 0)).toBe('[0]');
    expect(buildPath('a', 0)).toBe('a[0]');
    expect(buildPath('a[0]', 1)).toBe('a[0][1]');
  });
});

describe('allKeys', () => {
  it('returns union of keys from both objects', () => {
    const keys = allKeys({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(keys.sort()).toEqual(['a', 'b', 'c']);
  });

  it('handles empty objects', () => {
    expect(allKeys({}, {})).toEqual([]);
    expect(allKeys({ a: 1 }, {})).toEqual(['a']);
  });
});

describe('defaultIsEqual', () => {
  it('uses Object.is semantics', () => {
    expect(defaultIsEqual(1, 1)).toBe(true);
    expect(defaultIsEqual(NaN, NaN)).toBe(true);
    expect(defaultIsEqual(+0, -0)).toBe(false);
    expect(defaultIsEqual(null, undefined)).toBe(false);
    expect(defaultIsEqual('a', 'a')).toBe(true);
  });
});
