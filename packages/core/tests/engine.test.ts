import { _deepEqual } from '../src/engine';

describe('deepEqual (internal)', () => {
  it('handles identical primitives', () => {
    expect(_deepEqual(1, 1)).toBe(true);
    expect(_deepEqual('a', 'a')).toBe(true);
    expect(_deepEqual(null, null)).toBe(true);
  });

  it('handles different primitives', () => {
    expect(_deepEqual(1, 2)).toBe(false);
    expect(_deepEqual('a', 'b')).toBe(false);
    expect(_deepEqual(null, undefined)).toBe(false);
  });

  it('handles NaN', () => {
    expect(_deepEqual(NaN, NaN)).toBe(true);
  });

  it('handles plain objects', () => {
    expect(_deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(_deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(_deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('handles nested objects', () => {
    expect(_deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(_deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it('handles arrays', () => {
    expect(_deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(_deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(_deepEqual([1, 2, 3], [1, 3, 2])).toBe(false);
  });

  it('handles arrays vs objects', () => {
    expect(_deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it('handles Dates', () => {
    expect(_deepEqual(new Date('2025-01-01'), new Date('2025-01-01'))).toBe(true);
    expect(_deepEqual(new Date('2025-01-01'), new Date('2025-06-01'))).toBe(false);
  });

  it('handles RegExp', () => {
    expect(_deepEqual(/abc/gi, /abc/gi)).toBe(true);
    expect(_deepEqual(/abc/, /def/)).toBe(false);
  });

  it('handles type mismatches', () => {
    expect(_deepEqual(1, '1')).toBe(false);
    expect(_deepEqual(true, 1)).toBe(false);
    expect(_deepEqual(null, 0)).toBe(false);
  });
});
