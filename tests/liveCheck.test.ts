// The pure parts of scripts/live-check.mjs (T128): reading `_headers`, comparing response headers
// with it, and spotting scripts the host injected. Fixtures only, no network.
//   live-check/index-with-beacon.html: the hosted page as a browser got it on Nov 19, with the
//     Cloudflare Web Analytics beacon injected (its site token zeroed).
//   live-check/sw-headers-t96.json: the hosted /sw.js response headers on Nov 19 (no _headers applied).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CSP, headersFile } from '../vite.deploy';
import {
  expectedHeaders,
  headerProblems,
  pageScripts,
  parseHeadersFile,
  pathMatches,
  thirdPartyScripts,
  workerRefs,
} from '../scripts/lib/live-check.mjs';

const fixture = (name: string) => readFileSync(join(__dirname, 'live-check', name), 'utf8');
const WORKERS = { locked: ['/assets/thumb.worker-NkyxzCvw.js'], wasm: ['/assets/heic.worker-DBDcunJ2.js'] };
const PAGE = 'https://example.org/';

/** The headers a correctly configured host sends for `path` (built from the same rules). */
const served = (rules: ReturnType<typeof parseHeadersFile>, path: string) => Object.fromEntries(expectedHeaders(rules, path));

describe('_headers rules', () => {
  const rules = parseHeadersFile(headersFile(WORKERS, CSP))

  it('reads every path block of the generated file, comments skipped', () => {
    expect(rules.map((r) => r.path)).toEqual(['/*', '/', '/index.html', '/sw.js', ...WORKERS.locked, ...WORKERS.wasm, '/registerSW.js', '/manifest.webmanifest', '/assets/*']);
    expect(rules[0].headers).toContainEqual(['Referrer-Policy', 'no-referrer']);
  });

  it('matches paths the way Cloudflare Pages does', () => {
    expect(pathMatches('/*', '/')).toBe(true);
    expect(pathMatches('/*', '/assets/a.js')).toBe(true);
    expect(pathMatches('/', '/sw.js')).toBe(false);
    expect(pathMatches('/assets/*', '/assets/x/y.js')).toBe(true);
    expect(pathMatches('/assets/*', '/sw.js')).toBe(false);
    expect(pathMatches('/sw.js', '/swxjs')).toBe(false); // the dot is literal
    expect(pathMatches('/:lang/page', '/en/page')).toBe(true);
    expect(pathMatches('/:lang/page', '/en/x/page')).toBe(false);
  });

  it('expects the CSP and no-cache on the page and the service worker', () => {
    for (const p of ['/', '/sw.js']) {
      const want = expectedHeaders(rules, p);
      expect(want.get('content-security-policy')).toBe(CSP);
      expect(want.get('cache-control')).toBe('no-cache');
      expect(want.get('referrer-policy')).toBe('no-referrer');
      expect(want.get('x-robots-tag')).toBe('noindex, nofollow'); // beta build
    }
  });

  it('expects the CSP and the year-long cache on each worker body, with one Cache-Control', () => {
    for (const p of [...WORKERS.locked, ...WORKERS.wasm]) {
      const want = expectedHeaders(rules, p);
      expect(want.get('content-security-policy')).toBe(CSP);
      expect(want.get('cache-control')).toBe('public, max-age=31536000, immutable');
    }
  });

  it('leaves out X-Robots-Tag for the launch build', () => {
    expect(expectedHeaders(parseHeadersFile(headersFile(WORKERS, CSP, { indexable: true })), '/').has('x-robots-tag')).toBe(false);
  });

  it('comma-joins a header that two rules set', () => {
    const r = parseHeadersFile('/*\n  Cache-Control: a\n/x\n  cache-control: b\n');
    expect(expectedHeaders(r, '/x').get('cache-control')).toBe('a, b');
    expect(expectedHeaders(r, '/y').get('cache-control')).toBe('a');
  });
});

describe('header comparison', () => {
  const rules = parseHeadersFile(headersFile(WORKERS, CSP, { indexable: true }))

  it('passes a host that sends exactly the configured headers, plus its own', () => {
    for (const p of ['/', '/sw.js', ...WORKERS.locked, ...WORKERS.wasm]) {
      expect(headerProblems(expectedHeaders(rules, p), { ...served(rules, p), server: 'cloudflare', 'cf-ray': 'x' })).toEqual([]);
    }
  });

  it('ignores header-name case and runs of whitespace, and reads fetch Headers objects', () => {
    const want = expectedHeaders(rules, '/');
    const loose = Object.fromEntries([...want].map(([k, v]) => [k.toUpperCase(), v.replace(/; /g, ';   ')]));
    expect(headerProblems(want, loose)).toEqual([]);
    expect(headerProblems(want, new Headers(served(rules, '/')))).toEqual([]);
  });

  it('fails the hosted service worker as found on Nov 19 (T96): Cloudflare defaults, no _headers', () => {
    const { _comment, ...actual } = JSON.parse(fixture('sw-headers-t96.json'));
    expect(_comment).toBeTruthy();
    expect(headerProblems(expectedHeaders(rules, '/sw.js'), actual)).toEqual([
      'referrer-policy is "strict-origin-when-cross-origin" (want "no-referrer")',
      'permissions-policy missing (want "camera=(), microphone=(), geolocation=()")',
      `content-security-policy missing (want "${CSP}")`,
      'cache-control is "public, max-age=14400, must-revalidate" (want "no-cache")',
    ]);
  });

  it('fails a CSP that differs by one source', () => {
    const want = expectedHeaders(rules, '/');
    const actual = { ...served(rules, '/'), 'content-security-policy': CSP.replace("connect-src 'self'", "connect-src 'self' https:") };
    expect(headerProblems(want, actual)).toHaveLength(1);
  });
});

describe('scripts the host injected', () => {
  it('finds the Cloudflare Web Analytics beacon in the hosted page (Nov 19)', () => {
    expect(thirdPartyScripts(fixture('index-with-beacon.html'), PAGE)).toEqual([
      'script from another origin: https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092',
    ]);
  });

  it('passes the same page without the beacon (the build as it should be served)', () => {
    const clean = fixture('index-with-beacon.html').replace(/<script[^>]*cloudflareinsights[\s\S]*?<\/script>/, '');
    expect(clean).not.toContain('cloudflareinsights');
    expect(thirdPartyScripts(clean, PAGE)).toEqual([]);
  });

  it('flags other-origin preloads and inline code, but not JSON data or commented-out tags', () => {
    const html = [
      '<script src="/assets/a.js"></script>',
      '<script src="//cdn.example.net/x.js"></script>',
      '<script src=https://evil.example/y.js></script>',
      "<link rel='modulepreload' href='https://cdn.example.net/m.js'>",
      '<link rel="preload" as="script" href="https://cdn.example.net/p.js">',
      '<link rel="preload" as="image" href="https://cdn.example.net/i.png">',
      '<script>window.x = 1</script>',
      '<script type="application/ld+json">{"a":1}</script>',
      '<!-- <script src="https://old.example/z.js"></script> -->',
    ].join('\n');
    expect(thirdPartyScripts(html, PAGE)).toEqual([
      'script from another origin: https://cdn.example.net/x.js',
      'script from another origin: https://evil.example/y.js',
      'inline script: window.x = 1',
      'script preload from another origin: https://cdn.example.net/m.js',
      'script preload from another origin: https://cdn.example.net/p.js',
    ]);
  });

  it('treats another port or scheme as another origin', () => {
    expect(thirdPartyScripts('<script src="https://example.org:8443/a.js"></script>', PAGE)).toHaveLength(1);
    expect(thirdPartyScripts('<script src="http://example.org/a.js"></script>', PAGE)).toHaveLength(1);
  });
});

describe('finding the worker files', () => {
  it("lists the page's own entry scripts", () => {
    expect(pageScripts(fixture('index-with-beacon.html'), PAGE)).toEqual([
      'https://example.org/assets/index-DQsn6uEE.js',
      'https://example.org/registerSW.js',
    ]);
  });

  it('resolves worker names against the script that mentions them', () => {
    const entry = 'const a=()=>import(`./heic.worker-CYgUwSul.js`),b=()=>import("./thumb.worker-CkY3k4_u.js"),c=import("./heic.worker-CYgUwSul.js")';
    expect(workerRefs(entry, 'https://example.org/assets/index-x.js')).toEqual([
      'https://example.org/assets/heic.worker-CYgUwSul.js',
      'https://example.org/assets/thumb.worker-CkY3k4_u.js',
    ]);
    const wrapper = 'function e(e){return new Worker(new URL(`heic.worker-DBDcunJ2.js`,import.meta.url).href,{type:`module`,name:e?.name})}export{e as default};';
    expect(workerRefs(wrapper, 'https://example.org/assets/heic.worker-CYgUwSul.js')).toEqual(['https://example.org/assets/heic.worker-DBDcunJ2.js']);
  });
});
