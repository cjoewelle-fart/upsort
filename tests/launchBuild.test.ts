// Release checklist §5: the launch build switch. `npm run build:launch` (vite build --mode launch)
// is indexable and needs SITE_URL; every other build stays the no-index beta build.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SHARE_IMAGE, SITE_URL } from '../src/brand';
import type { UserConfig } from 'vite';
import { copy } from '../src/ui/copy';
import viteConfig from '../vite.config';
import { NOT_PRECACHED, SAMPLE_PACK, headTags, samplePack, samplePackProblems } from '../vite.launch';
import {
  CSP, LAUNCH_NEEDS_SITE_URL, ROBOTS_TXT, ROBOTS_TXT_LAUNCH, deployFiles, headersFile, launchHtmlProblems, launchProblems, workerPaths,
} from '../vite.deploy';

const files = {
  'assets/thumb.worker-AAA.js': 'self.onmessage = () => {}',
  'assets/heic.worker-BBB.js': 'const m = new WebAssembly.Module(bytes)',
  'assets/index-DDD.js': 'console.log(1)',
};
const workers = workerPaths(files);
const ok = { publicRobots: false, shareImage: true };

describe('launch headers', () => {
  it('drop only the X-Robots-Tag line; every other header is the same', () => {
    const beta = headersFile(workers);
    const launch = headersFile(workers, CSP, { indexable: true });
    expect(beta).toContain('  X-Robots-Tag: noindex, nofollow\n');
    expect(launch).not.toMatch(/X-Robots-Tag/i);
    expect(launch).toBe(beta.replace('  X-Robots-Tag: noindex, nofollow\n', ''));
    expect(headersFile(workers, CSP, {})).toBe(beta); // the default stays the beta build
  });
  it('robots.txt allows indexing only in the launch build', () => {
    expect(ROBOTS_TXT).toBe('User-agent: *\nDisallow: /\n');
    expect(ROBOTS_TXT_LAUNCH).toBe('User-agent: *\nAllow: /\n');
  });
});

describe('launch guards', () => {
  it('ships with the launch address (D42, upsort.app), so a launch build is allowed', () => {
    expect(SITE_URL).toBe('https://upsort.app/');
    expect(launchProblems({ siteUrl: '', ...ok })[0]).toContain(LAUNCH_NEEDS_SITE_URL);
  });
  it('need an https address with the trailing slash', () => {
    for (const bad of ['', 'example.org/', 'http://example.org/', 'https://example.org', 'https:///', 'https://exa mple.org/', 'https://example.org/app']) {
      expect(launchProblems({ siteUrl: bad, ...ok }), bad).toEqual([expect.stringContaining('launch build needs SITE_URL in src/brand.ts (D42)')]);
    }
    for (const good of ['https://example.org/', 'https://www.example.org/app/']) expect(launchProblems({ siteUrl: good, ...ok }), good).toEqual([]);
  });
  it('refuse a hand-made public/robots.txt and a missing share image', () => {
    expect(launchProblems({ siteUrl: 'https://example.org/', publicRobots: true, shareImage: true })).toEqual(['public/robots.txt found: the launch build generates robots.txt, remove it']);
    expect(launchProblems({ siteUrl: 'https://example.org/', publicRobots: false, shareImage: false })).toEqual([`public/${SHARE_IMAGE} missing: the og:image tag points at it`]);
  });
  it('need the canonical and og:image tags in the built page', () => {
    const site = 'https://example.org/';
    expect(launchHtmlProblems(`<head>${headTags(site)}</head>`, site)).toEqual([]);
    expect(launchHtmlProblems(`<head>${headTags('')}</head>`, site)).toHaveLength(2);
  });
  it('the beta plugin has no launch step; the launch plugin accepts the launch address', () => {
    expect(() => (deployFiles().config as () => void).call({})).not.toThrow();
    expect(() => (deployFiles({ launch: true }).config as () => void).call({})).not.toThrow();
  });
});

describe('build config', () => {
  const config = readFileSync(join(__dirname, '..', 'vite.config.ts'), 'utf8');
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  it('has a launch mode writing to dist-launch/, the only one passing launch', () => {
    expect(pkg.scripts['build:launch']).toBe('tsc -b && vite build --mode launch');
    expect(config).toContain("mode === LAUNCH ? { outDir: 'dist-launch' }");
    expect(config.match(/deployFiles\(\{ launch: true \}\)/g)?.length).toBe(1);
    expect(config).toMatch(/mode === LAUNCH \? \[brandHead\(\), react\(\), csp\(\), offline\(\), installTags\(\), deployFiles\(\{ launch: true \}\), samplePack\(\), precacheGuard\(\)\]/);
    expect(readFileSync(join(__dirname, '..', '.gitignore'), 'utf8')).toMatch(/^dist-launch\/$/m);
  });
});

// D53: the launch build has the "Try with example files" button and ships the pack, same origin.
describe('example files (D53)', () => {
  const config = readFileSync(join(__dirname, '..', 'vite.config.ts'), 'utf8');
  const plugins = (mode: string) => (viteConfig as (env: { mode: string; command: 'build' }) => UserConfig)({ mode, command: 'build' });
  const samplesDefine = (mode: string) => (plugins(mode).define as Record<string, string> | undefined)?.['import.meta.env.VITE_SAMPLES'];
  const names = (mode: string) => (plugins(mode).plugins as unknown[]).flat(3).map((p) => (p as { name?: string })?.name);

  it('the launch build always turns the button on; test builds force it off; others follow the environment', () => {
    expect(samplesDefine('launch')).toBe('"1"');
    expect(samplesDefine('testbuild')).toBe('"0"');
    expect(samplesDefine('artifact-test')).toBe('"0"');
    expect(samplesDefine('production')).toBeUndefined(); // npm run build: unchanged, no .env turns it on
    expect(samplesDefine('artifact')).toBeUndefined(); // .env.artifact sets VITE_SAMPLES=1
    expect(existsSync(join(__dirname, '..', '.env'))).toBe(false);
    expect(existsSync(join(__dirname, '..', '.env.production'))).toBe(false);
  });
  it('only the launch build ships the pack', () => {
    expect(names('launch')).toContain('keepsake-sample-pack');
    for (const mode of ['production', 'testbuild', 'artifact', 'artifact-test']) expect(names(mode), mode).not.toContain('keepsake-sample-pack');
  });
  it('the pack name matches what the page fetches, and stays out of the offline cache', () => {
    expect(readFileSync(join(__dirname, '..', 'src', 'sample.ts'), 'utf8')).toContain(`fetch('./${SAMPLE_PACK}')`);
    expect(NOT_PRECACHED.test(SAMPLE_PACK)).toBe(true);
    expect(config).toContain(`globIgnores: ['launch/**', '${SAMPLE_PACK}']`);
  });
  it('checks the pack format before shipping it', () => {
    const pack = (index: unknown, body: number) => {
      const json = new TextEncoder().encode(JSON.stringify(index));
      const out = new Uint8Array(4 + json.length + body);
      new DataView(out.buffer).setUint32(0, json.length);
      out.set(json, 4);
      return out;
    };
    expect(samplePackProblems(pack([{ path: 'recup_dir.1/f1.jpg', size: 3 }, { path: 'recup_dir.1/f2.txt', size: 2 }], 5))).toEqual([]);
    expect(samplePackProblems(pack([{ path: 'a.jpg', size: 3 }], 2))).toEqual([expect.stringContaining('adds up to')]);
    expect(samplePackProblems(pack([], 0))).toEqual(['index is empty']);
    expect(samplePackProblems(pack([{ size: 1 }], 1))).toEqual(['1 index entries lack a path or size']);
    expect(samplePackProblems(new TextEncoder().encode('<!doctype html><html></html>'))).not.toEqual([]); // a host's page fallback
  });
  it('the launch build fails without the pack', () => {
    const plugin = samplePack(join(__dirname, 'no-such-pack.wasm'));
    expect(() => (plugin.generateBundle as () => void).call({ emitFile: () => '' })).toThrow(/sample pack: .*not found/);
  });
  it('offline, the button says why on the start screen (same wording as the video)', () => {
    expect(copy.start.samplesOffline).toBe('The example files need an internet connection. Everything else here works offline.');
    expect(readFileSync(join(__dirname, '..', 'src', 'App.tsx'), 'utf8')).toContain('startWithNote(copy.start.samplesOffline)');
  });
});
