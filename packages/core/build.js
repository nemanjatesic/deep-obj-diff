const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');

// Clean
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}

// Build CJS
execSync('tsc -p tsconfig.cjs.json', { stdio: 'inherit' });

// Build ESM
execSync('tsc -p tsconfig.esm.json', { stdio: 'inherit' });

// Write package.json markers
fs.writeFileSync(path.join(distDir, 'esm', 'package.json'), JSON.stringify({ type: 'module' }));
fs.writeFileSync(path.join(distDir, 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }));

console.log('Core built successfully.');
