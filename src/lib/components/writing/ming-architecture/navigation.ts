import { createExplorer, type Topic } from './knowledge';
import { precision, variants, type Variant } from './model';
import { overviewTile, arrangeOverview, floorPoint, type OverviewId } from './overview';
import { createShape, type Shape } from './shapes';
import { arrangeStages, arrangeHorizontalOverview } from './flow-layout';
export type Tile = {
	key: string;
	id: string;
	topic: Topic;
	position: [number, number, number];
	children: Topic[];
	shape?: Shape;
	scale?: number;
	parameters?: number;
};
export type GridView = {
	key: string;
	topic: Topic;
	tiles: Tile[];
	edges: Topic['edges'];
	columns: number;
	rows: number;
	rowSpacing: number;
	topics: Record<string, Topic>;
	path: string[];
};
export function gridView(variant: Variant, path: string[], width = 670): GridView {
	const layerId = path.find((p) => p.startsWith('layer:'));
	const layer = layerId ? Number(layerId.split(':')[1]) : variants[variant].dense;
	const topics = createExplorer(variant, layer);
	topics['final-norm'] = {
		...topics.norm,
		id: 'final-norm',
		title: 'Final norm',
		short: 'Norm',
		body: 'Normalize the final Thinker hidden states before the vocabulary projection.'
	};
	topics['text-output'] = {
		...topics.head,
		id: 'text-output',
		short: 'Text head',
		rows: [['lm-head'], ['generation']],
		edges: [['lm-head', 'generation']]
	};
	topics['talker-system'] = {
		...topics.speech,
		id: 'talker-system',
		title: 'Talker',
		short: 'Talker',
		rows: [['speech-text', 'voice'], ['talker']],
		edges: [
			['speech-text', 'talker'],
			['voice', 'talker']
		]
	};
	topics.audio = {
		...topics.audio,
		short: 'Audio in',
		rows: [['mel'], ['encoder']],
		edges: [['mel', 'encoder']]
	};
	topics.projector = { ...topics.projector, short: 'Projector' };
	topics.text = { ...topics.text, short: 'Text in' };
	const layerIds = Array.from({ length: variants[variant].layers }, (_, i) => `layer:${i}`);
	for (const [i, id] of layerIds.entries()) {
		const kind = precision(variant, i),
			attn = (i + 1) % variants[variant].attentionGroup === 0 ? 'MLA' : 'KDA';
		const ff = kind === 'source' ? 'dense' : 'moe';
		topics[id] = {
			...topics.decoder,
			id,
			title: `Layer ${i} · ${attn}`,
			short: `${i}`,
			status: kind === 'nvfp4' ? 'mixed' : kind,
			body: `${attn} attention, then ${kind === 'source' ? 'a dense feed-forward block' : `${variants[variant].experts} routed experts and one shared expert`}. ${kind === 'bf16' ? 'The routed projections in this layer stay BF16.' : kind === 'nvfp4' ? 'The routed expert projections use NVFP4.' : 'This layer stays at original precision.'}`,
			rows: [['norm'], [attn.toLowerCase()], ['residual'], [ff]],
			edges: [
				['norm', attn.toLowerCase()],
				[attn.toLowerCase(), 'residual'],
				['residual', ff]
			]
		};
	}
	topics.decoder = {
		...topics.decoder,
		short: 'Thinker',
		rows: [layerIds],
		edges: layerIds.slice(1).map((id, i) => [layerIds[i], id])
	};
	topics.model = {
		...topics.model,
		rows: [
			['audio', 'projector', 'text'],
			['decoder', 'mtp'],
			['final-norm', 'text-output', 'talker-system', 'vae']
		],
		edges: [
			['audio', 'projector'],
			['projector', 'decoder'],
			['text', 'decoder'],
			['decoder', 'final-norm'],
			['final-norm', 'text-output'],
			['text-output', 'talker-system'],
			['talker-system', 'vae']
		]
	};
	const current = path.at(-1) ?? 'model',
		topic = topics[current];
	const ids = topic.rows.length ? topic.rows.flat() : [current];
	let columns =
		current === 'decoder'
			? width < 480
				? variant === 'tiny'
					? 5
					: width < 320
						? 6
						: 7
				: variant === 'tiny'
					? 8
					: 11
			: Math.ceil(Math.sqrt(ids.length));
	const rowSpacing = Math.max(
		current === 'decoder' && variant === 'flash' ? 5.4 : 4.2,
		(4.2 * 480) / Math.max(240, width)
	);
	let rows = Math.ceil(ids.length / columns);
	const key = [variant, ...path].join('/');
	const tiles = ids.map((id, index): Tile => {
		const row = Math.floor(index / columns),
			column = index % columns,
			col = current === 'decoder' && row % 2 === 1 ? columns - 1 - column : column;
		return {
			key: `${key}/${id}`,
			id,
			topic: topics[id],
			position: floorPoint((col - (columns - 1) / 2) * 2.5, (row - (rows - 1) / 2) * rowSpacing),
			...(current === 'model' ? overviewTile(variant, id as OverviewId) : {}),
			children: topics[id].rows
				.flat()
				.map((c) => topics[c])
				.slice(0, 6)
		};
	});
	for (const tile of tiles)
		tile.shape = createShape(tile.topic, tile.children, current === 'model');
	if (current === 'model') {
		if (width >= 480) arrangeHorizontalOverview(tiles);
		else arrangeOverview(tiles);
	} else if (current !== 'decoder')
		({ columns, rows } = arrangeStages(tiles, topic.edges, topic.rows, width, rowSpacing));
	const view: GridView = {
		key,
		topic,
		tiles,
		columns,
		rows,
		rowSpacing,
		edges: topic.rows.length ? topic.edges : [],
		topics,
		path
	};
	return view;
}
export function diagramHeight(view: Pick<GridView, 'tiles' | 'rows' | 'path'>, width: number) {
	if (width < 480) return view.tiles.length > 16 ? Math.max(460, view.rows * 72 + 70) : 360;
	return view.path.length === 0 ? 320 : view.tiles.length > 16 ? 440 : 400;
}
export type Spring = { value: number; velocity: number };
/** Exact critically damped spring: retarget without discarding position or velocity. */
export function spring(s: Spring, target: number, dt: number, immediate = false) {
	if (immediate) {
		s.value = target;
		s.velocity = 0;
		return false;
	}
	const omega = 17,
		displacement = s.value - target,
		c = s.velocity + omega * displacement,
		decay = Math.exp(-omega * dt);
	s.value = target + (displacement + c * dt) * decay;
	s.velocity = (s.velocity - omega * c * dt) * decay;
	if (Math.abs(s.value - target) < 0.0005 && Math.abs(s.velocity) < 0.0005) {
		s.value = target;
		s.velocity = 0;
		return false;
	}
	return true;
}
