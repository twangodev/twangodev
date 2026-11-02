import { describe, it, expect } from 'vitest';
import { gridView, spring } from './navigation';
import { floorCoordinates } from './overview';
describe('compact model navigation', () => {
	it('shows nine real modules and keeps MTP off the evaluated data path', () => {
		const v = gridView('tiny', []);
		expect(v.tiles).toHaveLength(9);
		expect(v.edges.flat()).not.toContain('mtp');
		expect(v.edges).toContainEqual(['text-output', 'talker-system']);
	});
	it.each(['tiny', 'flash'] as const)(
		'%s uses proportional overview volumes and a forward data path',
		(variant) => {
			const view = gridView(variant, []);
			const thinker = view.tiles.find((tile) => tile.id === 'decoder')!;
			for (const tile of view.tiles) {
				expect((tile.scale! / thinker.scale!) ** 3).toBeCloseTo(
					tile.parameters! / thinker.parameters!,
					10
				);
				// Count labels keep even the tiny final norm inspectable, without inflating it.
				expect(tile.scale).toBeGreaterThan(0);
				expect(
					(tile.shape!.volume * tile.scale! ** 3) / (thinker.shape!.volume * thinker.scale! ** 3)
				).toBeCloseTo(tile.parameters! / thinker.parameters!, 10);
			}
			for (const [from, to] of view.edges) {
				const a = view.tiles.find((t) => t.id === from)!,
					b = view.tiles.find((t) => t.id === to)!;
				expect(floorCoordinates(b.position)[0]).toBeGreaterThan(floorCoordinates(a.position)[0]);
			}
			expect(
				gridView(variant, ['decoder']).tiles.every((tile) => tile.parameters === undefined)
			).toBe(true);
		}
	);
	it.each([
		['tiny', 24, 8],
		['flash', 42, 11]
	] as const)('%s exposes every layer without padding tiles', (variant, count, columns) => {
		const v = gridView(variant, ['decoder']);
		expect(v.columns).toBe(columns);
		expect(v.tiles).toHaveLength(count);
		expect(new Set(v.tiles.map((t) => t.key)).size).toBe(count);
		expect(v.edges).toHaveLength(count - 1);
	});
	it('resolves KDA/MLA and quantization from the chosen layer', () => {
		const k = gridView('tiny', ['decoder', 'layer:5']);
		expect(k.tiles.map((t) => t.id)).toContain('kda');
		expect(k.topics['expert-gate'].status).toBe('bf16');
		const m = gridView('flash', ['decoder', 'layer:5']);
		expect(m.tiles.map((t) => t.id)).toContain('mla');
		expect(m.topics['expert-gate'].status).toBe('nvfp4');
	});
	it('gives reused operations distinct instance paths', () => {
		const a = gridView('tiny', ['decoder', 'layer:1']);
		const b = gridView('tiny', ['decoder', 'layer:2']);
		expect(a.tiles.find((t) => t.id === 'norm')?.key).not.toBe(
			b.tiles.find((t) => t.id === 'norm')?.key
		);
	});
	it('retargets moving springs without restarting or jumping', () => {
		const s = { value: 0, velocity: 0 };
		for (let i = 0; i < 8; i++) spring(s, 1, 1 / 60);
		const prior = { ...s };
		spring(s, 0, 0);
		expect(s).toEqual(prior);
		spring(s, 0, 1 / 60);
		expect(Math.abs(s.value - prior.value)).toBeLessThan(0.1);
		for (let i = 0; i < 120; i++) spring(s, 0, 1 / 60);
		expect(s).toEqual({ value: 0, velocity: 0 });
	});
	it('settles immediately for reduced motion', () => {
		const s = { value: 0.4, velocity: 8 };
		expect(spring(s, 1, 0.01, true)).toBe(false);
		expect(s).toEqual({ value: 1, velocity: 0 });
	});
});
