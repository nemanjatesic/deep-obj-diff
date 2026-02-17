import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve a CLI positional argument into a parsed JSON value.
 * Tries to read it as a file path first, then falls back to inline JSON.
 */
export function resolveInput(input: string): unknown {
  const resolved = path.resolve(input);

  if (fs.existsSync(resolved)) {
    const content = fs.readFileSync(resolved, 'utf-8');
    try {
      return JSON.parse(content);
    } catch {
      exitWithError(`File "${input}" does not contain valid JSON.`);
    }
  }

  try {
    return JSON.parse(input);
  } catch {
    const display = input.length > 60 ? input.slice(0, 60) + '...' : input;
    exitWithError(`"${display}" is neither a valid file path nor valid JSON.`);
  }
}

/** Print an error message to stderr and terminate the process. */
export function exitWithError(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}
