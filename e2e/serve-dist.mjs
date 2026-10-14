// Static server for the e2e run. It serves dist/ under /fieldbook/ and behaves like GitHub Pages:
// the exact file, then <path>.html, then <path>/index.html, and otherwise 404.html with status 404.
// Binds to 127.0.0.1 only. Playwright starts and stops it (see playwright.config.ts).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT ?? 4173);
const base = '/fieldbook';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

function fileFor(relative) {
  const full = normalize(join(root, relative));
  if (!full.startsWith(root)) return null;
  return existsSync(full) && statSync(full).isFile() ? full : null;
}

function send(res, file, status) {
  res.writeHead(status, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1');
  const decoded = decodeURIComponent(pathname);
  if (decoded !== base && !decoded.startsWith(`${base}/`)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const path = decoded.slice(base.length) || '/';
  const trimmed = path.length > 1 ? path.replace(/\/$/, '') : path;
  const candidates = [path, `${trimmed}.html`, join(trimmed, 'index.html')];
  for (const candidate of candidates) {
    const file = fileFor(candidate);
    if (file) {
      send(res, file, 200);
      return;
    }
  }
  const fallback = fileFor('404.html');
  if (fallback) {
    send(res, fallback, 404);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}${base}/`);
});
