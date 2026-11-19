// Build-time pieces for the public launch page (D41–D43): the <head> tags, made from src/brand.ts,
// and the guard that keeps launch files (video, captions, share image) out of the offline cache.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { APP_NAME, DESCRIPTION, SHARE_DESCRIPTION, SHARE_IMAGE, SHARE_IMAGE_ALT, SHARE_TITLE, SITE_TITLE, SITE_URL } from './src/brand.ts'

/** The marker in index.html that the head tags replace. */
export const HEAD_MARKER = '<!-- brand-head -->'

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The page's <title>, description and share tags. The tags that need a full address (canonical,
 * og:url, og:image) are only written when `siteUrl` is set (D42: empty until the domain is bought).
 * `title` lets the test builds use their own marked title.
 */
export function headTags(siteUrl: string = SITE_URL, title: string = SITE_TITLE): string {
  const tags = [
    `<title>${attr(title)}</title>`,
    `<meta name="description" content="${attr(DESCRIPTION)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${attr(APP_NAME)}" />`,
    `<meta property="og:title" content="${attr(SHARE_TITLE)}" />`,
    `<meta property="og:description" content="${attr(SHARE_DESCRIPTION)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ]
  if (siteUrl) {
    const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`
    tags.push(
      `<link rel="canonical" href="${attr(base)}" />`,
      `<meta property="og:url" content="${attr(base)}" />`,
      `<meta property="og:image" content="${attr(base + SHARE_IMAGE)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${attr(SHARE_IMAGE_ALT)}" />`,
    )
  }
  return tags.join('\n    ')
}

/** Writes the head tags into index.html (dev server and every build). Runs before other HTML hooks. */
export const brandHead = (title?: string): Plugin => ({
  name: 'keepsake-brand-head',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => {
      if (!html.includes(HEAD_MARKER)) throw new Error(`index.html: ${HEAD_MARKER} not found`)
      return html.replace(HEAD_MARKER, headTags(SITE_URL, title))
    },
  },
})

/**
 * The example files (D53): one pack, fetched by src/sample.ts as `./sample-pack.wasm` (same origin).
 * The .wasm name is only there because the claude.ai preview host serves that binary type.
 */
export const SAMPLE_PACK = 'sample-pack.wasm'
/** Where the launch build reads the pack from (gitignored; `npm run sample-pack -- <photorec-dir>` makes it). */
export const SAMPLE_PACK_SOURCE = `samples/${SAMPLE_PACK}`

/**
 * Files the offline cache must never hold: anything under launch/, any video or captions file, and
 * the example-files pack (~14 MB, fetched only when someone presses "Try with example files").
 */
export const NOT_PRECACHED = /(^|\/)launch\/|\.(mp4|webm|vtt)(\?|$)|(^|\/)sample-pack\.wasm(\?|$)/i

/** What's wrong with a sample pack's bytes (empty = fine): 4-byte index length, JSON index, file bytes. */
export function samplePackProblems(buf: Uint8Array): string[] {
  if (buf.length < 4) return ['too short']
  const len = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(0)
  if (4 + len > buf.length) return [`index length ${len} runs past the end`]
  let index: unknown
  try { index = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + len))) } catch { return ['index is not JSON'] }
  if (!Array.isArray(index) || !index.length) return ['index is empty']
  const bad = index.filter((e) => typeof e?.path !== 'string' || !e.path || !Number.isInteger(e?.size) || e.size < 0)
  if (bad.length) return [`${bad.length} index entries lack a path or size`]
  const total = 4 + len + index.reduce((n: number, e: { size: number }) => n + e.size, 0)
  return total === buf.length ? [] : [`index adds up to ${total} bytes, the pack has ${buf.length}`]
}

/**
 * Launch build only (D53): ships the example-files pack as a plain same-origin file next to the page.
 * Fails if the pack is missing or malformed, so the button never ships without its files. It is
 * left out of the offline cache (globIgnores, and precacheGuard checks it).
 */
export const samplePack = (source: string = process.env.SAMPLE_PACK || SAMPLE_PACK_SOURCE): Plugin => ({
  name: 'keepsake-sample-pack',
  apply: 'build',
  generateBundle() {
    if (!existsSync(source)) throw new Error(`sample pack: ${source} not found (make it with \`npm run sample-pack -- <photorec-output-dir>\`, or set SAMPLE_PACK)`)
    const bytes = readFileSync(source)
    const problems = samplePackProblems(bytes)
    if (problems.length) throw new Error(`sample pack ${source}: ${problems.join('; ')}`)
    this.emitFile({ type: 'asset', fileName: SAMPLE_PACK, source: bytes })
  },
})

/** The URLs in a generated sw.js precache list. */
export function precacheUrls(sw: string): string[] {
  return [...sw.matchAll(/\burl:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1])
}

/** Precache entries that break the rule above (empty = fine). Also fails if no list is found. */
export function precacheProblems(sw: string): string[] {
  const urls = precacheUrls(sw)
  if (!urls.length) return ['no precache list found in sw.js']
  return urls.filter((u) => NOT_PRECACHED.test(u)).map((u) => `${u} is in the offline cache`)
}

/**
 * Fails the build if the service worker would cache a launch file. Runs after the PWA plugin has
 * written sw.js (closeBundle, order 'post').
 */
export const precacheGuard = (): Plugin => {
  let config: ResolvedConfig
  return {
    name: 'keepsake-precache-guard',
    apply: 'build',
    configResolved(c) { config = c },
    closeBundle: {
      order: 'post',
      sequential: true,
      handler() {
        const file = resolve(config.root, config.build.outDir, 'sw.js')
        if (!existsSync(file)) throw new Error(`precache guard: ${file} not found`)
        const problems = precacheProblems(readFileSync(file, 'utf8'))
        if (problems.length) throw new Error(`precache guard: ${problems.join('; ')}`)
      },
    },
  }
}
