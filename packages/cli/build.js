const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

// Clean dist before bundling
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}

esbuild.buildSync({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  format: 'cjs',
  banner: { js: '#!/usr/bin/env node' },
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  external: ['fs', 'path', 'child_process', 'os', 'util'],
  sourcemap: true,
  minify: false,
});

console.log('CLI bundled successfully.');
