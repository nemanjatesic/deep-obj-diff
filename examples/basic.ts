/**
 * Basic usage examples for deep-obj-diff
 *
 * Run: npx ts-node examples/basic.ts
 */
import { diff, hasDiff, addedDiff, removedDiff, changedDiff, DiffKind } from 'deep-obj-diff';

// ─── 1. Simple object comparison ─────────────────────────────────────────────

const original = { name: 'Alice', age: 30, city: 'NYC' };
const updated = { name: 'Alice', age: 31, country: 'US' };

const changes = diff(original, updated);
console.log('=== Simple object diff ===');
console.log(changes);
// [
//   { kind: 'changed', path: 'age', lhs: 30, rhs: 31 },
//   { kind: 'removed', path: 'city', lhs: 'NYC' },
//   { kind: 'added',   path: 'country', rhs: 'US' },
// ]

// ─── 2. Nested object comparison ─────────────────────────────────────────────

const configV1 = {
  database: { host: 'localhost', port: 5432, ssl: false },
  cache: { ttl: 300, maxSize: 1000 },
};

const configV2 = {
  database: { host: 'db.prod.com', port: 5432, ssl: true },
  cache: { ttl: 600, maxSize: 1000 },
  logging: { level: 'info' },
};

console.log('\n=== Nested object diff ===');
console.log(diff(configV1, configV2));
// [
//   { kind: 'changed', path: 'database.host', lhs: 'localhost', rhs: 'db.prod.com' },
//   { kind: 'changed', path: 'database.ssl',  lhs: false,       rhs: true },
//   { kind: 'changed', path: 'cache.ttl',     lhs: 300,         rhs: 600 },
//   { kind: 'added',   path: 'logging',       rhs: { level: 'info' } },
// ]

// ─── 3. Array comparison ─────────────────────────────────────────────────────

const tasksV1 = { tasks: ['build', 'test', 'deploy'] };
const tasksV2 = { tasks: ['build', 'lint', 'test', 'deploy'] };

console.log('\n=== Array diff (ordered) ===');
console.log(diff(tasksV1, tasksV2));
// Elements shifted: test→lint, deploy→test, +deploy at [3]

// ─── 4. Quick boolean check ─────────────────────────────────────────────────

console.log('\n=== hasDiff ===');
console.log('Same objects:', hasDiff({ x: 1 }, { x: 1 }));   // false
console.log('Different:',   hasDiff({ x: 1 }, { x: 2 }));    // true

// ─── 5. Filtered diffs ──────────────────────────────────────────────────────

console.log('\n=== Convenience helpers ===');
const before = { a: 1, b: 2, c: 3 };
const after = { a: 10, c: 3, d: 4 };

console.log('Added:',   addedDiff(before, after));    // [{ kind:'added', path:'d', rhs:4 }]
console.log('Removed:', removedDiff(before, after));  // [{ kind:'removed', path:'b', lhs:2 }]
console.log('Changed:', changedDiff(before, after));  // [{ kind:'changed', path:'a', lhs:1, rhs:10 }]

// ─── 6. Include unchanged values ─────────────────────────────────────────────

console.log('\n=== Include unchanged ===');
const result = diff({ a: 1, b: 2 }, { a: 1, b: 99 }, { includeUnchanged: true });
console.log(result);
// [
//   { kind: 'unchanged', path: 'a', lhs: 1, rhs: 1 },
//   { kind: 'changed',   path: 'b', lhs: 2, rhs: 99 },
// ]

// ─── 7. Using DiffKind enum ─────────────────────────────────────────────────

console.log('\n=== Using DiffKind enum ===');
const allChanges = diff(
  { x: 1, y: 2, z: 3 },
  { x: 1, y: 20, w: 4 },
);
for (const change of allChanges) {
  switch (change.kind) {
    case DiffKind.Added:
      console.log(`+ ${change.path} = ${JSON.stringify(change.rhs)}`);
      break;
    case DiffKind.Removed:
      console.log(`- ${change.path} (was ${JSON.stringify(change.lhs)})`);
      break;
    case DiffKind.Changed:
      console.log(`~ ${change.path}: ${JSON.stringify(change.lhs)} → ${JSON.stringify(change.rhs)}`);
      break;
  }
}
// ~ y: 2 → 20
// - z (was 3)
// + w = 4
