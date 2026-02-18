# deep-obj-diff-cli

A command-line tool for comparing JSON objects or files and displaying differences — powered by [deep-obj-diff](https://www.npmjs.com/package/deep-obj-diff).

## Installation

```bash
npm install -g deep-obj-diff-cli
```

Or use with `npx`:

```bash
npx deep-obj-diff-cli old.json new.json
```

## Quick Start

```bash
# Compare two JSON files
deep-obj-diff old.json new.json

# Compare inline JSON strings
deep-obj-diff '{"a":1,"b":2}' '{"a":1,"b":3,"c":4}'
```

## Common Use Cases

### Compare API responses

```bash
curl https://api.example.com/v1/config > old.json
curl https://api.example.com/v2/config > new.json
deep-obj-diff old.json new.json
```

### Generate JSON Patch output

```bash
deep-obj-diff old.json new.json --format patch
```

### Get machine-readable JSON (for piping)

```bash
deep-obj-diff old.json new.json --json | jq '.[] | select(.kind == "changed")'
```

### Compare only a specific subtree

```bash
deep-obj-diff old.json new.json --filter settings
```

### Treat arrays as unordered sets

```bash
deep-obj-diff old.json new.json --no-array-order
```

### Limit comparison depth

```bash
deep-obj-diff old.json new.json -d 2
```

### Ignore specific paths

```bash
deep-obj-diff old.json new.json -i "*.timestamp" -i "metadata.*"
```

### Include unchanged properties

```bash
deep-obj-diff old.json new.json -u
```

### Expand JSON-stringified values before diffing

```bash
deep-obj-diff old.json new.json -e
```

## Output Formats

| Format | Flag | Description |
|--------|------|-------------|
| `list` | `-f list` | Colored change list (default) |
| `flat` | `-f flat` | Flat object keyed by dot-path |
| `nested` | `-f nested` | Nested structure mirroring object shape |
| `patch` | `-f patch` | JSON Patch operations (RFC 6902) |
| `json` | `-f json` | Raw JSON list output |

## All Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--format <fmt>` | `-f` | Output format (see above) |
| `--include-unchanged` | `-u` | Include unchanged properties |
| `--max-depth <n>` | `-d` | Maximum recursion depth |
| `--no-array-order` | | Treat arrays as unordered sets |
| `--filter <prefix>` | | Only include paths matching the prefix |
| `--ignore <pattern>` | `-i` | Ignore paths (repeatable, supports globs) |
| `--expand-json-strings` | `-e` | Expand JSON-stringified values |
| `--json` | | Raw JSON output (no colors, pipe-friendly) |
| `--version` | `-V` | Show version number |
| `--help` | `-h` | Show help |

## Exit Codes

- **0** — no differences found
- **1** — differences found (useful in CI/CD scripts)

## License

MIT
