// Regenerates the raster favicon set from static/favicon.svg.
// Run with: bun run scripts/generate-favicons.mjs (or: node scripts/generate-favicons.mjs)
//
// Outputs into static/ (served at the site root):
//   favicon.ico          16/32/48 multi-resolution, for the default /favicon.ico request
//   apple-touch-icon.png 180x180, opaque, for iOS home screens
//   icon-192.png         PWA / manifest
//   icon-512.png         PWA / manifest
//   icon-maskable.png    512x512 with safe-zone padding, for Android adaptive icons
//
// favicon.svg itself is the source of truth and is committed directly.

import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = join(root, 'static');
const BRAND_DARK = '#1a1916'; // matches the icon background

const svg = await readFile(join(staticDir, 'favicon.svg'));

// Rasterize the SVG to a square PNG buffer of the given size.
// flatten() composites onto the brand colour so transparent corners
// don't turn black on iOS or under Android masks.
function png(size, { flatten = true } = {}) {
	let pipeline = sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain' });
	if (flatten) pipeline = pipeline.flatten({ background: BRAND_DARK });
	return pipeline.png().toBuffer();
}

// Wrap PNG buffers in an ICO container. PNG-in-ICO is supported by every
// modern browser and Windows Vista+. The container format is fixed and tiny.
function buildIco(images) {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0); // reserved
	header.writeUInt16LE(1, 2); // type: 1 = icon
	header.writeUInt16LE(images.length, 4); // image count

	const entries = [];
	const payloads = [];
	let offset = 6 + images.length * 16;

	for (const { size, data } of images) {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 == 256)
		entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
		entry.writeUInt8(0, 2); // palette colour count
		entry.writeUInt8(0, 3); // reserved
		entry.writeUInt16LE(1, 4); // colour planes
		entry.writeUInt16LE(32, 6); // bits per pixel
		entry.writeUInt32LE(data.length, 8); // size of PNG data
		entry.writeUInt32LE(offset, 12); // offset of PNG data
		entries.push(entry);
		payloads.push(data);
		offset += data.length;
	}

	return Buffer.concat([header, ...entries, ...payloads]);
}

// favicon.ico (16/32/48)
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(icoSizes.map((size) => png(size)));
const ico = buildIco(icoSizes.map((size, i) => ({ size, data: icoPngs[i] })));
await writeFile(join(staticDir, 'favicon.ico'), ico);

// apple-touch-icon (180, opaque) and standard PWA icons
await writeFile(join(staticDir, 'apple-touch-icon.png'), await png(180));
await writeFile(join(staticDir, 'icon-192.png'), await png(192));
await writeFile(join(staticDir, 'icon-512.png'), await png(512));

// Maskable icon: content in the central 80% safe zone, brand padding around it.
const maskable = await sharp(svg, { density: 384 })
	.resize(410, 410, { fit: 'contain' })
	.extend({ top: 51, bottom: 51, left: 51, right: 51, background: BRAND_DARK })
	.flatten({ background: BRAND_DARK })
	.png()
	.toBuffer();
await writeFile(join(staticDir, 'icon-maskable.png'), maskable);

console.log('Generated: favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable.png');
