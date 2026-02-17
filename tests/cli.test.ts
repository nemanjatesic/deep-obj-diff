import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CLI = path.resolve(__dirname, '..', 'dist', 'cli', 'index.js');

function run(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', exitCode: err.status ?? 1 };
  }
}

const tmpDir = path.resolve(__dirname, '..', '.tmp-cli-test');

beforeAll(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeJson(name: string, data: unknown): string {
  const fp = path.join(tmpDir, name);
  fs.writeFileSync(fp, JSON.stringify(data));
  return fp;
}

// ─── Basic inline JSON ───────────────────────────────────────────────────────

describe('CLI – inline JSON', () => {
  it('reports differences in list format', () => {
    const { stdout, exitCode } = run(['{"a":1}', '{"a":2}']);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('~');
    expect(stdout).toContain('a');
  });

  it('exits 0 when objects are identical', () => {
    const { exitCode } = run(['{"a":1}', '{"a":1}']);
    expect(exitCode).toBe(0);
  });

  it('shows added keys', () => {
    const { stdout, exitCode } = run(['{}', '{"x":42}']);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('+');
    expect(stdout).toContain('x');
  });

  it('shows removed keys', () => {
    const { stdout, exitCode } = run(['{"x":42}', '{}']);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('-');
    expect(stdout).toContain('x');
  });
});

// ─── File path input ─────────────────────────────────────────────────────────

describe('CLI – file paths', () => {
  it('reads and compares JSON files', () => {
    const left = writeJson('left.json', { name: 'Alice', age: 30 });
    const right = writeJson('right.json', { name: 'Alice', age: 31 });
    const { stdout, exitCode } = run([left, right]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('age');
    expect(stdout).toContain('30');
    expect(stdout).toContain('31');
  });

  it('exits 0 for identical files', () => {
    const left = writeJson('same1.json', { a: 1 });
    const right = writeJson('same2.json', { a: 1 });
    const { exitCode } = run([left, right]);
    expect(exitCode).toBe(0);
  });
});

// ─── Output formats ──────────────────────────────────────────────────────────

describe('CLI – output formats', () => {
  const left = '{"a":1,"b":2}';
  const right = '{"a":1,"b":3,"c":4}';

  it('--format flat', () => {
    const { stdout } = run([left, right, '--format', 'flat']);
    expect(stdout).toContain('b');
    expect(stdout).toContain('c');
  });

  it('--format nested', () => {
    const { stdout } = run([left, right, '--format', 'nested']);
    const parsed = JSON.parse(stdout);
    expect(parsed.b.kind).toBe('changed');
    expect(parsed.c.kind).toBe('added');
  });

  it('--format patch', () => {
    const { stdout } = run([left, right, '--format', 'patch']);
    expect(stdout).toContain('REPLACE');
    expect(stdout).toContain('ADD');
  });

  it('--format json outputs raw JSON list', () => {
    const { stdout } = run([left, right, '--format', 'json']);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('kind');
  });

  it('--json flag with --format patch outputs raw JSON', () => {
    const { stdout } = run([left, right, '--format', 'patch', '--json']);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toHaveProperty('op');
  });
});

// ─── Options ─────────────────────────────────────────────────────────────────

describe('CLI – options', () => {
  it('--include-unchanged / -u', () => {
    const { stdout } = run(['{"a":1,"b":2}', '{"a":1,"b":3}', '-u']);
    expect(stdout).toContain('=');
    expect(stdout).toContain('a');
  });

  it('--max-depth / -d', () => {
    const left = '{"x":{"y":{"z":1}}}';
    const right = '{"x":{"y":{"z":2}}}';
    const { stdout } = run([left, right, '-d', '1']);
    // At depth 1, nested objects are compared as wholes
    expect(stdout).toContain('x');
    expect(stdout).not.toContain('x.y.z');
  });

  it('--filter', () => {
    const left = '{"name":"a","settings":{"theme":"dark"}}';
    const right = '{"name":"b","settings":{"theme":"light"}}';
    const { stdout } = run([left, right, '--filter', 'settings']);
    expect(stdout).toContain('settings');
    expect(stdout).not.toContain('name');
  });

  it('--no-array-order', () => {
    const left = '{"items":[1,2,3]}';
    const right = '{"items":[3,1,2]}';
    const { exitCode } = run([left, right, '--no-array-order']);
    // Unordered: these are the same
    expect(exitCode).toBe(0);
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────

describe('CLI – error handling', () => {
  it('errors on invalid JSON', () => {
    const { exitCode } = run(['not-json', 'also-not-json']);
    expect(exitCode).toBe(1);
  });

  it('errors on invalid file content', () => {
    const fp = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(fp, '{ this is not valid }');
    const { exitCode } = run([fp, '{"a":1}']);
    expect(exitCode).toBe(1);
  });

  it('shows help with --help', () => {
    const { stdout, exitCode } = run(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Usage');
    expect(stdout).toContain('deep-obj-diff');
  });

  it('shows version with --version', () => {
    const { stdout, exitCode } = run(['--version']);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
