// D51 (owner, Nov 13): the two plain search pages on the public site, the PhotoRec guide and "Sort
// PhotoRec files by date". The launch build (vite.search.ts) runs this in Node and writes the HTML;
// the app never imports it. The pages have no script, load only the app's own stylesheet (and so
// its own fonts) and draw the text the way the in-app reading pages do (InfoPage.tsx): same
// classes, same Quiet Prints look. Words: copy.ts `searchPages`.
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { APP_NAME, REPO_URL, SEARCH_PAGES, SHARE_IMAGE, SHARE_IMAGE_ALT, SITE_URL } from '../brand';
import { searchPages } from './copy';
import { LogoMark } from './icons';
import { parse } from './markdown';
import type { Block, Inline } from './markdown';

export type SearchPage = keyof typeof SEARCH_PAGES;
export const SEARCH_PAGE_NAMES = Object.keys(SEARCH_PAGES) as SearchPage[];

/**
 * Where the pages' named links lead, relative to a page (every page is one folder below the app,
 * so the links work at any address the site is served from).
 */
export const PAGE_LINKS: Readonly<Record<string, string>> = {
  '#to-app': '../',
  '#to-guide': `../${SEARCH_PAGES.guide}`,
  '#to-sort': `../${SEARCH_PAGES.sort}`,
};

/**
 * `<a>` links drawn as the app's own buttons (.btn-primary, .btn-secondary in app.css, which only
 * has <button> buttons): laid out like a button, no underline, and the button's own text colour
 * kept on hover. Nothing else is added to the look.
 */
const LINK_BUTTONS = 'a.btn{display:inline-flex;align-items:center;justify-content:center;text-align:center;text-decoration:none}a.btn-primary,a.btn-primary:hover{color:#FFFFFF}a.btn-secondary,a.btn-secondary:hover{color:var(--ink)}';

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function Words({ c }: { c: Inline[] }): ReactNode {
  return c.map((x, i) =>
    x.t === 'text' ? <Fragment key={i}>{x.v}</Fragment>
      : x.t === 'code' ? <code key={i}>{x.v}</code>
        : x.t === 'b' ? <strong key={i}><Words c={x.c} /></strong>
          : x.away
            ? <a key={i} href={x.href} target="_blank" rel="noopener noreferrer"><Words c={x.c} /></a>
            : <a key={i} href={PAGE_LINKS[x.href] ?? x.href}><Words c={x.c} /></a>,
  );
}

function Lines({ lines }: { lines: Inline[][] }) {
  return lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}<Words c={l} /></Fragment>);
}

function Blocks({ blocks }: { blocks: Block[] }): ReactNode {
  return blocks.map((b, i) => {
    switch (b.t) {
      case 'h': {
        const H = `h${b.level}` as const;
        return <H key={i} id={b.id}><Words c={b.c} /></H>;
      }
      case 'p':
        return <p key={i}><Lines lines={b.lines} /></p>;
      case 'list': {
        const items = b.items.map((item, j) => (
          <li key={j}>
            {item[0]?.t === 'p' ? <Lines lines={item[0].lines} /> : <Blocks blocks={[item[0]]} />}
            <Blocks blocks={item.slice(1)} />
          </li>
        ));
        return b.ordered ? <ol key={i} start={b.start === 1 ? undefined : b.start}>{items}</ol> : <ul key={i}>{items}</ul>;
      }
      case 'shot':
        return null; // a screenshot still to come is for the team, not for a public page
      case 'rule':
        return <hr key={i} />;
    }
  });
}

function Body({ page }: { page: SearchPage }) {
  const c = searchPages[page];
  const other: SearchPage = page === 'guide' ? 'sort' : 'guide';
  return (
    <>
      <a className="skip" href="#main">{searchPages.skip}</a>
      <header className="topbar">
        <div className="brand">
          <LogoMark />
          <span>{APP_NAME}</span>
        </div>
      </header>
      <main id="main" className="page narrow info">
        <article className="doc">
          <Blocks blocks={parse(c.md)} />
        </article>
        <div className="actions">
          <a className="btn btn-primary" href={PAGE_LINKS['#to-app']}>{c.cta}</a>
          <a className="btn btn-secondary" href={PAGE_LINKS[`#to-${other}`]}>{c.other}</a>
        </div>
        <footer className="start-foot">
          <LogoMark mono size={24} />
          <span className="start-foot-name">{APP_NAME}</span>
          <span className="start-foot-line">{searchPages.tagline}</span>
          {REPO_URL && <a className="start-foot-code" href={REPO_URL} target="_blank" rel="noopener noreferrer">{searchPages.sourceCode}</a>}
        </footer>
      </main>
    </>
  );
}

/** The page's full address (its canonical URL). */
export const pageUrl = (page: SearchPage, siteUrl: string = SITE_URL) => `${siteUrl}${SEARCH_PAGES[page]}`;

/**
 * One page's HTML. `css` is the app's built stylesheet relative to the site root (e.g.
 * 'assets/index-AbC.css'); `csp` is the app's policy, written into the page as a <meta> tag.
 */
export function searchPageHtml(page: SearchPage, { css, csp, siteUrl = SITE_URL }: { css: string; csp: string; siteUrl?: string }): string {
  const c = searchPages[page];
  const url = pageUrl(page, siteUrl);
  const h1 = parse(c.md).find((b) => b.t === 'h' && b.level === 1);
  const heading = h1?.t === 'h' ? h1.c.map((x) => (x.t === 'text' || x.t === 'code' ? x.v : '')).join('') : c.title;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${attr(csp)}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${attr(c.title)}</title>
    <meta name="description" content="${attr(c.description)}" />
    <link rel="canonical" href="${attr(url)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${attr(APP_NAME)}" />
    <meta property="og:title" content="${attr(heading)}" />
    <meta property="og:description" content="${attr(c.description)}" />
    <meta property="og:url" content="${attr(url)}" />
    <meta property="og:image" content="${attr(siteUrl + SHARE_IMAGE)}" />
    <meta property="og:image:alt" content="${attr(SHARE_IMAGE_ALT)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#23596B" />
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <link rel="stylesheet" href="../${attr(css)}" />
    <style>${LINK_BUTTONS}</style>
  </head>
  <body>
    ${renderToStaticMarkup(<Body page={page} />)}
  </body>
</html>
`;
}
