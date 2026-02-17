/** Parsed CLI options after Commander processes the arguments. */
export interface CliOptions {
  format: string;
  includeUnchanged: boolean;
  maxDepth?: string;
  arrayOrder: boolean;
  filter?: string;
  json: boolean;
  expandJsonStrings: boolean;
}

/** Valid output format names accepted by the CLI. */
export const VALID_FORMATS = ['list', 'flat', 'nested', 'patch', 'json'] as const;
export type CliFormat = (typeof VALID_FORMATS)[number];
