import type { Topic, Status } from './knowledge';
import type { Point } from './overview';
import { iconDetails, type IconDetail } from './icon-details';

export type ShapeKind =
	| 'layers'
	| 'projection'
	| 'matrix'
	| 'tokens'
	| 'waveform'
	| 'spectrogram'
	| 'convolution'
	| 'norm'
	| 'sum'
	| 'multiply'
	| 'gate'
	| 'activation'
	| 'rotation'
	| 'router'
	| 'experts'
	| 'ffn'
	| 'qkv'
	| 'mlp'
	| 'distribution'
	| 'attention'
	| 'latent-attention'
	| 'memory'
	| 'flow'
	| 'codec';
export type Primitive = 'box' | 'wedge' | 'disc';
export type Part = {
	kind: Primitive;
	position: Point;
	size: Point;
	rotation: number;
	status: Status;
	expandedStatus?: Status;
	travel: Point;
};
export type Shape = {
	kind: ShapeKind;
	parts: Part[];
	lines: Point[][];
	bounds: { width: number; height: number; depth: number };
	volume: number;
	lineLift: number;
	details: IconDetail[];
};

/** Operation-specific shapes, following the upstream diagram's projections,
 * operator circles, normalization bars, parallel branches and repeated layers.
 * Convolutional audio projection follows the checkpoint implementation.
 */
export function shapeKind(topic: Topic): ShapeKind {
	const { id, glyph } = topic;
	if (id === 'vae') return 'codec';
	if (id === 'router-weights' || id === 'stop-head') return 'tokens';
	if (id === 'rms-scale') return 'norm';
	if (id === 'causal-softmax') return 'distribution';
	if (['mla-cache', 'attention-scores', 'value-mix', 'state-read'].includes(id)) return 'matrix';
	if (id === 'attention') return glyph === 'state' ? 'memory' : 'latent-attention';
	if (['audio-qkv', 'talker-qkv', 'kda-qkv'].includes(id)) return 'qkv';
	if (id === 'audio-ffn' || id === 'dit-mlp') return 'mlp';
	if (id === 'mel') return 'spectrogram';
	if (
		['audio', 'talker-system', 'speech', 'vae-encoder', 'vae-decoder'].includes(id) ||
		id.startsWith('layer:')
	)
		return 'layers';
	if (id === 'text' || id === 'embedding' || id.endsWith('-weights')) return 'matrix';
	if (id === 'head' || id === 'text-output') return 'projection';
	if (id === 'router') return 'router';
	if (id === 'mla' || id === 'mtp-attention') return 'latent-attention';
	if (id === 'kda') return 'memory';
	if (id === 'flow' || id === 'flow-sampler') return 'flow';
	if (
		[
			'audio-attention',
			'audio-softmax',
			'mla-softmax',
			'talker-mix',
			'talker-attn',
			'dit-attn'
		].includes(id)
	)
		return 'attention';
	if (
		['expert', 'shared', 'dense', 'mtp-expert', 'mtp-shared', 'talker-ffn', 'dit-mlp'].includes(id)
	)
		return 'ffn';
	if (glyph === 'gate') {
		if (/product|multiply/.test(id)) return 'multiply';
		if (/activation|gelu|silu/.test(id)) return 'activation';
		if (/rope|position/.test(id)) return 'rotation';
		if (id === 'kda-time') return 'tokens';
		return 'gate';
	}
	const kinds = {
		tensor: 'tokens',
		matrix: 'projection',
		conv: 'convolution',
		state: 'memory',
		norm: 'norm',
		sum: 'sum',
		bank: 'experts',
		wave: 'waveform',
		stack: 'layers'
	} as const;
	return kinds[glyph];
}

export function createShape(topic: Topic, children: Topic[], proportional = false): Shape {
	const kind = shapeKind(topic),
		parts: Part[] = [],
		lines: Point[][] = [];
	const status = topic.status === 'mixed' ? 'source' : topic.status;
	const childStatus = (suffix: string) =>
		children.find((c) => c.id === suffix || c.id.endsWith(`-${suffix}`))?.status ?? status;
	function part(
		primitive: Primitive,
		position: Point,
		size: Point,
		color: Status = status,
		travel: Point = [0, 0, 0],
		rotation = 0,
		expandedStatus?: Status
	) {
		parts.push({
			kind: primitive,
			position,
			size,
			status: color,
			travel,
			rotation,
			expandedStatus
		});
	}
	function panel(
		x: number,
		y: number,
		z: number,
		w: number,
		d: number,
		color: Status = status,
		travel: Point = [0, 0.15, 0]
	) {
		part('box', [x, y, z], [w, 0.055, d], color, travel);
	}
	function grid(x: number, y: number, z: number, w: number, d: number, columns = 5, rows = 4) {
		for (let i = 1; i < columns; i++)
			lines.push([
				[x - w / 2 + (w * i) / columns, y, z - d / 2],
				[x - w / 2 + (w * i) / columns, y, z + d / 2]
			]);
		for (let i = 1; i < rows; i++)
			lines.push([
				[x - w / 2, y, z - d / 2 + (d * i) / rows],
				[x + w / 2, y, z - d / 2 + (d * i) / rows]
			]);
	}
	function circle(
		symbol: 'plus' | 'minus' | 'multiply' | 'sigmoid' | 'control',
		x = 0,
		z = 0,
		radius = 0.7
	) {
		part('disc', [x, 0.12, z], [radius, 0.16, radius], status, [0, 0.15, 0]);
		const y = 0.21,
			r = radius * 0.23;
		const point = (u: number, v: number): Point => [
			x + (u + v) / Math.SQRT2,
			y,
			z + (v - u) / Math.SQRT2
		];
		if (symbol === 'sigmoid') {
			lines.push(
				Array.from({ length: 25 }, (_, i) => {
					const t = (i / 24) * 2 - 1;
					return point(t * r, -Math.tanh(t * 2.5) * r);
				})
			);
		} else if (symbol === 'control') {
			part('disc', [x, y, z], [radius * 0.16, 0.025, radius * 0.16], status, [0, 0.15, 0]);
		} else if (symbol === 'multiply') {
			lines.push([point(-r, -r), point(r, r)], [point(-r, r), point(r, -r)]);
		} else {
			lines.push([point(-r, 0), point(r, 0)]);
			if (symbol === 'plus') lines.push([point(0, -r), point(0, r)]);
		}
	}
	if (kind === 'layers') {
		const n = topic.id === 'mtp' ? 1 : Math.min(6, Math.max(3, children.length));
		const wide = ['talker-system', 'talker', 'speech'].includes(topic.id);
		const w = wide ? 1.4 : 1.18,
			d = wide ? 0.62 : 0.84;
		for (let i = 0; i < n; i++)
			part(
				'box',
				[0, n === 1 ? 0.11 : 0.04 + ((i + 0.5) * 0.53) / n, 0],
				[w, n === 1 ? 0.14 : 0.44 / n, d],
				status,
				[0, 0.08 + i * 0.13, 0],
				0,
				children[i]?.status
			);
		if (topic.status === 'mixed')
			part('box', [0, 0.09, d / 2 + 0.008], [w * 0.8, 0.035, 0.025], 'nvfp4');
	} else if (kind === 'projection') {
		const dims = topic.facts
			?.flatMap((fact) => fact.match(/[\d,]+\s*→\s*[\d,]+/g) ?? [])[0]
			?.replaceAll(',', '')
			.split('→')
			.map(Number);
		const contraction = ['head', 'text-output', 'lm-head'].includes(topic.id)
			? false
			: dims
				? dims[1] < dims[0]
				: /down|out-proj|dense|output/.test(topic.id);
		part('wedge', [0, 0.15, 0], [1.18, 0.24, 0.7], status, [0, 0.22, 0], contraction ? Math.PI : 0);
	} else if (kind === 'matrix' || kind === 'spectrogram') {
		panel(0, 0.085, 0, 1.2, 0.84);
		if (
			topic.id !== 'text' &&
			topic.id !== 'embedding' &&
			!(topic.id.endsWith('-weights') && topic.status === 'nvfp4')
		)
			grid(0, 0.114, 0, 1.2, 0.84, kind === 'matrix' ? 6 : 9, 4);
		if (kind === 'spectrogram')
			for (let i = 0; i < 8; i++)
				panel(
					(i - 3.5) * 0.135,
					0.12,
					0.12 * Math.sin(i * 1.4),
					0.09,
					0.12 + 0.28 * Math.abs(Math.sin(i * 0.8)),
					status,
					[0, 0.18 + i * 0.02, 0]
				);
	} else if (kind === 'tokens') {
		const n = topic.id === 'stop-head' ? 2 : topic.id === 'router-weights' ? 8 : 5;
		for (let i = 0; i < n; i++)
			part('box', [((i - (n - 1) / 2) * 1.25) / n, 0.1, 0], [1 / n, 0.12, 0.46], status, [
				(i - 2) * 0.045,
				0.08 + i * 0.025,
				0
			]);
	} else if (kind === 'waveform') {
		panel(0, 0.02, 0, 1.25, 0.24, status, [0, 0, 0]);
		for (let i = 0; i < 15; i++) {
			const h = 0.12 + 0.45 * Math.abs(Math.sin(i * 1.3)) * Math.sin(((i + 1) * Math.PI) / 16);
			part('box', [(i - 7) * 0.075, h / 2, 0], [0.035, h, 0.08], status, [
				0,
				0.08 * Math.sin(i * 0.6),
				0
			]);
		}
	} else if (kind === 'convolution') {
		for (let i = 0; i < 7; i++)
			panel((i - 3) * 0.16, 0.075, 0, 0.12, 0.68, status, [(i - 3) * 0.025, 0, 0]);
		// A kernel window spans adjacent positions of the feature sequence.
		const x = -0.16,
			y = 0.16,
			w = 0.5,
			d = 0.8;
		lines.push([
			[x - w / 2, y, -d / 2],
			[x + w / 2, y, -d / 2],
			[x + w / 2, y, d / 2],
			[x - w / 2, y, d / 2],
			[x - w / 2, y, -d / 2]
		]);
		for (let i = 0; i < 3; i++)
			part('box', [x + (i - 1) * 0.16, 0.2, 0], [0.1, 0.07, 0.56], status, [0.24, 0.2, 0]);
	} else if (kind === 'norm') {
		part('box', [0, 0.13, 0], [1.12, 0.2, 0.4], status, [0, 0.16, 0]);
	} else if (kind === 'sum' || kind === 'multiply' || kind === 'gate') {
		circle(
			kind === 'sum'
				? topic.id === 'state-error'
					? 'minus'
					: 'plus'
				: kind === 'multiply'
					? 'multiply'
					: /sigmoid/i.test(topic.body + topic.formula)
						? 'sigmoid'
						: 'control'
		);
	} else if (kind === 'activation') {
		panel(0, 0.07, 0, 1, 0.75);
		lines.push(
			[
				[-0.44, 0.1, 0],
				[0.44, 0.1, 0]
			],
			[
				[0, 0.1, -0.32],
				[0, 0.1, 0.32]
			]
		);
		lines.push(
			Array.from({ length: 33 }, (_, i): Point => {
				const x = (i / 32) * 6 - 3;
				return [
					x / 7.2,
					0.115,
					-(topic.id === 'gelu'
						? 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)))
						: x / (1 + Math.exp(-x))) / 9
				];
			})
		);
	} else if (kind === 'rotation') {
		const arc = Array.from({ length: 33 }, (_, i): Point => {
			const t = (i / 32) * Math.PI * 1.7;
			return [0.35 * Math.cos(t), 0.12, 0.35 * Math.sin(t)];
		});
		lines.push(
			arc,
			[
				[0, 0.12, 0],
				[0.35, 0.12, 0]
			],
			[
				[0, 0.12, 0],
				[0.2, 0.12, -0.28]
			]
		);
		part('disc', [0, 0.08, 0], [0.16, 0.1, 0.16], status, [0, 0.1, 0]);
	} else if (kind === 'router') {
		part('disc', [0, 0.1, -0.3], [0.22, 0.14, 0.22], status, [0, 0.12, 0]);
		for (let i = 0; i < 4; i++) {
			const x = (i - 1.5) * 0.3;
			part('box', [x, 0.1, 0.32], [0.23, 0.12, 0.22], status, [x * 0.2, 0.15, 0.08]);
			lines.push([
				[0, 0.1, -0.18],
				[0, 0.1, -0.04],
				[x, 0.1, 0.16],
				[x, 0.1, 0.2]
			]);
		}
	} else if (kind === 'experts') {
		const bank = topic.id === 'moe' || topic.id === 'mtp-moe',
			expertStatus = bank
				? (children.find((c) => c.id === 'experts' || c.id === 'mtp-expert')?.status ?? status)
				: status;
		for (let i = 0; i < 8; i++) {
			const x = ((i % 4) - 1.5) * 0.26,
				z = (Math.floor(i / 4) - 0.5) * 0.38;
			part('wedge', [x, 0.15, z], [0.2, 0.18, 0.28], expertStatus, [
				x * 0.25,
				0.14 + Math.floor(i / 4) * 0.08,
				z * 0.3
			]);
		}
		if (bank) {
			part('wedge', [0.75, 0.15, 0], [0.2, 0.18, 0.28], childStatus('shared'), [0.1, 0.12, 0]);
		}
	} else if (kind === 'ffn') {
		for (const [x, z, label] of [
			[-0.34, -0.25, 'gate'],
			[0.34, -0.25, 'up'],
			[0, 0.35, 'down']
		] as const)
			part(
				'wedge',
				[x, 0.15, z],
				[0.5, 0.18, 0.32],
				childStatus(label),
				[x * 0.25, 0.16, z * 0.2],
				label === 'down' ? Math.PI : 0
			);
		lines.push(
			[
				[-0.34, 0.12, -0.07],
				[-0.34, 0.12, 0.08],
				[0, 0.12, 0.17]
			],
			[
				[0.34, 0.12, -0.07],
				[0.34, 0.12, 0.08],
				[0, 0.12, 0.17]
			]
		);
	} else if (kind === 'distribution') {
		for (let i = 0; i < 5; i++)
			part(
				'box',
				[(i - 2) * 0.2, 0.06, 0],
				[0.13, 0.08, 0.12 + 0.12 * (i % 3)],
				status,
				[0, 0.14, 0]
			);
	} else if (kind === 'mlp') {
		part('wedge', [0, 0.14, -0.26], [0.85, 0.2, 0.35], status, [0, 0.16, -0.08]);
		part('wedge', [0, 0.14, 0.26], [0.85, 0.2, 0.35], status, [0, 0.16, 0.08], Math.PI);
		lines.push([
			[0, 0.12, -0.08],
			[0, 0.12, 0.08]
		]);
	} else if (kind === 'qkv' || kind === 'attention' || kind === 'latent-attention') {
		for (let i = 0; i < 3; i++) {
			const x = (i - 1) * 0.38;
			part('wedge', [x, 0.13, -0.25], [0.29, 0.16, 0.32], status, [x * 0.3, 0.15, 0]);
			if (kind !== 'qkv')
				lines.push([
					[x, 0.1, -0.09],
					[x, 0.1, 0.1],
					[0, 0.1, 0.28]
				]);
		}
		if (kind === 'latent-attention') panel(0.19, 0.22, -0.25, 0.12, 0.34, status, [0, 0.3, 0]);
		if (kind !== 'qkv') panel(0, 0.1, 0.34, 0.72, 0.2, status, [0, 0.13, 0.08]);
	} else if (kind === 'memory') {
		panel(0, 0.1, 0, 0.82, 0.7);
		grid(0, 0.13, 0, 0.82, 0.7, 4, 4);
		lines.push([
			[0.44, 0.1, -0.28],
			[0.62, 0.1, -0.28],
			[0.62, 0.1, 0.48],
			[-0.62, 0.1, 0.48],
			[-0.62, 0.1, -0.28],
			[-0.44, 0.1, -0.28]
		]);
		lines.push([
			[-0.51, 0.1, -0.35],
			[-0.44, 0.1, -0.28],
			[-0.51, 0.1, -0.21]
		]);
	} else if (kind === 'flow') {
		for (let i = 0; i < 3; i++) {
			const x = (i - 1) * 0.42;
			panel(x, 0.1, 0, 0.32, 0.62, status, [0, 0.08 + i * 0.06, 0]);
			lines.push(
				Array.from({ length: 17 }, (_, j): Point => [
					x + Math.sin(j * 2.3) * (2 - i) * 0.025,
					0.13,
					(j / 16 - 0.5) * 0.5
				])
			);
		}
	} else if (kind === 'codec') {
		// Separate encoder and decoder paths, not an encode-then-decode inference chain.
		part('wedge', [-0.4, 0.16, 0], [0.62, 0.26, 0.86], status, [-0.1, 0.2, 0], Math.PI);
		part('wedge', [0.4, 0.16, 0], [0.62, 0.26, 0.86], status, [0.1, 0.2, 0]);
	}
	// All overview shapes use the same solid volume before parameter scaling.
	// This preserves honest size comparisons even for flat panels and operator discs.
	const primitiveVolume = (p: Part) =>
		p.size[0] *
		p.size[1] *
		p.size[2] *
		(p.kind === 'disc' ? Math.PI / 4 : p.kind === 'wedge' ? 0.8 : 1);
	let volume = parts.reduce((sum, p) => sum + primitiveVolume(p), 0);
	const factor = proportional ? Math.cbrt(0.5 / volume) : 1;
	for (const p of parts) {
		p.position = p.position.map((n) => n * factor) as Point;
		p.size = p.size.map((n) => n * factor) as Point;
		p.travel = p.travel.map((n) => n * factor) as Point;
	}
	for (const line of lines) for (const p of line) for (let i = 0; i < 3; i++) p[i] *= factor;
	volume *= factor ** 3;
	const width = Math.max(
		...parts.map((p) => Math.abs(p.position[0]) * 2 + p.size[0]),
		...lines.flat().map((p) => Math.abs(p[0]) * 2),
		0.1
	);
	const height = Math.max(
		...parts.map((p) => p.position[1] + p.size[1] / 2),
		...lines.flat().map((p) => p[1]),
		0.1
	);
	const depth = Math.max(
		...parts.map((p) => Math.abs(p.position[2]) * 2 + p.size[2]),
		...lines.flat().map((p) => Math.abs(p[2]) * 2),
		0.1
	);
	return {
		kind,
		parts,
		lines,
		bounds: { width, height, depth },
		volume,
		lineLift: 0.15 * factor,
		details: iconDetails(topic, kind, parts, children)
	};
}
