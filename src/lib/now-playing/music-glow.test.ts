import { describe, expect, it } from 'vitest';
import { MUSIC_GLOW_BLOBS, hexToRgb, normalizeGlowPalette } from './music-glow';
import { MUSIC_GLOW_WGSL, paletteToFloat32 } from './webgpu-music-glow';

describe('normalizeGlowPalette', () => {
	it('fills all six shader blobs from the available album colors', () => {
		expect(normalizeGlowPalette(['#123456', '#abcdef'])).toEqual([
			'#123456',
			'#abcdef',
			'#abcdef',
			'#abcdef',
			'#abcdef',
			'#abcdef'
		]);
	});

	it('rejects unusable colors instead of rendering an opaque black glow', () => {
		expect(normalizeGlowPalette(['transparent', '#123'])).toEqual([]);
	});
});

describe('WebGPU music glow data', () => {
	it('keeps the CSS fallback and shader on one six-color contract', () => {
		expect(MUSIC_GLOW_BLOBS).toHaveLength(6);
		expect(MUSIC_GLOW_WGSL).toContain('array<vec4<f32>, 6>');
		expect(MUSIC_GLOW_WGSL).toContain('fn sampleWaveform');
		expect(MUSIC_GLOW_WGSL).toContain('let fieldSize = min');
	});

	it('packs normalized RGB colors and an enabled alpha channel', () => {
		const [red, green, blue] = hexToRgb('#ff8040');
		expect([red, green, blue]).toEqual([1, 128 / 255, 64 / 255]);

		const palette = paletteToFloat32(['#ff0000']);
		expect(palette).toHaveLength(24);
		expect(Array.from(palette.slice(0, 4))).toEqual([1, 0, 0, 1]);
		expect(Array.from(palette.slice(-4))).toEqual([1, 0, 0, 1]);
	});
});
