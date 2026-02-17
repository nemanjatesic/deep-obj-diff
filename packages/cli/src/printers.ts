import { DiffChange, DiffKind, FlatDiff, PatchOperation } from 'deep-obj-diff';
import { COLORS, colorize, formatValue } from './colors.js';

// ─── JSON (raw) ──────────────────────────────────────────────────────────────

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ─── List format ─────────────────────────────────────────────────────────────

export function printList(changes: DiffChange[]): void {
  if (changes.length === 0) {
    console.log(colorize('No differences found.', COLORS.dim));
    return;
  }

  const added = changes.filter((c) => c.kind === DiffKind.Added);
  const removed = changes.filter((c) => c.kind === DiffKind.Removed);
  const changed = changes.filter((c) => c.kind === DiffKind.Changed);
  const unchanged = changes.filter((c) => c.kind === DiffKind.Unchanged);

  console.log(
    colorize(
      `\n${changes.length} difference(s): ${colorize(`+${added.length}`, COLORS.green)} ${colorize(`-${removed.length}`, COLORS.red)} ${colorize(`~${changed.length}`, COLORS.yellow)}${unchanged.length > 0 ? ` ${colorize(`=${unchanged.length}`, COLORS.dim)}` : ''}\n`,
      COLORS.bold,
    ),
  );

  for (const c of changes) {
    const pathStr = c.path || '(root)';
    switch (c.kind) {
      case DiffKind.Added:
        console.log(
          `  ${colorize('+', COLORS.green)} ${colorize(pathStr, COLORS.green)} = ${formatValue(c.rhs)}`,
        );
        break;
      case DiffKind.Removed:
        console.log(
          `  ${colorize('-', COLORS.red)} ${colorize(pathStr, COLORS.red)} ${COLORS.dim}(was ${formatValue(c.lhs)})${COLORS.reset}`,
        );
        break;
      case DiffKind.Changed:
        console.log(
          `  ${colorize('~', COLORS.yellow)} ${colorize(pathStr, COLORS.yellow)}: ${formatValue(c.lhs)} ${colorize('→', COLORS.dim)} ${formatValue(c.rhs)}`,
        );
        break;
      case DiffKind.Unchanged:
        console.log(
          `  ${colorize('=', COLORS.dim)} ${colorize(pathStr, COLORS.dim)} = ${formatValue(c.lhs)}`,
        );
        break;
    }
  }

  console.log();
}

// ─── Flat format ─────────────────────────────────────────────────────────────

export function printFlat(flat: FlatDiff): void {
  const paths = Object.keys(flat);
  if (paths.length === 0) {
    console.log(colorize('No differences found.', COLORS.dim));
    return;
  }

  const maxPathLen = Math.max(...paths.map((p) => p.length));
  console.log();

  for (const p of paths) {
    const entry = flat[p];
    const padded = p.padEnd(maxPathLen);
    switch (entry.kind) {
      case DiffKind.Added:
        console.log(
          `  ${colorize('+', COLORS.green)} ${colorize(padded, COLORS.green)}  = ${formatValue(entry.rhs)}`,
        );
        break;
      case DiffKind.Removed:
        console.log(
          `  ${colorize('-', COLORS.red)} ${colorize(padded, COLORS.red)}  ${COLORS.dim}(was ${formatValue(entry.lhs)})${COLORS.reset}`,
        );
        break;
      case DiffKind.Changed:
        console.log(
          `  ${colorize('~', COLORS.yellow)} ${colorize(padded, COLORS.yellow)}  ${formatValue(entry.lhs)} ${colorize('→', COLORS.dim)} ${formatValue(entry.rhs)}`,
        );
        break;
      case DiffKind.Unchanged:
        console.log(
          `  ${colorize('=', COLORS.dim)} ${colorize(padded, COLORS.dim)}  = ${formatValue(entry.lhs)}`,
        );
        break;
    }
  }

  console.log();
}

// ─── Patch format ────────────────────────────────────────────────────────────

export function printPatch(operations: PatchOperation[]): void {
  if (operations.length === 0) {
    console.log(colorize('No differences found.', COLORS.dim));
    return;
  }

  console.log();

  for (const op of operations) {
    switch (op.op) {
      case 'add':
        console.log(
          `  ${colorize('ADD', COLORS.green)}     ${colorize(op.path, COLORS.cyan)}  ${colorize('value:', COLORS.dim)} ${formatValue(op.value)}`,
        );
        break;
      case 'remove':
        console.log(
          `  ${colorize('REMOVE', COLORS.red)}  ${colorize(op.path, COLORS.cyan)}  ${colorize('was:', COLORS.dim)} ${formatValue(op.oldValue)}`,
        );
        break;
      case 'replace':
        console.log(
          `  ${colorize('REPLACE', COLORS.yellow)} ${colorize(op.path, COLORS.cyan)}  ${formatValue(op.oldValue)} ${colorize('→', COLORS.dim)} ${formatValue(op.value)}`,
        );
        break;
    }
  }

  console.log();
}
