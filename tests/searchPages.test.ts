// D51 (owner, Nov 13): the two plain search pages on the public site, launch build only. They must
// carry their own title, description and canonical address, load nothing from other addresses,
// have no script, and stay out of the offline cache.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_URL, SEARCH_PAGES, SITE_URL } from '../src/brand';
import { copy, searchPages } from '../src/ui/copy';
import { parse, anchors } from '../src/ui/markdown';
import { PAGE_LINKS, SEARCH_PAGE_NAMES, pageUrl, searchPageHtml } from '../src/ui/searchPage';
import type { SearchPage } from '../src/ui/searchPage';
import { CSP, ROBOTS_TXT_LAUNCH, cspFromHtml } from '../vite.deploy';
import { NOT_PRECACHED, precacheProblems } from '../vite.launch';
import { SEARCH_FILES, SEARCH_ROUTES, appStylesheet, searchPages as searchPagesPlugin, sitemapXml } from '../vite.search';

const ROOT = join(__dirname, '..');
const CSS = 'assets/index-AbC123.css';
const html = (page: SearchPage) => searchPageHtml(page, { css: CSS, csp: CSP });
const attrs = (h: string, name: string) => [...h.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => m[1]);

/** Everything a page asks the browser to load (not links a reader presses). */
function loads(h: string): string[] {
  const linkHrefs = [...h.matchAll(/<link\b[^>]*>/g)].filter((m) => !/rel="canonical"/.test(m[0])).flatMap((m) => attrs(m[0], 'href'));
  const cssUrls = [...h.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1]);
  return [...attrs(h, 'src'), ...linkHrefs, ...cssUrls, ...attrs(h, 'srcset'), ...attrs(h, 'poster'), ...attrs(h, 'action')];
}

/** Checks one built page (from the renderer or from dist-launch/). */
function checkPage(page: SearchPage, h: string) {
  const c = searchPages[page];
  expect(h.startsWith('<!doctype html>')).toBe(true);
  expect(h).toContain(`<title>${c.title}</title>`);
  expect(h).toContain(`<meta name="description" content="${c.description}" />`);
  expect(h).toContain(`<link rel="canonical" href="${SITE_URL}${SEARCH_PAGES[page]}" />`);
  expect(cspFromHtml(h)).toEqual([CSP]); // the app's own policy, unchanged
  expect(h).not.toMatch(/<script\b/i);
  expect(h).not.toMatch(/\son[a-z]+=/i); // no inline event handlers either
  expect(h.match(/<h1\b/g)).toHaveLength(1);
  // Nothing is loaded from another address: every src, stylesheet and icon is relative.
  for (const u of loads(h)) expect(u, u).not.toMatch(/^(https?:)?\/\//i);
  // The only full addresses are the page's own canonical/og tags (this site) and the code link.
  const full = [...h.matchAll(/(?:href|content|src)="(https?:\/\/[^"]*)"/g)].map((m) => m[1]);
  for (const u of full) expect(u.startsWith(SITE_URL) || u === REPO_URL, u).toBe(true);
  // A link back to the app, and one to the other page.
  expect(h).toContain(`<a class="btn btn-primary" href="../">${c.cta}</a>`);
  // Every same-page link leads to a heading on the page.
  const ids = new Set(attrs(h, 'id'));
  for (const href of attrs(h, 'href').filter((x) => x.startsWith('#'))) expect(ids.has(href.slice(1)), href).toBe(true);
}

describe('the search pages (D51)', () => {
  it('are the two approved pages, at their own addresses', () => {
    expect(SEARCH_PAGES).toEqual({ guide: 'photorec-guide/', sort: 'sort-photorec-files-by-date/' });
    expect(SEARCH_PAGE_NAMES).toEqual(['guide', 'sort']);
    expect(pageUrl('guide')).toBe('https://upsort.app/photorec-guide/');
    expect(SEARCH_FILES).toEqual(['photorec-guide/index.html', 'sort-photorec-files-by-date/index.html']);
  });

  for (const page of SEARCH_PAGE_NAMES) {
    it(`${page}: title, description, canonical, CSP, no script, nothing from other addresses`, () => checkPage(page, html(page)));
  }

  it('fit in a search result', () => {
    for (const page of SEARCH_PAGE_NAMES) {
      expect(searchPages[page].title.length, page).toBeLessThanOrEqual(65);
      expect(searchPages[page].description.length, page).toBeLessThanOrEqual(160);
      expect(searchPages[page].description.length, page).toBeGreaterThanOrEqual(70);
    }
  });

  it('use the app\'s own stylesheet (and so its own fonts and colours)', () => {
    expect(html('sort')).toContain(`<link rel="stylesheet" href="../${CSS}" />`);
    expect(html('sort')).toContain('class="page narrow info"');
    expect(html('sort')).toContain('class="doc"');
  });

  it('link to each other and to the app; named links are the only ones besides headings', () => {
    expect(html('guide')).toContain('href="../sort-photorec-files-by-date/"');
    expect(html('sort')).toContain('href="../photorec-guide/"');
    for (const page of SEARCH_PAGE_NAMES) {
      const { links, ids } = anchors(parse(searchPages[page].md));
      for (const l of links) expect(ids.includes(l) || `#${l}` in PAGE_LINKS, `${page}: #${l}`).toBe(true);
    }
  });

  it('the guide page is the in-app guide, with only its heading, one line and "Open" changed', () => {
    const app = copy.info.guide.md.split('\n');
    const pub = searchPages.guide.md.split('\n');
    const added = pub.filter((l) => !app.includes(l));
    const gone = app.filter((l) => !pub.includes(l));
    expect(gone).toEqual(['# Get your photos back from a memory card with PhotoRec', expect.stringMatching(/^1\. Go back to the start of /)]);
    expect(added).toEqual([
      '# PhotoRec guide: look for lost photos on a memory card',
      '',
      'Already have folders called `recup_dir.1`, `recup_dir.2` and so on? Go to [Part 6: What you’ll see](#part-6-what-youll-see).',
      expect.stringMatching(/^1\. Open \S+\. You can use the \*\*Sort my recovered files\*\* button at the bottom of this page\.$/),
    ].filter((l) => !app.includes(l)));
  });

  it('say nothing from the "Don\'t say" list (team/content/launch-message.md §4, team/brand/voice.md)', () => {
    const DONT = [
      /\brecovers your\b/i, /\brestor(e|es|ed)\b/i, /\brescue/i, /\bbrings? back your\b/i, /\bget your photos back\b/i,
      /\ball your photos\b/i, /\bevery photo\b/i, /\bguarantee/i, /100%/, /\bperfectly\b/i, /\binstant/i, /\bin seconds\b/i,
      /\bAI\b/, /\bsmart\b/i, /\bmagic\b/i, /\bseamless/i, /\beffortless/i, /\bpowerful\b/i, /\bunlock|unleash|supercharge|elevate\b/i,
      /\bduplicates?\b/i, /\bthumbnails?\b/i, /\bjunk\b/i, /\bmetadata\b/i, /\bEXIF\b/, /\bhash\b/i,
      /\bremoves\b|\bcleans up\b|\bfilters out\b/i, /\bsecure/i, /military|bank-level|peace of mind|worry-free/i,
      /\bworks offline\b|\bWi-?Fi\b/i, /\bopen source\b|\bread the code\b/i, /\bthe (only|first|best) (app|tool|program|way)\b|\bunlike\b/i, // "the first try" (Mac steps) is fine
      /\bnever touches\b/i, /\bfree forever\b|\bnothing to buy\b/i, /\bmobile app\b|\bworks on your phone\b/i, /\bupload your\b|\bsign up\b|\byour account\b/i, // the guide's "Sign in" is about Windows and cloud backups
    ];
    const text = SEARCH_PAGE_NAMES.flatMap((p) => [searchPages[p].title, searchPages[p].description, searchPages[p].md, searchPages[p].cta, searchPages[p].other]).join('\n');
    for (const re of DONT) expect(text, String(re)).not.toMatch(re);
  });
});

describe('the search pages stay out of the offline cache', () => {
  it('NOT_PRECACHED covers both folders, and nothing else of the app', () => {
    for (const f of SEARCH_FILES) expect(NOT_PRECACHED.test(f), f).toBe(true);
    for (const f of ['index.html', 'assets/index-AAA.css', 'icons/icon-192.png', 'photorec-guide.png', 'launch/share.png']) {
      expect(NOT_PRECACHED.test(f), f).toBe(f.startsWith('launch/'));
    }
    const sw = `e.precacheAndRoute([{url:"index.html",revision:"1"},{url:"photorec-guide/index.html",revision:"2"}])`;
    expect(precacheProblems(sw)).toEqual(['photorec-guide/index.html is in the offline cache']);
  });
  it('the service worker never answers their addresses with the app page', () => {
    for (const p of ['/photorec-guide/', '/photorec-guide', '/sort-photorec-files-by-date/', '/photorec-guide/index.html']) expect(SEARCH_ROUTES.test(p), p).toBe(true);
    for (const p of ['/', '/index.html', '/photorec-guide-old/', '/assets/photorec-guide/']) expect(SEARCH_ROUTES.test(p), p).toBe(false);
  });
});

describe('sitemap and robots.txt (launch build)', () => {
  it('list the start page and both search pages', () => {
    const xml = sitemapXml();
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([
      'https://upsort.app/', 'https://upsort.app/photorec-guide/', 'https://upsort.app/sort-photorec-files-by-date/',
    ]);
    expect(ROBOTS_TXT_LAUNCH).toContain('Sitemap: https://upsort.app/sitemap.xml');
  });
});

describe('the build step', () => {
  it('finds the app\'s one stylesheet in index.html', () => {
    expect(appStylesheet('<link rel="stylesheet" crossorigin href="./assets/index-X1.css">')).toBe('assets/index-X1.css');
    expect(appStylesheet('<head></head>')).toBeNull();
  });

  it('writes both pages and sitemap.xml from a launch bundle', async () => {
    const plugin = searchPagesPlugin();
    (plugin.configResolved as (c: unknown) => void)({ root: ROOT, mode: 'launch' });
    const emitted: Record<string, string> = {};
    const bundle = {
      'index.html': { type: 'asset', source: `<link rel="stylesheet" crossorigin href="./${CSS}">` },
      [CSS]: { type: 'asset', source: '' },
    };
    const hook = plugin.generateBundle as (this: unknown, o: unknown, b: unknown) => Promise<void>;
    await hook.call({ emitFile: (f: { fileName: string; source: string }) => { emitted[f.fileName] = f.source; } }, {}, bundle);
    expect(Object.keys(emitted).sort()).toEqual([...SEARCH_FILES, 'sitemap.xml'].sort());
    checkPage('guide', emitted['photorec-guide/index.html']);
    checkPage('sort', emitted['sort-photorec-files-by-date/index.html']);
  }, 60_000);

  it('refuses a bundle without the app\'s stylesheet', async () => {
    const plugin = searchPagesPlugin();
    (plugin.configResolved as (c: unknown) => void)({ root: ROOT, mode: 'launch' });
    const hook = plugin.generateBundle as (this: unknown, o: unknown, b: unknown) => Promise<void>;
    await expect(hook.call({ emitFile: () => {} }, {}, { 'index.html': { type: 'asset', source: '<head></head>' } })).rejects.toThrow(/stylesheet/);
  });

  // When `npm run build:launch` has run, check what it really wrote.
  const out = join(ROOT, 'dist-launch');
  it.skipIf(!existsSync(join(out, 'sw.js')))('dist-launch/ holds both pages and the sitemap, none of them precached', () => {
    const index = readFileSync(join(out, 'index.html'), 'utf8');
    const css = appStylesheet(index)!;
    for (const page of SEARCH_PAGE_NAMES) {
      const h = readFileSync(join(out, SEARCH_PAGES[page], 'index.html'), 'utf8');
      checkPage(page, h);
      expect(h).toContain(`href="../${css}"`);
    }
    expect(readFileSync(join(out, 'sitemap.xml'), 'utf8')).toBe(sitemapXml());
    expect(readFileSync(join(out, 'robots.txt'), 'utf8')).toBe(ROBOTS_TXT_LAUNCH);
    expect(precacheProblems(readFileSync(join(out, 'sw.js'), 'utf8'))).toEqual([]);
  });
});
