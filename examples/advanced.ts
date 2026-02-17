/**
 * Advanced customization examples for deep-obj-diff
 *
 * Run: npx ts-node examples/advanced.ts
 */
import { diff, DiffChange } from 'deep-obj-diff';

// ─── 1. Path Filtering ──────────────────────────────────────────────────────

console.log('=== Path filtering: only "settings" subtree ===');
const app1 = {
  user: { name: 'Alice', role: 'admin' },
  settings: { theme: 'dark', fontSize: 14 },
  metadata: { version: 2 },
};
const app2 = {
  user: { name: 'Bob', role: 'admin' },
  settings: { theme: 'light', fontSize: 16 },
  metadata: { version: 3 },
};

const settingsOnly = diff(app1, app2, {
  filter: (path) => path === '' || path.startsWith('settings'),
});
console.log(settingsOnly);
// Only shows settings.theme and settings.fontSize changes

// ─── 2. Exclude sensitive fields ─────────────────────────────────────────────

console.log('\n=== Filter: exclude sensitive fields ===');
const user1 = { name: 'Alice', email: 'alice@example.com', password: 'hash1', token: 'abc' };
const user2 = { name: 'Alice', email: 'alice@new.com', password: 'hash2', token: 'xyz' };

const sensitiveFields = new Set(['password', 'token']);
const safeDiff = diff(user1, user2, {
  filter: (path) => !sensitiveFields.has(path),
});
console.log(safeDiff);
// Only shows email change, password and token are excluded

// ─── 3. Custom equality: numeric tolerance ───────────────────────────────────

console.log('\n=== Custom equality: epsilon comparison for floats ===');
const measurements1 = { temp: 36.6, pressure: 101.324999 };
const measurements2 = { temp: 36.7, pressure: 101.325001 };

const withTolerance = diff(measurements1, measurements2, {
  isEqual: (a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 0.001; // tolerance of 0.001
    }
    return Object.is(a, b);
  },
});
console.log(withTolerance);
// Only temp shows as changed; pressure is within tolerance

// ─── 4. Custom equality: case-insensitive strings ────────────────────────────

console.log('\n=== Custom equality: case-insensitive strings ===');
const form1 = { firstName: 'Alice', lastName: 'Smith', age: 30 };
const form2 = { firstName: 'ALICE', lastName: 'smith', age: 31 };

const caseInsensitive = diff(form1, form2, {
  isEqual: (a, b) => {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }
    return Object.is(a, b);
  },
});
console.log(caseInsensitive);
// Only age shows as changed; names match case-insensitively

// ─── 5. Depth limiting ──────────────────────────────────────────────────────

console.log('\n=== Depth limiting ===');
const deep1 = {
  level1: {
    level2: {
      level3: { value: 'old' },
    },
  },
};
const deep2 = {
  level1: {
    level2: {
      level3: { value: 'new' },
    },
  },
};

console.log('maxDepth=Infinity:', diff(deep1, deep2).map((c) => c.path));
// ['level1.level2.level3.value']

console.log('maxDepth=2:', diff(deep1, deep2, { maxDepth: 2 }).map((c) => c.path));
// ['level1.level2'] – stops at depth 2, reports object as changed

console.log('maxDepth=1:', diff(deep1, deep2, { maxDepth: 1 }).map((c) => c.path));
// ['level1'] – stops at depth 1

// ─── 6. Unordered arrays (set-like comparison) ──────────────────────────────

console.log('\n=== Unordered array comparison ===');
const permissions1 = { roles: ['read', 'write', 'admin'] };
const permissions2 = { roles: ['admin', 'read', 'write'] };

console.log('Ordered (default):', diff(permissions1, permissions2));
// Shows changes at every shifted index

console.log('Unordered:', diff(permissions1, permissions2, { arrayOrderMatters: false }));
// [] – same elements, order doesn't matter

// ─── 7. Unordered arrays with complex objects ───────────────────────────────

console.log('\n=== Unordered arrays with objects ===');
const team1 = {
  members: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ],
};
const team2 = {
  members: [
    { id: 2, name: 'Bob' },
    { id: 1, name: 'Alice' },
    { id: 3, name: 'Charlie' },
  ],
};

const teamDiff = diff(team1, team2, { arrayOrderMatters: false });
console.log(teamDiff);
// Only shows Charlie as added

// ─── 8. Combining options ───────────────────────────────────────────────────

console.log('\n=== Combined: filter + custom equality + patch output ===');
const doc1 = {
  title: 'Hello World',
  body: 'Some content here',
  meta: { author: 'alice', views: 100.0001, draft: true },
  _internal: { checksum: 'abc123' },
};
const doc2 = {
  title: 'hello world',
  body: 'Updated content here',
  meta: { author: 'alice', views: 100.0002, draft: false },
  _internal: { checksum: 'def456' },
};

const combined = diff(doc1, doc2, {
  format: 'patch',
  filter: (path) => !path.startsWith('_internal'), // skip internal fields
  isEqual: (a, b, path) => {
    // Case-insensitive for title
    if (path === 'title' && typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }
    // Tolerance for numeric fields
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 0.01;
    }
    return Object.is(a, b);
  },
});
console.log(combined);
// Only body and meta.draft show — title matches case-insensitively,
// views within tolerance, _internal is filtered out

// ─── 9. Generating a human-readable report ──────────────────────────────────

console.log('\n=== Custom formatter: human-readable report ===');
const report = diff(app1, app2, {
  format: (changes: DiffChange[]) => {
    const lines: string[] = ['Change Report', '='.repeat(40)];
    for (const c of changes) {
      switch (c.kind) {
        case 'added':
          lines.push(`[+] "${c.path}" was added with value: ${JSON.stringify(c.rhs)}`);
          break;
        case 'removed':
          lines.push(`[-] "${c.path}" was removed (had value: ${JSON.stringify(c.lhs)})`);
          break;
        case 'changed':
          lines.push(`[~] "${c.path}" changed from ${JSON.stringify(c.lhs)} to ${JSON.stringify(c.rhs)}`);
          break;
      }
    }
    lines.push('='.repeat(40));
    return lines.join('\n');
  },
});
console.log(report);
