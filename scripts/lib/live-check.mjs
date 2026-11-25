// Pure parts of scripts/live-check.mjs (T128): no network, no file system. Unit-tested in
// tests/liveCheck.test.ts with fixtures.

/**
 * Parses a `_headers` file (Cloudflare Pages and Netlify format) into its rules, in file order:
 * [{ path, headers: [[name, value], ...] }]. A line that starts at column 0 is a path; an
 * indented `Name: value` line belongs to the path above it; `#` lines and blank lines are skipped.
 */
export function parseHeadersFile(text) {
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) { rules.push({ path: line.trim(), headers: [] }); continue }
    const m = /^\s+([^:\s]+):\s*(.*)$/.exec(line);
    if (m && rules.length) rules.at(-1).headers.push([m[1], m[2].trim()]);
  }
  return rules;
}

/**
 * Whether a `_headers` path pattern matches a URL path, as Cloudflare Pages matches them: `*` (a
 * splat) matches anything, including nothing and slashes; `:name` matches one path segment.
 */
export function pathMatches(pattern, path) {
  const re = pattern.split(/(\*|:[A-Za-z]\w*)/).map((part) =>
    part === '*' ? '.*' : part.startsWith(':') && part.length > 1 ? '[^/]+' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'),
  ).join('');
  return new RegExp(`^${re}$`).test(path);
}

/**
 * The headers a host should send for `path`: every matching rule applies, and a header that two
 * rules set is comma-joined (both hosts do this). Returns a Map of lower-case name -> value.
 */
export function expectedHeaders(rules, path) {
  const out = new Map();
  for (const rule of rules) {
    if (!pathMatches(rule.path, path)) continue;
    for (const [name, value] of rule.headers) {
      const k = name.toLowerCase();
      out.set(k, out.has(k) ? `${out.get(k)}, ${value}` : value);
    }
  }
  return out;
}

const norm = (v) => v.trim().replace(/\s+/g, ' ');

/** Reads one header from a fetch Headers object or a plain object (any key case). */
function getHeader(actual, name) {
  if (typeof actual?.get === 'function') return actual.get(name);
  for (const [k, v] of Object.entries(actual ?? {})) if (k.toLowerCase() === name) return Array.isArray(v) ? v.join(', ') : String(v);
  return null;
}

/**
 * What differs between the expected headers (from expectedHeaders) and a response's headers
 * (empty = fine). Names are case-insensitive; values must match exactly, apart from runs of
 * whitespace. Headers the host adds on top (server, cf-ray, ...) are not checked.
 */
export function headerProblems(expected, actual) {
  const problems = [];
  for (const [name, want] of expected) {
    const got = getHeader(actual, name);
    if (got == null) problems.push(`${name} missing (want "${want}")`);
    else if (norm(got) !== norm(want)) problems.push(`${name} is "${got}" (want "${want}")`);
  }
  return problems;
}

/** The HTML with its comments removed (a commented-out script tag never runs). */
const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

/** One attribute's value from a tag's attribute text (quoted or bare), or null. */
function attr(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

/** Script types a browser runs (an absent type is JavaScript); JSON data blocks and the like are not. */
const RUNS = /^(|module|text\/javascript|application\/javascript|text\/ecmascript|application\/ecmascript|javascript)$/i;

/**
 * Scripts in a page that its own build did not put there (empty = fine):
 * - any <script src> or <link rel="modulepreload"|"preload" as="script"> whose address resolves
 *   to another origin than `pageUrl` (e.g. Cloudflare's static.cloudflareinsights.com beacon);
 * - any inline <script> with code in it. The build has none (its CSP has no 'unsafe-inline' for
 *   scripts), so an inline script was injected by the host.
 * Each entry is a short description for the report.
 */
export function thirdPartyScripts(html, pageUrl) {
  const origin = new URL(pageUrl).origin;
  const page = stripHtmlComments(html);
  const found = [];
  const foreign = (src) => {
    try { return new URL(src, pageUrl).origin !== origin } catch { return true }
  };
  for (const m of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const [, attrs, body] = m;
    const src = attr(attrs, 'src');
    if (src != null) { if (foreign(src)) found.push(`script from another origin: ${new URL(src, pageUrl).href}`); continue }
    if (RUNS.test((attr(attrs, 'type') ?? '').trim()) && body.trim()) found.push(`inline script: ${norm(body).slice(0, 80)}`);
  }
  for (const m of page.matchAll(/<link\b([^>]*)>/gi)) {
    const rel = (attr(m[1], 'rel') ?? '').toLowerCase().split(/\s+/);
    const isScript = rel.includes('modulepreload') || (rel.includes('preload') && (attr(m[1], 'as') ?? '').toLowerCase() === 'script');
    const href = attr(m[1], 'href');
    if (isScript && href != null && foreign(href)) found.push(`script preload from another origin: ${new URL(href, pageUrl).href}`);
  }
  return found;
}

/** The same-origin script addresses a page loads with <script src> (its entry modules). */
export function pageScripts(html, pageUrl) {
  const origin = new URL(pageUrl).origin;
  return [...stripHtmlComments(html).matchAll(/<script\b([^>]*)>/gi)]
    .map((m) => attr(m[1], 'src'))
    .filter((src) => src != null)
    .map((src) => new URL(src, pageUrl).href)
    .filter((u) => new URL(u).origin === origin);
}

/** Worker file names a built script mentions (e.g. `./heic.worker-CYgUwSul.js`), resolved against its address. */
export function workerRefs(code, scriptUrl) {
  const names = new Set([...code.matchAll(/[\w-]+(?:\.[\w-]+)*\.worker-[\w-]+\.js/g)].map((m) => m[0]));
  return [...names].sort().map((n) => new URL(n, scriptUrl).href);
}
