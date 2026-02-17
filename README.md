# deep-obj-diff

A **zero-dependency**, fully typed deep object diffing library for JavaScript/TypeScript with customizable output formats.

## Features

- **Zero dependencies** – no runtime dependencies for the core library
- **Fully typed** – written in TypeScript with rich generic types
- **CLI included** – compare JSON files or inline strings from the terminal
- **Multiple output formats** – list, flat, nested, JSON Patch, or custom
- **Customizable** – filters, custom equality, depth limits, array ordering
- **Convenience helpers** – `hasDiff`, `addedDiff`, `removedDiff`, `changedDiff`
- **Handles edge cases** – `NaN`, `±0`, `Date`, `RegExp`, `null`, `undefined`, circular-safe by depth limit

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

## API

### `diff(lhs, rhs, options?)`

Compare two values and return the differences.

| Parameter | Type | Description |
|-----------|------|-------------|
| `lhs` | `unknown` | The original (left-hand side) value |
| `rhs` | `unknown` | The updated (right-hand side) value |
| `options` | `DiffOptions<F>` | Optional configuration |

### Options

```ts
interface DiffOptions<F> {
  format?: F;               // Output format (default: 'list')
  includeUnchanged?: boolean; // Include unchanged entries (default: false)
  maxDepth?: number;         // Max recursion depth (default: Infinity)
  filter?: PathFilter;       // Include/exclude paths
  isEqual?: EqualityFn;      // Custom equality check
  arrayOrderMatters?: boolean; // Array comparison mode (default: true)
}
```

### Output Formats

#### `'list'` (default)

Returns an array of `DiffChange` objects:

```ts
const result = diff(lhs, rhs);
// DiffChange[] – [{ kind, path, lhs?, rhs? }, ...]
```

#### `'flat'`

Returns an object keyed by dot-path:

```ts
const result = diff(lhs, rhs, { format: 'flat' });
// { 'b.c': { kind: 'changed', lhs: 2, rhs: 9 }, ... }
```

#### `'nested'`

Returns a nested structure mirroring the object shape:

```ts
const result = diff(lhs, rhs, { format: 'nested' });
// { b: { kind: 'changed', children: { c: { kind: 'changed', lhs: 2, rhs: 9 } } } }
```

#### `'patch'`

Returns JSON Patch–style operations (RFC 6902 subset):

```ts
const result = diff(lhs, rhs, { format: 'patch' });
// [{ op: 'replace', path: '/b/c', value: 9, oldValue: 2 }, ...]
```

#### Custom Formatter

Pass a function to transform the raw change list:

```ts
const count = diff(lhs, rhs, {
  format: (changes) => changes.length,
});
// 3
```

### Convenience Functions

```ts
import { hasDiff, addedDiff, removedDiff, changedDiff } from 'deep-obj-diff';

hasDiff(lhs, rhs);       // boolean – true if any difference exists
addedDiff(lhs, rhs);     // DiffChange[] – only additions
removedDiff(lhs, rhs);   // DiffChange[] – only removals
changedDiff(lhs, rhs);   // DiffChange[] – only modifications
```

### Customization Examples

#### Path Filtering

```ts
// Only diff paths under 'config'
diff(lhs, rhs, {
  filter: (path) => path.startsWith('config'),
});
```

#### Custom Equality

```ts
// Case-insensitive string comparison
diff(lhs, rhs, {
  isEqual: (a, b) =>
    typeof a === 'string' && typeof b === 'string'
      ? a.toLowerCase() === b.toLowerCase()
      : Object.is(a, b),
});
```

#### Depth Limiting

```ts
// Only compare top 2 levels
diff(lhs, rhs, { maxDepth: 2 });
```

#### Unordered Array Comparison

```ts
// Treat arrays as sets (order doesn't matter)
diff([3, 1, 2], [2, 3, 1], { arrayOrderMatters: false });
// [] – no differences
```

## Types

All types are fully exported:

```ts
import type {
  DiffChange,
  DiffKind,
  DiffOptions,
  DiffResult,
  OutputFormat,
  FlatDiff,
  NestedDiff,
  NestedDiffNode,
  PatchOperation,
  PathFilter,
  EqualityFn,
  CustomFormatter,
} from 'deep-obj-diff';
```

## Development

```bash
npm install          # Install dev dependencies
npm test             # Run tests with coverage
npm run lint         # Type check
npm run build        # Build to dist/
```

## CLI

The package ships with a CLI for comparing JSON objects directly from the terminal.

### Install globally

```bash
npm install -g deep-obj-diff
```

### Usage

```bash
# Compare two JSON files
deep-obj-diff old.json new.json

# Compare inline JSON strings
deep-obj-diff '{"a":1,"b":2}' '{"a":1,"b":3,"c":4}'

# Choose output format: list (default), flat, nested, patch, json
deep-obj-diff old.json new.json --format patch

# Include unchanged properties
deep-obj-diff old.json new.json -u

# Limit recursion depth
deep-obj-diff old.json new.json -d 2

# Filter by path prefix
deep-obj-diff old.json new.json --filter settings

# Treat arrays as unordered sets
deep-obj-diff old.json new.json --no-array-order

# Raw JSON output (no colors, pipe-friendly)
deep-obj-diff old.json new.json --json
deep-obj-diff old.json new.json --format patch --json
```

### Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--format <fmt>` | `-f` | Output format: `list`, `flat`, `nested`, `patch`, `json` |
| `--include-unchanged` | `-u` | Include unchanged properties |
| `--max-depth <n>` | `-d` | Maximum recursion depth |
| `--no-array-order` | | Treat arrays as unordered sets |
| `--filter <prefix>` | | Only include paths matching the prefix |
| `--json` | | Force raw JSON output (no colors) |
| `--version` | `-V` | Show version number |
| `--help` | `-h` | Show help |

### Exit codes

- **0** – no differences found
- **1** – differences found (useful for CI scripts)

## License

MIT
