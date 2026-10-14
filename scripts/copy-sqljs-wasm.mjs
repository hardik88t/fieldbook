// Copies the sql.js wasm binary into public/ so the web build can fetch it at runtime.
// Native builds do not need it. Run automatically before the web dev server and export.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'public'), { recursive: true });
copyFileSync(
  join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm-browser.wasm'),
  join(root, 'public', 'sql-wasm-browser.wasm'),
);
console.log('copied sql-wasm-browser.wasm to public/');
