// ─── Diff Change Types ───────────────────────────────────────────────────────

/** The kind of change detected between two values. */
export enum DiffKind {
  /** A property was added (exists in `right` but not in `left`). */
  Added = 'added',
  /** A property was removed (exists in `left` but not in `right`). */
  Removed = 'removed',
  /** A primitive value was changed. */
  Changed = 'changed',
  /** No change detected. */
  Unchanged = 'unchanged',
}

/** Represents a single change at a specific path in the object tree. */
export interface DiffChange {
  /** The kind of change. */
  kind: DiffKind;
  /** Dot-notation path to the changed property (e.g. `"a.b[0].c"`). */
  path: string;
  /** The value from the left (original) object. `undefined` for additions. */
  lhs?: unknown;
  /** The value from the right (updated) object. `undefined` for removals. */
  rhs?: unknown;
}

// ─── Output Formats ──────────────────────────────────────────────────────────

/** Supported built-in output formats. */
export type OutputFormat = 'list' | 'nested' | 'flat' | 'patch';

/** A flat diff keyed by dot-path, showing old → new values. */
export interface FlatDiff {
  [path: string]: { lhs?: unknown; rhs?: unknown; kind: DiffKind };
}

/** A JSON-Patch–style operation (RFC 6902 subset). */
export interface PatchOperation {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

/** A nested diff mirrors the shape of the compared objects. */
export interface NestedDiff {
  [key: string]: NestedDiffNode;
}

export interface NestedDiffNode {
  kind: DiffKind;
  lhs?: unknown;
  rhs?: unknown;
  children?: NestedDiff;
}

// ─── Options ─────────────────────────────────────────────────────────────────

/** A filter predicate to include/exclude paths from the diff. */
export type PathFilter = (path: string, lhs: unknown, rhs: unknown) => boolean;

/** A custom equality function for comparing leaf values. */
export type EqualityFn = (lhs: unknown, rhs: unknown, path: string) => boolean;

/** A custom formatter that transforms the raw change list. */
export type CustomFormatter<T = unknown> = (changes: DiffChange[]) => T;

/**
 * Configuration options for the diff operation.
 *
 * @template F - The output format type.
 */
export interface DiffOptions<F extends OutputFormat | CustomFormatter = 'list'> {
  /**
   * The output format.
   *
   * - `'list'` (default) – flat array of `DiffChange` objects.
   * - `'nested'` – mirrors object structure with diff metadata.
   * - `'flat'` – object keyed by dot-path.
   * - `'patch'` – array of JSON-Patch operations.
   * - A custom function – receives the raw change list and returns anything.
   */
  format?: F;

  /**
   * When `true`, unchanged properties are included in the output.
   * @default false
   */
  includeUnchanged?: boolean;

  /**
   * Maximum depth to recurse into nested objects.
   * `0` means compare only top-level keys.
   * `Infinity` (default) means no limit.
   * @default Infinity
   */
  maxDepth?: number;

  /**
   * A filter function. Return `true` to **include** the path in the diff.
   * If omitted, all paths are included.
   */
  filter?: PathFilter;

  /**
   * Custom equality check for leaf values.
   * When provided, this replaces the default `===` / `Object.is` comparison.
   */
  isEqual?: EqualityFn;

  /**
   * When `true`, arrays are diffed by index position.
   * When `false` (default), arrays are treated as unordered sets and a
   * best-effort element match is attempted.
   * @default true
   */
  arrayOrderMatters?: boolean;

  /**
   * When `true`, string values that contain valid JSON (objects or arrays)
   * are recursively parsed and expanded before diffing, so that their
   * inner structure is compared rather than the raw string.
   * @default false
   */
  expandJsonStrings?: boolean;
}

// ─── Result Type Mapping ─────────────────────────────────────────────────────

/**
 * Maps a format specifier to the corresponding return type.
 */
export type DiffResult<F extends OutputFormat | CustomFormatter> =
  F extends 'list'
    ? DiffChange[]
    : F extends 'nested'
      ? NestedDiff
      : F extends 'flat'
        ? FlatDiff
        : F extends 'patch'
          ? PatchOperation[]
          : F extends CustomFormatter<infer R>
            ? R
            : DiffChange[];
