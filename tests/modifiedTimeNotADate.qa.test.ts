// T131 (QA): a file's modified time is never date evidence. PhotoRec sets it to the recovery
// time, so a file whose only "date" is its modified time must land in "No date", not in a
// year/month folder, and the review screens must not show it as dated. Control: a JPEG with
// EXIF DateTimeOriginal does get a dated folder. All files are tiny and built in memory.
import { describe, expect, it } from 'vitest';
import { scanAll } from '../src/engine/scan';
import { summarize } from '../src/engine/summary';
import type { FileRecord, FileSource } from '../src/engine/types';
import { buildSheet } from '../src/ui/contactSheet';
import { copy } from '../src/ui/copy';
import { placeFor, planNames } from '../src/ui/savePlan';
import { buildTimeline } from '../src/ui/timeline';

const enc = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
const be16 = (n: number) => new Uint8Array([(n >>> 8) & 255, n & 255]);
const be32 = (n: number) => new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const le16 = (n: number) => new Uint8Array([n & 255, (n >>> 8) & 255]);
const le32 = (n: number) => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, n >>> 24]);
const box = (type: string, ...body: Uint8Array[]) => {
  const b = cat(...body);
  return cat(be32(8 + b.length), enc(type), b);
};

/** APP1 Exif segment holding only DateTimeOriginal (via the Exif sub-IFD), little-endian TIFF. */
function exifApp1(dateTimeOriginal: string): Uint8Array {
  const date = cat(enc(dateTimeOriginal), new Uint8Array([0])); // 20 bytes incl. NUL
  // TIFF layout: header(8) | IFD0 @8: 1 entry (2+12+4=18) | ExifIFD @26: 1 entry (18) | date @44
  const tiff = cat(
    enc('II'), le16(42), le32(8),
    le16(1), le16(0x8769), le16(4), le32(1), le32(26), le32(0),
    le16(1), le16(0x9003), le16(2), le32(date.length), le32(44), le32(0),
    date,
  );
  const body = cat(enc('Exif\0\0'), tiff);
  return cat(new Uint8Array([0xff, 0xe1]), be16(body.length + 2), body);
}

/** Minimal valid baseline JPEG (SOI, [APP1], APP0, SOF0 w x h, SOS, data, EOI), large enough to be kept. */
function jpeg(w: number, h: number, app1?: Uint8Array): Uint8Array {
  return cat(
    new Uint8Array([0xff, 0xd8]),
    app1 ?? new Uint8Array(),
    new Uint8Array([0xff, 0xe0, 0x00, 0x10, ...enc('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    new Uint8Array([0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]),
    new Uint8Array([0xff, 0xda, 0x00, 0x0c, 3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0]),
    new Uint8Array(30_000).fill(0x55),
    new Uint8Array([0xff, 0xd9]),
  );
}

/** MP4 whose mvhd creation/modification times are 0 (unset) and with no QuickTime 'meta' date. */
function undatedMp4(): Uint8Array {
  const mvhd = box('mvhd', new Uint8Array([0, 0, 0, 0]), be32(0), be32(0), be32(600), be32(6000), new Uint8Array(80));
  return cat(box('ftyp', enc('isom'), be32(0x200), enc('isomiso2mp41')), box('moov', mvhd), box('mdat', new Uint8Array(40_000)));
}

// Realistic PhotoRec modified time: the day of the recovery, not the day the photo was taken.
const RECOVERY_TIME = Date.parse('2026-11-20T14:03:00Z');

/** Same shape as the scan worker's fromFile (src/worker/scan.worker.ts): a real File with a lastModified. */
const fromFile = (f: File, path: string): FileSource => ({
  path,
  size: f.size,
  read: async (start, end) => new Uint8Array(await f.slice(start, end).arrayBuffer()),
});
const file = (path: string, data: Uint8Array, lastModified = RECOVERY_TIME) =>
  fromFile(new File([data as BlobPart], path.slice(path.lastIndexOf('/') + 1), { lastModified }), path);

describe('T131: modified time is never used as a date', () => {
  const cases = {
    a: file('recup_dir.1/holiday.jpg', jpeg(1200, 900)), // no EXIF, realistic lastModified
    b: file('recup_dir.1/f1234567.jpg', jpeg(1600, 1200)), // PhotoRec-style name, no metadata
    c: file('recup_dir.2/f7654321.mp4', undatedMp4()), // video, no mvhd/QuickTime date
    d: file('recup_dir.2/f2222222.jpg', jpeg(1200, 900, exifApp1('2019:07:04 18:30:05'))), // control
  };
  const order = ['a', 'b', 'c', 'd'] as const;

  const scan = async () => {
    const recs = await scanAll(order.map((k) => cases[k]));
    expect(recs).not.toBeNull();
    return Object.fromEntries(order.map((k, i) => [k, recs!.find((r) => r.index === i)!])) as Record<(typeof order)[number], FileRecord>;
  };

  it('all four files stay in Keep (so the date question is about real keepers)', async () => {
    const r = await scan();
    for (const k of order) expect(r[k].group, k).toBe('keep');
    expect(r.c.kind).toBe('mp4');
  });

  it('gives no takenAt to files whose only time is the modified time, and reads EXIF for the control', async () => {
    const r = await scan();
    expect(r.a.takenAt).toBeUndefined();
    expect(r.b.takenAt).toBeUndefined();
    expect(r.c.takenAt).toBeUndefined();
    expect(r.d.takenAt).toBe('2019-07-04T18:30:05');
  });

  it('saves (a)-(c) in "No date" under their own names, and (d) in its year/month folder', async () => {
    const r = await scan();
    const recoveryYear = new Date(RECOVERY_TIME).getUTCFullYear().toString();
    for (const k of ['a', 'b', 'c'] as const) {
      const p = placeFor(r[k]);
      expect(p.dir, k).toEqual([copy.save.noDateFolder]);
      expect(p.dir.join('/'), k).not.toContain(recoveryYear);
    }
    expect(placeFor(r.b)).toMatchObject({ base: 'f1234567', ext: 'jpg' });
    expect(placeFor(r.d).dir).toEqual(['2019', copy.save.monthFolder('07')]);

    // Same through the whole save plan (zip and folder saves both name files from placeFor).
    const planned = planNames(order.map((k) => r[k]));
    const dirOf = (k: keyof typeof r) => planned.find((p) => p.id === r[k].index)!.dir;
    expect(dirOf('a')).toEqual(['No date']);
    expect(dirOf('b')).toEqual(['No date']);
    expect(dirOf('c')).toEqual(['No date']);
    expect(dirOf('d')).toEqual(['2019', '07 July']);
    expect(planned.find((p) => p.id === r.d.index)!.name).toBe('2019-07-04 18.30.jpg');
  });

  it('the review screens show (a)-(c) as having no date, not as recovery-day photos', async () => {
    const r = await scan();
    const all = order.map((k) => r[k]);
    const photos = [r.a, r.b, r.d];

    const sheet = buildSheet(photos);
    expect(sheet.undated.count).toBe(2);
    expect(sheet.years).toEqual([{ year: '2019', count: 1 }]);

    const s = summarize(all);
    expect(s.undated).toBe(2); // photos only; the video counts separately
    expect(s.firstYear).toBe(2019);
    expect(s.lastYear).toBe(2019);

    const tl = buildTimeline(all);
    const flat = JSON.stringify(tl);
    expect(flat).not.toContain('2026');
    expect(flat).toContain('2019');
  });
});
