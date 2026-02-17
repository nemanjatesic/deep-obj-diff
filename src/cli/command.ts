import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { diff } from '../diff';
import { DiffKind } from '../types';
import { CliOptions, VALID_FORMATS } from './types';
import { resolveInput, exitWithError } from './input';
import { printJson, printList, printFlat, printPatch } from './printers';

// ─── Read version from package.json ──────────────────────────────────────────

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'),
);

// ─── Build the Commander program ─────────────────────────────────────────────

export function createProgram(): Command {
  const program = new Command();

  program
    .name('deep-obj-diff')
    .description('Deep compare two JSON objects or files and display differences')
    .version(packageJson.version as string)
    .argument('<left>', 'Left (original) value — a JSON string or file path')
    .argument('<right>', 'Right (updated) value — a JSON string or file path')
    .option('-f, --format <format>', 'Output format: list, flat, nested, patch, json', 'list')
    .option('-u, --include-unchanged', 'Include unchanged properties in the output', false)
    .option('-d, --max-depth <depth>', 'Maximum recursion depth (default: unlimited)')
    .option('--no-array-order', 'Treat arrays as unordered sets')
    .option('--filter <pattern>', 'Only include paths matching this prefix (e.g. "settings")')
    .option('--json', 'Force raw JSON output (no colors, no pretty printing)', false)
    .option('-e, --expand-json-strings', 'Recursively expand JSON-stringified string values before diffing', false)
    .addHelpText(
      'after',
      `
Examples:
  $ deep-obj-diff '{"a":1,"b":2}' '{"a":1,"b":3,"c":4}'
  $ deep-obj-diff old.json new.json
  $ deep-obj-diff old.json new.json --format patch
  $ deep-obj-diff old.json new.json --format flat --json
  $ deep-obj-diff old.json new.json --filter settings
  $ deep-obj-diff old.json new.json --no-array-order
  $ deep-obj-diff old.json new.json -u -d 2
`,
    );

  program.action(handleAction);

  return program;
}

// ─── Action handler ──────────────────────────────────────────────────────────

function handleAction(leftArg: string, rightArg: string, opts: CliOptions): void {
  const lhs = resolveInput(leftArg);
  const rhs = resolveInput(rightArg);

  // Validate format
  if (!VALID_FORMATS.includes(opts.format as any)) {
    exitWithError(
      `Invalid format "${opts.format}". Choose from: ${VALID_FORMATS.join(', ')}`,
    );
  }

  // Parse max-depth
  const maxDepth =
    opts.maxDepth !== undefined ? parseInt(opts.maxDepth, 10) : Infinity;
  if (opts.maxDepth !== undefined && isNaN(maxDepth)) {
    exitWithError(`--max-depth must be a number, got "${opts.maxDepth}"`);
  }

  // Build shared diff options
  const filterFn = opts.filter
    ? (p: string) => p === '' || p.startsWith(opts.filter!)
    : undefined;

  const baseOpts = {
    includeUnchanged: opts.includeUnchanged,
    maxDepth,
    arrayOrderMatters: opts.arrayOrder,
    filter: filterFn,
    expandJsonStrings: opts.expandJsonStrings,
  };

  const fmt = opts.format === 'json' ? 'list' : opts.format;
  const forceJson = opts.json || opts.format === 'json';

  // Dispatch per format so TypeScript resolves the correct overload
  switch (fmt) {
    case 'flat': {
      const result = diff(lhs, rhs, { ...baseOpts, format: 'flat' as const });
      if (forceJson) printJson(result);
      else printFlat(result);
      break;
    }
    case 'nested': {
      const result = diff(lhs, rhs, { ...baseOpts, format: 'nested' as const });
      printJson(result);
      break;
    }
    case 'patch': {
      const result = diff(lhs, rhs, { ...baseOpts, format: 'patch' as const });
      if (forceJson) printJson(result);
      else printPatch(result);
      break;
    }
    case 'list':
    default: {
      const result = diff(lhs, rhs, { ...baseOpts, format: 'list' as const });
      if (forceJson) printJson(result);
      else printList(result);

      // Exit with code 1 if differences found (useful for CI scripts)
      const hasDifferences = result.some((c) => c.kind !== DiffKind.Unchanged);
      if (hasDifferences) process.exit(1);
      break;
    }
  }
}
