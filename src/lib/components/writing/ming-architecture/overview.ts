import type { Variant } from './model';
import type { Tile } from './navigation';

/**
 * Original, unpacked safetensors parameter counts, summed from tensor shapes.
 * Tiny: inclusionAI/Ming-3.0-audio-tiny @ 3c9578f641b6745abf2d1239dc8419726f37c0e2
 * Flash: inclusionAI/Ming-3.0-audio-flash @ 77e851a4675a93181c30f50426507d076cc55a1b
 * Includes the separate Talker/AudioVAE weights and auxiliary MTP layer.
 * Excludes expert_bias, rotary inv_freq and ISTFT window buffers, and the
 * external speaker encoder (not part of these safetensors checkpoints).
 */
export const parameterCounts = {
	tiny: {
		audio: 638_888_960,
		projector: 22_419_456,
		text: 241_434_624,
		decoder: 7_410_519_072,
		'final-norm': 1_536,
		'text-output': 241_434_624,
		'talker-system': 699_065_794,
		vae: 780_385_482,
		mtp: 316_604_672
	},
	flash: {
		audio: 638_888_960,
		projector: 55_715_840,
		text: 402_391_040,
		decoder: 123_609_406_432,
		'final-norm': 2_560,
		'text-output': 402_391_040,
		'talker-system': 699_065_794,
		vae: 780_385_482,
		mtp: 3_072_193_536
	}
} satisfies Record<Variant, Record<string, number>>;
export type OverviewId = keyof typeof parameterCounts.tiny;
export type Point = [number, number, number];

// Screen-aligned rows on the isometric floor: u runs right, v runs down.
export function floorPoint(u: number, v: number, y = 0): Point {
	return [(u + v) / Math.SQRT2, y, (v - u) / Math.SQRT2];
}
export function floorCoordinates([x, , z]: Point) {
	return [(x - z) / Math.SQRT2, (x + z) / Math.SQRT2];
}
const slots: Record<OverviewId, [number, number]> = {
	audio: [-2.4, -4.1],
	projector: [-0.5, -4.1],
	text: [2.0, -4.1],
	decoder: [0.6, 0],
	'final-norm': [-2.8, 3.1],
	'text-output': [-0.9, 3.1],
	'talker-system': [1.0, 3.1],
	vae: [2.9, 3.1],
	mtp: [-2.8, 0]
};
export function overviewTile(variant: Variant, id: OverviewId) {
	const parameters = parameterCounts[variant][id];
	return {
		parameters,
		scale: 2.5 * Math.cbrt(parameters / parameterCounts[variant].decoder),
		position: floorPoint(...slots[id])
	};
}
export function floorRadius(tile: Pick<Tile, 'scale' | 'shape'>) {
	const bounds = tile.shape?.bounds ?? { width: 1, depth: 1 };
	return ((bounds.width + bounds.depth) / (2 * Math.SQRT2)) * (tile.scale ?? 1);
}
export function arrangeOverview(tiles: Tile[]) {
	const find = (id: string) => tiles.find((tile) => tile.id === id)!;
	const thinker = find('decoder'),
		audio = find('audio'),
		projector = find('projector'),
		text = find('text'),
		mtp = find('mtp');
	const put = (tile: Tile, u: number, v: number) => {
		tile.position = floorPoint(u, v);
	};
	const radius = floorRadius(thinker);
	const inputRow = -radius - Math.max(...[audio, projector, text].map(floorRadius)) - 1.05;
	put(thinker, 0.6, 0);
	put(projector, -0.6, inputRow);
	put(audio, -0.6 - Math.max(1.9, floorRadius(audio) + floorRadius(projector) + 0.65), inputRow);
	put(text, -0.6 + Math.max(2.4, floorRadius(text) + floorRadius(projector) + 0.8), inputRow);
	put(mtp, 0.6 - radius - floorRadius(mtp) - 0.85, 0.2);
	const outputs = ['final-norm', 'text-output', 'talker-system', 'vae'].map(find);
	const row = radius + Math.max(...outputs.map(floorRadius)) + 0.9;
	const positions = [0];
	for (let i = 1; i < outputs.length; i++)
		positions.push(
			positions[i - 1] + Math.max(2.0, floorRadius(outputs[i - 1]) + floorRadius(outputs[i]) + 0.75)
		);
	const center = (positions.at(-1)! + floorRadius(outputs.at(-1)!) - floorRadius(outputs[0])) / 2;
	outputs.forEach((tile, i) => put(tile, positions[i] - center + 0.3, row));
}
export function formatParameters(count: number) {
	const [divisor, suffix] = count >= 1e9 ? [1e9, 'B'] : count >= 1e6 ? [1e6, 'M'] : [1e3, 'K'];
	return `${Number((count / divisor).toFixed(1))}${suffix}`;
}
