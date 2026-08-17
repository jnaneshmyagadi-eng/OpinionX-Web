import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function png(size, rgbaFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = rgbaFn(x, y, size);
      const i = 1 + x * 4;
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
      row[i + 3] = a;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function iconPixels(x, y, size) {
  const bg = [10, 10, 11, 255];
  const purple = [147, 51, 234, 255];
  const white = [255, 255, 255, 255];
  const cx = size / 2;
  const cy = size / 2 - size * 0.02;
  const r = size * 0.28;
  const dx = x - cx;
  const dy = y - cy;
  if (dx * dx + dy * dy <= r * r) {
    const stroke = Math.max(1.5, size / 16);
    const inset = r * 0.45;
    const t = Math.abs(Math.abs(dx) - Math.abs(dy));
    if (Math.abs(dx) < inset && Math.abs(dy) < inset && t < stroke) return white;
    return purple;
  }
  return bg;
}

const sizes = {
  "icon-16.png": 16,
  "icon-32.png": 32,
  "icon-192.png": 192,
  "icon-512.png": 512,
  "maskable-192.png": 192,
  "maskable-512.png": 512,
  "apple-touch-icon.png": 180,
};

for (const [name, size] of Object.entries(sizes)) {
  writeFileSync(join(outDir, name), png(size, iconPixels));
}
console.log("PWA icons written to public/icons");
