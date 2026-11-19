// Checks a hosted copy of the app against the deploy config (T128): response headers, no injected
// scripts, and the launch video. Read-only: it only sends GET and HEAD requests.
//
//   npm run live-check                                   # the public address (SITE_URL in src/brand.ts)
//   node scripts/live-check.mjs https://preview.example/ # or BASE_URL=https://... node scripts/live-check.mjs
//   node scripts/live-check.mjs --beta                   # expect the no-index beta build's headers
//   node scripts/live-check.mjs --headers dist-launch/_headers   # compare against a built _headers file
//
// Prints one PASS/FAIL line per check (with the details under a FAIL) and exits 1 if anything failed.
//
// Expected headers come from the deploy config, never from a copy kept here: by default
// headersFile() from vite.deploy.ts (the same function the build uses to write `_headers`), fed with
// the worker files found on the live site; with --headers, the rules in that built file. The launch
// build's headers are expected when the address is SITE_URL (the launch build is what goes there),
// the beta build's otherwise; --launch / --beta override that.
//
// Worker files are found on the live site, not in the local dist/: the hashed names must be the ones
// actually deployed, and a local build can differ (other mode, newer code). The page's entry scripts
// name the small "new Worker(url)" wrapper chunks; each wrapper names its worker body. A file is
// recognised as a wrapper or a body by workerPaths() from vite.deploy.ts, the build's own test.
//
// The page is fetched like a browser does (browser User-Agent and an Accept header that asks for
// HTML). That matters: Cloudflare only injects its Web Analytics beacon into responses to requests
// that accept text/html, so a plain fetch would miss it.
import { readFileSync } from 'node:fs';
import { CSP, headersFile, workerPaths } from '../vite.deploy.ts';
import { precacheProblems, precacheUrls } from '../vite.launch.ts';
import { LAUNCH_VIDEO, SITE_URL } from '../src/brand.ts';
import { expectedHeaders, headerProblems, pageScripts, parseHeadersFile, thirdPartyScripts, workerRefs } from './lib/live-check.mjs';

const args = process.argv.slice(2);
const flag = (k) => args.includes(`--${k}`);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i < 0 ? null : args[i + 1]; };
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--headers');
if (flag('help') || positional.length > 1 || (flag('launch') && flag('beta'))) {
  console.error('usage: live-check.mjs [base-url] [--launch | --beta] [--headers <built _headers file>]  (or BASE_URL=...)');
  process.exit(2);
}
const BASE = new URL((positional[0] ?? process.env.BASE_URL ?? SITE_URL).replace(/\/?$/, '/')).href;
const LAUNCH = flag('launch') || (!flag('beta') && SITE_URL !== '' && new URL(SITE_URL).href === BASE);
const HEADERS_FILE = opt('headers');

const BROWSER = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

/** The only two requests this script makes. Nothing is ever sent but GET and HEAD, with no body. */
async function get(url, headers = {}) {
  const res = await fetch(url, { method: 'GET', headers: { 'user-agent': BROWSER['user-agent'], ...headers }, redirect: 'follow' });
  return { res, text: await res.text() };
}
const head = (url) => fetch(url, { method: 'HEAD', headers: { 'user-agent': BROWSER['user-agent'] }, redirect: 'follow' });

let failed = 0;
function report(name, problems, note = '') {
  if (problems.length) failed++;
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${name}${note ? `  (${note})` : ''}`);
  // The full policy is long and the same everywhere; name it instead of printing it four times.
  for (const p of problems) console.log(`        - ${p.split(CSP).join('<the CSP from vite.deploy.ts>')}`);
}
const path = (url) => new URL(url).pathname;

console.log(`Live check of ${BASE}, expecting the ${LAUNCH ? 'launch' : 'beta'} build's headers${HEADERS_FILE ? ` from ${HEADERS_FILE}` : ' from vite.deploy.ts'}`);

// 1. The page, fetched as a browser would.
const page = await get(BASE, BROWSER);
report(`GET ${path(BASE)} answers 200`, page.res.status === 200 ? [] : [`status ${page.res.status}`]);
const injected = thirdPartyScripts(page.text, page.res.url || BASE);
report(`${path(BASE)} has no scripts from another origin and no inline scripts`, injected);

// 2. Worker files, from the live page's scripts: entry scripts -> wrapper chunks -> worker bodies.
const bodies = new Map(); // url -> response
const seen = new Set();
let queue = pageScripts(page.text, page.res.url || BASE);
for (let depth = 0; depth < 3 && queue.length; depth++) {
  const next = [];
  for (const url of queue) {
    if (seen.has(url)) continue;
    seen.add(url);
    const r = await get(url);
    const name = path(url).slice(1);
    const isWorkerFile = /\.worker-[^/]*\.js$/.test(name);
    if (!r.res.ok) { if (isWorkerFile) bodies.set(url, r); continue } // reported with the headers below
    const kind = workerPaths({ [name]: r.text });
    if (kind.locked.length + kind.wasm.length) bodies.set(url, r); // a worker body
    else next.push(...workerRefs(r.text, url)); // an entry script or a wrapper chunk
  }
  queue = next;
}
const workerUrls = [...bodies.keys()].sort();
report('worker files found on the live site', workerUrls.length >= 2 ? [] : [`found ${workerUrls.length} (${workerUrls.map(path).join(', ') || 'none'}); the build has a thumbnail and a HEIC worker`],
  workerUrls.map(path).join(', '));

// 3. Response headers against the deploy config.
const workers = { locked: workerUrls.map(path), wasm: [] }; // every worker body gets the same headers
const rulesText = HEADERS_FILE ? readFileSync(HEADERS_FILE, 'utf8') : headersFile(workers, CSP, { indexable: LAUNCH });
const rules = parseHeadersFile(rulesText);
const sw = await get(new URL('sw.js', BASE).href);
const targets = [[BASE, page], [new URL('sw.js', BASE).href, sw], ...workerUrls.map((u) => [u, bodies.get(u)])];
for (const [url, r] of targets) {
  const want = expectedHeaders(rules, path(url));
  const problems = r.res.ok ? headerProblems(want, r.res.headers) : [`status ${r.res.status}`];
  if (!want.has('content-security-policy')) problems.push(`the deploy config sets no Content-Security-Policy for ${path(url)}`);
  report(`headers on ${path(url)}`, problems);
}

// 4. The launch video: served at its address, and kept out of the offline cache.
if (!LAUNCH_VIDEO) {
  console.log('SKIP  launch video (LAUNCH_VIDEO is off in src/brand.ts)');
} else {
  for (const [what, rel, type] of [['launch video', LAUNCH_VIDEO.src, /^video\//], ['launch video captions', LAUNCH_VIDEO.captions, /^text\/vtt/]]) {
    const url = new URL(rel, BASE).href;
    const res = await head(url);
    const ct = res.headers.get('content-type') ?? '';
    const size = Number(res.headers.get('content-length') ?? NaN);
    const problems = [];
    if (res.status !== 200) problems.push(`HEAD ${path(url)}: status ${res.status}`);
    else {
      if (!type.test(ct)) problems.push(`content-type is "${ct}" (want ${type.source.slice(1)}...)`);
      if (size === 0) problems.push('content-length is 0');
    }
    report(`${what} present at ${path(url)}`, problems, res.status === 200 ? `${ct}${Number.isFinite(size) ? `, ${size} bytes` : ''}` : '');
  }
  const swPath = (rel) => path(new URL(rel, BASE).href);
  const listed = sw.res.ok ? precacheUrls(sw.text).map((u) => swPath(u)) : [];
  const problems = sw.res.ok ? [...precacheProblems(sw.text)] : [`GET ${path(new URL('sw.js', BASE).href)}: status ${sw.res.status}`];
  for (const rel of [LAUNCH_VIDEO.src, LAUNCH_VIDEO.captions]) {
    if (listed.includes(swPath(rel)) && !problems.some((p) => p.includes(rel))) problems.push(`${rel} is in the offline cache`);
  }
  report('launch video not in the sw.js precache list', problems, sw.res.ok ? `${listed.length} entries` : '');
}

console.log(failed ? `\nFAIL: ${failed} check${failed === 1 ? '' : 's'} failed` : '\nPASS: all checks passed');
process.exit(failed ? 1 : 0);
