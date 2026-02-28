import { resolve } from 'path';
import sharp from 'sharp';
import { Vibrant } from 'node-vibrant/node';
import type { TimelineEntry } from '$lib/types/timeline';

const SWATCH_PRIORITY = [
	'Vibrant',
	'DarkVibrant',
	'LightVibrant',
	'Muted',
	'DarkMuted',
	'LightMuted'
] as const;

async function extractColor(logoFilename: string): Promise<string | null> {
	try {
		const logoPath = resolve('static/assets', logoFilename);
		const buffer = await sharp(logoPath).resize(64, 64, { fit: 'cover' }).png().toBuffer();
		const palette = await Vibrant.from(buffer).getPalette();

		for (const key of SWATCH_PRIORITY) {
			const swatch = palette[key];
			if (swatch) return swatch.hex;
		}

		return null;
	} catch (e) {
		console.warn(`[extract-color] Failed for "${logoFilename}":`, e);
		return null;
	}
}

export async function extractColorsForEntries(entries: TimelineEntry[]): Promise<TimelineEntry[]> {
	const results = await Promise.all(
		entries.map(async (entry) => {
			if (entry.data.color || !entry.data.logo) return entry;

			const hex = await extractColor(entry.data.logo);
			if (!hex) return entry;

			return {
				...entry,
				data: { ...entry.data, color: hex }
			} as TimelineEntry;
		})
	);
	return results;
}
