// The example-files pack (src/sample.ts reads it): 4-byte big-endian index length, a JSON index
// [{ path, size }], then the files' bytes in order. Used by make-artifact.mjs (the preview build)
// and make-sample-pack.mjs (the launch build's samples/sample-pack.wasm, D53).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Packs a PhotoRec output folder, kept under `limit` bytes by dropping some large photos evenly. */
export function buildSamplePack(samplesDir, limit = 14 * 1024 * 1024) {
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)])).sort();
  let files = walk(samplesDir).map((p) => ({ path: relative(samplesDir, p).split('\\').join('/'), data: readFileSync(p) }));
  const total = () => files.reduce((n, f) => n + f.data.length, 0);
  // Drop every other large JPEG until it fits; if that runs out, drop the largest files of any kind.
  let size = total();
  while (size > limit) {
    let k = 0;
    const before = files.length;
    files = files.filter((f) => {
      const drop = size > limit && f.path.endsWith('.jpg') && f.data.length > 60_000 && ++k % 2 === 0;
      if (drop) size -= f.data.length;
      return !drop;
    });
    if (files.length === before) {
      const biggest = files.reduce((a, b) => (b.data.length > a.data.length ? b : a));
      files = files.filter((f) => f !== biggest);
      size -= biggest.data.length;
    }
  }
  const index = Buffer.from(JSON.stringify(files.map((f) => ({ path: f.path, size: f.data.length }))));
  const head = Buffer.alloc(4);
  head.writeUInt32BE(index.length);
  return { pack: Buffer.concat([head, index, ...files.map((f) => f.data)]), count: files.length, bytes: total() };
}
