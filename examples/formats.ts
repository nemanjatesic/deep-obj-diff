/**
 * Output format examples for deep-obj-diff
 *
 * Run: npx ts-node examples/formats.ts
 */
import { diff, DiffChange, FlatDiff, NestedDiff, PatchOperation } from '../src';

const lhs = {
  user: { name: 'Alice', age: 30 },
  settings: { theme: 'dark', notifications: true },
  tags: ['admin', 'editor'],
};

const rhs = {
  user: { name: 'Alice', age: 31 },
  settings: { theme: 'light', lang: 'en' },
  tags: ['admin', 'viewer'],
};

// ─── 1. List format (default) ────────────────────────────────────────────────

console.log('=== List format (default) ===');
const list: DiffChange[] = diff(lhs, rhs, { format: 'list' });
console.log(JSON.stringify(list, null, 2));

// ─── 2. Flat format ──────────────────────────────────────────────────────────

console.log('\n=== Flat format ===');
const flat: FlatDiff = diff(lhs, rhs, { format: 'flat' });
console.log(JSON.stringify(flat, null, 2));
// {
//   "user.age":              { "kind": "changed", "lhs": 30, "rhs": 31 },
//   "settings.theme":        { "kind": "changed", "lhs": "dark", "rhs": "light" },
//   "settings.notifications": { "kind": "removed", "lhs": true },
//   "settings.lang":         { "kind": "added", "rhs": "en" },
//   "tags[1]":               { "kind": "changed", "lhs": "editor", "rhs": "viewer" },
// }

// ─── 3. Nested format ────────────────────────────────────────────────────────

console.log('\n=== Nested format ===');
const nested: NestedDiff = diff(lhs, rhs, { format: 'nested' });
console.log(JSON.stringify(nested, null, 2));
// Mirrors the object shape with { kind, lhs?, rhs?, children? } at each node

// ─── 4. JSON Patch format ────────────────────────────────────────────────────

console.log('\n=== Patch format (RFC 6902) ===');
const patches: PatchOperation[] = diff(lhs, rhs, { format: 'patch' });
console.log(JSON.stringify(patches, null, 2));
// [
//   { "op": "replace", "path": "/user/age",              "value": 31, "oldValue": 30 },
//   { "op": "replace", "path": "/settings/theme",        "value": "light", "oldValue": "dark" },
//   { "op": "remove",  "path": "/settings/notifications", "oldValue": true },
//   { "op": "add",     "path": "/settings/lang",          "value": "en" },
//   { "op": "replace", "path": "/tags/1",                 "value": "viewer", "oldValue": "editor" },
// ]

// ─── 5. Custom formatter ─────────────────────────────────────────────────────

console.log('\n=== Custom formatter: summary string ===');
const summary: string = diff(lhs, rhs, {
  format: (changes) => {
    const added = changes.filter((c) => c.kind === 'added').length;
    const removed = changes.filter((c) => c.kind === 'removed').length;
    const changed = changes.filter((c) => c.kind === 'changed').length;
    return `${changes.length} changes: +${added} -${removed} ~${changed}`;
  },
});
console.log(summary);
// "5 changes: +1 -1 ~3"

// ─── 6. Custom formatter: changelog ──────────────────────────────────────────

console.log('\n=== Custom formatter: changelog ===');
interface ChangelogEntry {
  action: string;
  field: string;
  details: string;
}

const changelog: ChangelogEntry[] = diff(lhs, rhs, {
  format: (changes) =>
    changes.map((c) => {
      switch (c.kind) {
        case 'added':
          return { action: 'ADD', field: c.path, details: `Set to ${JSON.stringify(c.rhs)}` };
        case 'removed':
          return { action: 'DEL', field: c.path, details: `Was ${JSON.stringify(c.lhs)}` };
        case 'changed':
          return { action: 'MOD', field: c.path, details: `${JSON.stringify(c.lhs)} → ${JSON.stringify(c.rhs)}` };
        default:
          return { action: 'NOP', field: c.path, details: 'No change' };
      }
    }),
});
console.table(changelog);

// ─── 7. Custom formatter: dot-notation update map ────────────────────────────

console.log('\n=== Custom formatter: update map (for MongoDB-style $set) ===');
const updateMap: Record<string, unknown> = diff(lhs, rhs, {
  format: (changes) => {
    const map: Record<string, unknown> = {};
    for (const c of changes) {
      if (c.kind === 'added' || c.kind === 'changed') {
        map[c.path] = c.rhs;
      }
    }
    return map;
  },
});
console.log(updateMap);
// { 'user.age': 31, 'settings.theme': 'light', 'settings.lang': 'en', 'tags[1]': 'viewer' }
