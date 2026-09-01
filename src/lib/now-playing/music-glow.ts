export interface MusicGlowBlob {
	x: number;
	y: number;
	size: number;
	duration: number;
	delay: number;
	drift: readonly [number, number, number, number, number, number, number, number];
	morphDuration: number;
	morphDelay: number;
	shapes: readonly [string, string, string, string];
}

export const MUSIC_GLOW_BLOBS = [
	{
		x: 50,
		y: 50,
		size: 240,
		duration: 24,
		delay: -8,
		drift: [12, -8, -14, 10, 8, -12, -6, 14],
		morphDuration: 30,
		morphDelay: 0,
		shapes: [
			'50% 50% 40% 60% / 60% 30% 70% 40%',
			'40% 60% 55% 45% / 45% 55% 35% 65%',
			'55% 45% 50% 50% / 35% 65% 50% 50%',
			'45% 55% 60% 40% / 55% 45% 40% 60%'
		]
	},
	{
		x: 38,
		y: 36,
		size: 200,
		duration: 20,
		delay: 0,
		drift: [20, -15, -25, 18, 15, -20, -12, 22],
		morphDuration: 26,
		morphDelay: -7,
		shapes: [
			'30% 70% 70% 30% / 30% 30% 70% 70%',
			'60% 40% 35% 65% / 55% 45% 50% 50%',
			'45% 55% 60% 40% / 40% 60% 45% 55%',
			'70% 30% 40% 60% / 50% 50% 35% 65%'
		]
	},
	{
		x: 62,
		y: 62,
		size: 180,
		duration: 25,
		delay: -5,
		drift: [-18, 22, 25, -20, -22, 16, 20, -24],
		morphDuration: 34,
		morphDelay: -12,
		shapes: [
			'70% 30% 30% 70% / 60% 40% 60% 40%',
			'35% 65% 55% 45% / 45% 55% 40% 60%',
			'55% 45% 40% 60% / 35% 65% 55% 45%',
			'40% 60% 65% 35% / 55% 45% 35% 65%'
		]
	},
	{
		x: 65,
		y: 30,
		size: 160,
		duration: 18,
		delay: -10,
		drift: [140, 60, -100, 180, 80, -160, -120, 100],
		morphDuration: 22,
		morphDelay: -4,
		shapes: [
			'40% 60% 30% 70% / 50% 60% 40% 50%',
			'65% 35% 50% 50% / 40% 60% 55% 45%',
			'35% 65% 60% 40% / 60% 40% 35% 65%',
			'55% 45% 45% 55% / 35% 65% 60% 40%'
		]
	},
	{
		x: 32,
		y: 68,
		size: 150,
		duration: 22,
		delay: -3,
		drift: [-160, -80, 120, -140, -90, 180, 100, -120],
		morphDuration: 28,
		morphDelay: -9,
		shapes: [
			'60% 40% 70% 30% / 40% 50% 60% 50%',
			'45% 55% 35% 65% / 55% 45% 40% 60%',
			'50% 50% 55% 45% / 40% 60% 50% 50%',
			'35% 65% 45% 55% / 60% 40% 55% 45%'
		]
	},
	{
		x: 45,
		y: 25,
		size: 140,
		duration: 20,
		delay: -6,
		drift: [-60, -180, 80, 140, -120, -100, 160, 60],
		morphDuration: 26,
		morphDelay: -14,
		shapes: [
			'45% 55% 35% 65% / 50% 40% 60% 50%',
			'55% 45% 60% 40% / 40% 60% 45% 55%',
			'40% 60% 50% 50% / 55% 45% 50% 50%',
			'60% 40% 45% 55% / 45% 55% 55% 45%'
		]
	}
] as const satisfies readonly MusicGlowBlob[];

export function normalizeGlowPalette(colors: readonly string[]): string[] {
	const valid = colors.filter((color) => /^#[\da-f]{6}$/i.test(color));
	if (valid.length === 0) return [];

	return Array.from(
		{ length: MUSIC_GLOW_BLOBS.length },
		(_, index) => valid[index] ?? valid[valid.length - 1]
	);
}

export function hexToRgb(hex: string): readonly [number, number, number] {
	const value = Number.parseInt(hex.slice(1), 16);
	return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}
