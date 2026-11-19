// Makes the launch build's example files (D53): samples/sample-pack.wasm, from a PhotoRec output folder.
// Usage: npm run sample-pack -- <photorec-output-dir> [out-file=samples/sample-pack.wasm]
// `npm run build:launch` ships this file next to the page (same origin, not in the offline cache)
// and fails without it. The preview build makes its own copy with make-artifact.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildSamplePack } from './lib/sample-pack.mjs';

const [samplesDir, out = 'samples/sample-pack.wasm'] = process.argv.slice(2);
if (!samplesDir) throw new Error('usage: make-sample-pack.mjs <photorec-output-dir> [out-file]');
const { pack, count, bytes } = buildSamplePack(samplesDir);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pack);
console.log(`${out}: ${count} files, ${(bytes / 1048576).toFixed(1)} MB`);
