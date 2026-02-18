# deep-obj-diff

A **zero-dependency**, fully typed deep object diffing library for JavaScript and TypeScript.

## Features

- Zero runtime dependencies
- Written in TypeScript with full type exports
- Multiple output formats: list, flat, nested, JSON Patch, or custom
- Convenience helpers: `hasDiff`, `addedDiff`, `removedDiff`, `changedDiff`
- Path filtering, custom equality, depth limits, unordered arrays
- Handles edge cases: `NaN`, `±0`, `Date`, `RegExp`, `null`/`undefined`

## Installation

```bash
npm install deep-obj-diff
```

## Quick Start

```ts
import { diff } from 'deep-obj-diff';

const original = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
const updated  = { a: 1, b: { c: 9 }, d: [1, 2], e: 'new' };

const changes = diff(original, updated);
// [
//   { kind: 'changed', path: 'b.c', lhs: 2, rhs: 9 },
//   { kind: 'removed', path: 'd[2]', lhs: 3 },
//   { kind: 'added',   path: 'e',    rhs: 'new' },
// ]
```

## Common Use Cases

### Compare configuration versions

```ts
const configV1 = {
  database: { host: 'localhost', port: 5432, ssl: false },
  cache: { ttl: 300 },
};

const configV2 = {
  database: { host: 'db.prod.com', port: 5432, ssl: true },
  cache: { ttl: 600 },
  logging: { level: 'info' },
};

diff(configV1, configV2);
// [
//   { kind: 'changed', path: 'database.host', lhs: 'localhost', rhs: 'db.prod.com' },
//   { kind: 'changed', path: 'database.ssl',  lhs: false, rhs: true },
//   { kind: 'changed', path: 'cache.ttl',     lhs: 300,   rhs: 600 },
//   { kind: 'added',   path: 'logging',       rhs: { level: 'info' } },
// ]
```

### Quick boolean check

```ts
import { hasDiff } from 'deep-obj-diff';

if (hasDiff(savedForm, currentForm)) {
  showUnsavedChangesWarning();
}
```

### Get only additions, removals, or modifications

```ts
import { addedDiff, removedDiff, changedDiff } from 'deep-obj-diff';

addedDiff(before, after);    // only new properties
removedDiff(before, after);  // only deleted properties
changedDiff(before, after);  // only modified values
```

### Generate JSON Patch operations

```ts
const patches = diff(lhs, rhs, { format: 'patch' });
// [{ op: 'replace', path: '/b/c', value: 9, oldValue: 2 }, ...]
```

### Flat object keyed by path

```ts
const flat = diff(lhs, rhs, { format: 'flat' });
// { 'b.c': { kind: 'changed', lhs: 2, rhs: 9 }, ... }
```

### Custom formatter

```ts
const count = diff(lhs, rhs, {
  format: (changes) => changes.length,
});
// 3
```

## Options

```ts
diff(lhs, rhs, {
  format: 'list',              // 'list' | 'flat' | 'nested' | 'patch' | custom function
  includeUnchanged: false,     // include unchanged entries in the output
  maxDepth: Infinity,          // limit recursion depth
  arrayOrderMatters: true,     // set to false to treat arrays as sets
  filter: (path) => boolean,   // include/exclude specific paths
  isEqual: (a, b) => boolean,  // custom equality for leaf values
  ignorePaths: ['meta.*'],     // glob patterns to ignore
  expandJsonStrings: false,    // parse JSON-stringified values before diffing
});
```

### Path filtering

```ts
// Only diff the "settings" subtree
diff(lhs, rhs, {
  filter: (path) => path === '' || path.startsWith('settings'),
});
```

### Custom equality (numeric tolerance)

```ts
diff(measurements1, measurements2, {
  isEqual: (a, b) => {
    if (typeof a === 'number' && typeof b === 'number')
      return Math.abs(a - b) < 0.001;
    return Object.is(a, b);
  },
});
```

### Unordered array comparison

```ts
diff([3, 1, 2], [2, 3, 1], { arrayOrderMatters: false });
// [] — no differences
```

## Types

All types are exported:

```ts
import type {
  DiffChange, DiffKind, DiffOptions, DiffResult,
  OutputFormat, FlatDiff, NestedDiff, NestedDiffNode,
  PatchOperation, PathFilter, EqualityFn, CustomFormatter,
} from 'deep-obj-diff';
```

## License

MIT
