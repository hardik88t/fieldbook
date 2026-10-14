// Runs after `expo export -p web` (see build:web). The web build is a single-page app
// (web.output "single"), so dist/ holds one index.html that renders every route on the client.
// GitHub Pages serves files as they exist on disk, so this script adds the shell files Pages needs:
//
// - <route>.html for every static route in src/app (for example catalogue.html). Pages serves it
//   for /catalogue, /catalogue/ and /catalogue.html with status 200, so a direct load and a refresh
//   need no 404 and log no console error.
// - 404.html, a copy of the shell, for everything else (unknown paths and dynamic routes such as
//   /order/<id>). Pages serves it with status 404, and the client router still renders the page.
// - .nojekyll, so Pages does not run Jekyll, which would skip the _expo/ folder.
//
// Each shell also gets a tiny inline script. If the URL ends in ".html", it is rewritten to the
// clean path before the router reads the location, so /catalogue.html matches the catalogue route.
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const appDir = join(root, 'src', 'app');
const index = join(dist, 'index.html');

if (!existsSync(index)) {
  throw new Error(`finalize-web-export: ${index} is missing. Run expo export -p web first.`);
}

/** Static routes: top-level screens and the (tabs) group, minus layouts, index and dynamic segments. */
function staticRoutes() {
  const isRoute = (name) => !/^[_+[]/.test(name) && !name.includes('[');
  const top = readdirSync(appDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => parse(entry.name).name)
    .filter((name) => name !== 'index' && isRoute(name));
  const tabs = readdirSync(join(appDir, '(tabs)'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => parse(entry.name).name)
    .filter(isRoute);
  return [...new Set([...top, ...tabs])].sort();
}

const shell = readFileSync(index, 'utf8');
const normalise =
  '<script>if(/\\.html$/.test(location.pathname)){history.replaceState(history.state,"",location.pathname.replace(/\\.html$/,"")+location.search+location.hash)}</script>';
if (!shell.includes('<head>')) {
  throw new Error('finalize-web-export: index.html has no <head> to hold the URL normaliser.');
}
const withNormaliser = shell.replace('<head>', `<head>${normalise}`);

const routes = staticRoutes();
for (const route of routes) {
  writeFileSync(join(dist, `${route}.html`), withNormaliser);
}
writeFileSync(join(dist, '404.html'), withNormaliser);
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`finalized dist/: ${routes.map((r) => `${r}.html`).join(', ')}, 404.html, .nojekyll`);
