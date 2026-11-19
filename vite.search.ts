// D51 (owner, Nov 13): the two plain search pages on the public site (the PhotoRec guide and "Sort
// PhotoRec files by date") and the sitemap that lists them. Launch build only (vite.config.ts).
// The pages are drawn by src/ui/searchPage.tsx from copy.ts, loaded through Vite because they are
// app code. They have no script, use the app's own stylesheet and fonts, carry the same CSP as the
// app, and are kept out of the offline cache (vite.launch.ts NOT_PRECACHED, precacheGuard).
import { resolve } from 'node:path'
import { runnerImport } from 'vite'
import type { Plugin, ResolvedConfig } from 'vite'
import { SEARCH_PAGES, SITE_URL } from './src/brand.ts'
import { CSP } from './vite.deploy.ts'

type SearchPage = keyof typeof SEARCH_PAGES
/** What src/ui/searchPage.tsx gives the build. */
type Renderer = {
  SEARCH_PAGE_NAMES: SearchPage[]
  searchPageHtml: (page: SearchPage, opts: { css: string; csp: string }) => string
}

/** The pages' folders without the trailing slash: 'photorec-guide', … */
export const SEARCH_DIRS: string[] = Object.values(SEARCH_PAGES).map((d) => d.replace(/\/$/, ''))

/** The files the launch build writes for the pages. */
export const SEARCH_FILES: string[] = SEARCH_DIRS.map((d) => `${d}/index.html`)

/**
 * Addresses the service worker must never answer with the app's page (its navigateFallback):
 * someone who has opened the app before still gets the real search page.
 */
export const SEARCH_ROUTES = new RegExp(`^/(?:${SEARCH_DIRS.join('|')})(?:/|$)`)

/** The launch build's sitemap.xml: the app's start page and the search pages. */
export function sitemapXml(siteUrl: string = SITE_URL): string {
  const urls = [siteUrl, ...Object.values(SEARCH_PAGES).map((d) => siteUrl + d)]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')
}

/** The app's stylesheet, as index.html links it ('assets/index-AbC.css'), or null if there is none. */
export function appStylesheet(html: string): string | null {
  const links = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].map((m) => /\bhref="(?:\.\/|\/)?(assets\/[^"]+\.css)"/.exec(m[0])?.[1])
  const css = links.filter((x): x is string => !!x)
  return css.length === 1 ? css[0] : null
}

/** Writes the search pages and sitemap.xml into the launch build. */
export const searchPages = (): Plugin => {
  let config: ResolvedConfig
  return {
    name: 'keepsake-search-pages',
    apply: 'build',
    enforce: 'post', // after Vite has written index.html, so the stylesheet's hashed name is known
    configResolved(c) { config = c },
    async generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset') throw new Error('search pages: index.html missing from the build')
      const css = appStylesheet(String(index.source))
      if (!css || !bundle[css]) throw new Error('search pages: the app\'s stylesheet was not found in index.html')
      const { module } = await runnerImport<Renderer>(resolve(config.root, 'src/ui/searchPage.tsx'), {
        root: config.root, mode: config.mode, configFile: false, logLevel: 'warn',
      })
      for (const page of module.SEARCH_PAGE_NAMES) {
        this.emitFile({ type: 'asset', fileName: `${SEARCH_PAGES[page]}index.html`, source: module.searchPageHtml(page, { css, csp: CSP }) })
      }
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml() })
    },
  }
}
