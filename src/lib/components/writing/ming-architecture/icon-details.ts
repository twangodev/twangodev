import type { Topic } from './knowledge';
import type { Point } from './overview';
import type { Part, ShapeKind } from './shapes';

export type IconDetail = { part: number; strokes: Point[][]; fine: Point[][] };
type Path = [number, number][];
type Motif =
	| ShapeKind
	| 'thinker'
	| 'audio-encoder'
	| 'talker'
	| 'prediction'
	| 'lookup'
	| 'packed'
	| 'cache'
	| 'read'
	| 'write'
	| 'encode'
	| 'decode';

/** Line-art in a part's local top face. It follows that part when it unfolds,
 * adds no parameter volume, and uses fewer details at small projected sizes. */
export function iconDetails(
	topic: Topic,
	kind: ShapeKind,
	parts: Part[],
	children: Topic[]
): IconDetail[] {
	const details: IconDetail[] = [];
	function motifFor(item: Topic, fallback: Motif): Motif {
		if (item.id === 'decoder' || item.id.startsWith('layer:')) return 'thinker';
		if (item.id === 'audio' || item.id === 'encoder') return 'audio-encoder';
		if (['talker-system', 'speech', 'talker'].includes(item.id)) return 'talker';
		if (item.id === 'mtp') return 'prediction';
		if (item.id === 'text' || item.id === 'embedding') return 'lookup';
		if (item.id === 'mla-cache') return 'cache';
		if (item.id === 'state-read') return 'read';
		if (item.id === 'state-write') return 'write';
		if (item.id.endsWith('-weights') && item.status === 'nvfp4') return 'packed';
		if (item.id === 'vae-encoder') return 'encode';
		if (item.id === 'vae-decoder') return 'decode';
		return fallback;
	}
	const main = motifFor(topic, kind);
	const top = parts.reduce(
		(best, p, i) =>
			p.position[1] + p.size[1] / 2 > parts[best].position[1] + parts[best].size[1] / 2 ? i : best,
		0
	);
	const indices =
		kind === 'layers'
			? parts.map((_, i) => i).filter((i) => parts[i].kind === 'box' && parts[i].size[2] > 0.1)
			: parts.map((_, i) => i).filter((i) => parts[i].size[0] > 0.085 && parts[i].size[2] > 0.14);
	for (const index of indices) {
		const part = parts[index];
		let motif: Motif = main;
		if (kind === 'layers' && index !== top && children[index])
			motif = motifFor(
				children[index],
				(
					{
						state: 'memory',
						norm: 'norm',
						sum: 'sum',
						bank: 'experts',
						gate: 'gate',
						conv: 'convolution',
						wave: 'waveform',
						matrix: 'projection',
						tensor: 'tokens',
						stack: 'layers'
					} as const
				)[children[index].glyph]
			);
		if (kind === 'codec') motif = index === 0 ? 'encode' : 'decode';
		if (kind === 'experts') motif = 'ffn';
		if (kind === 'ffn' || kind === 'mlp' || kind === 'qkv') motif = 'projection';
		if (kind === 'attention' || kind === 'latent-attention')
			motif = part.kind === 'wedge' ? 'projection' : part.size[0] > 0.4 ? 'attention' : 'cache';
		if (kind === 'convolution' && part.size[1] > 0.06) motif = 'matrix';
		const strokes: Point[][] = [],
			fine: Point[][] = [];
		// Trapezoids narrow at the rear; keep the engraving inside that outline.
		const xScale = part.kind === 'wedge' ? 0.68 : part.kind === 'disc' ? 0.72 : 0.86;
		function line(points: Path, detail = false) {
			(detail ? fine : strokes).push(points.map(([x, z]): Point => [x * xScale, 0.516, z * 0.86]));
		}
		function rect(x: number, z: number, w: number, h: number, detail = false) {
			line(
				[
					[x - w / 2, z - h / 2],
					[x + w / 2, z - h / 2],
					[x + w / 2, z + h / 2],
					[x - w / 2, z + h / 2],
					[x - w / 2, z - h / 2]
				],
				detail
			);
		}
		function circle(x: number, z: number, r: number, detail = false) {
			line(
				Array.from({ length: 17 }, (_, i): [number, number] => [
					x + Math.cos((i * Math.PI) / 8) * r,
					z + Math.sin((i * Math.PI) / 8) * r
				]),
				detail
			);
		}
		function arrow(a: [number, number], b: [number, number], detail = false) {
			line([a, b], detail);
			const dx = b[0] - a[0],
				dz = b[1] - a[1],
				len = Math.hypot(dx, dz),
				ux = dx / len,
				uz = dz / len;
			line(
				[
					[b[0] - 0.06 * ux - 0.035 * uz, b[1] - 0.06 * uz + 0.035 * ux],
					b,
					[b[0] - 0.06 * ux + 0.035 * uz, b[1] - 0.06 * uz - 0.035 * ux]
				],
				detail
			);
		}
		function matrix(x: number, z: number, w: number, h: number, detail = false) {
			rect(x, z, w, h, detail);
			for (let i = 1; i < 4; i++) {
				line(
					[
						[x - w / 2 + (w * i) / 4, z - h / 2],
						[x - w / 2 + (w * i) / 4, z + h / 2]
					],
					true
				);
				line(
					[
						[x - w / 2, z - h / 2 + (h * i) / 4],
						[x + w / 2, z - h / 2 + (h * i) / 4]
					],
					true
				);
			}
		}
		function waveform(x: number, z: number, w: number, h: number, detail = false) {
			line(
				Array.from({ length: 33 }, (_, i): [number, number] => [
					x + (i / 32 - 0.5) * w,
					z + (Math.sin(i * 1.3) * Math.sin((i * Math.PI) / 32) * h) / 2
				]),
				detail
			);
		}
		function token(x: number, z: number, w = 0.12, h = 0.13, detail = false) {
			rect(x, z, w, h, detail);
			line(
				[
					[x - w * 0.28, z],
					[x + w * 0.28, z]
				],
				true
			);
		}
		function rail(z: number, count: number, detail = false) {
			for (let i = 0; i < count; i++) token((i - (count - 1) / 2) * 0.16, z, 0.11, 0.12, detail);
		}
		function bank(x: number, z: number, detail = false) {
			for (let i = 0; i < 6; i++)
				rect(x + ((i % 3) - 1) * 0.12, z + (Math.floor(i / 3) - 0.5) * 0.13, 0.085, 0.085, detail);
		}
		function ports() {
			for (const z of [-0.42, 0.42]) {
				line(
					[
						[-0.18, z],
						[0.18, z]
					],
					true
				);
				for (const x of [-0.16, 0, 0.16])
					line(
						[
							[x, z],
							[x, z + (z < 0 ? 0.055 : -0.055)]
						],
						true
					);
			}
		}
		switch (motif) {
			case 'thinker': {
				matrix(-0.2, -0.12, 0.26, 0.26);
				bank(0.2, 0.18);
				arrow([-0.03, -0.12], [0.2, -0.12]);
				arrow([0.2, -0.06], [0.2, 0.03]);
				// Residual bypass around the attention/expert path.
				line(
					[
						[-0.39, -0.3],
						[-0.39, 0.34],
						[0.2, 0.34]
					],
					true
				);
				circle(0.2, 0.34, 0.04, true);
				if (topic.id === 'decoder' || /KDA/.test(topic.title))
					line(
						[
							[-0.34, -0.2],
							[-0.4, -0.2],
							[-0.4, 0.08],
							[-0.2, 0.08],
							[-0.2, 0.04]
						],
						true
					);
				ports();
				break;
			}
			case 'audio-encoder':
				waveform(0, -0.23, 0.65, 0.13);
				arrow([0, -0.12], [0, -0.02]);
				for (let i = 0; i < 3; i++) rect(0, 0.07 + i * 0.09, 0.55 - i * 0.04, 0.055);
				ports();
				break;
			case 'talker':
				rail(-0.23, 4);
				arrow([0, -0.12], [0, 0.02]);
				waveform(0, 0.19, 0.62, 0.18);
				line(
					[
						[0.35, 0.15],
						[0.43, 0.15],
						[0.43, -0.34],
						[-0.31, -0.34]
					],
					true
				);
				ports();
				break;
			case 'prediction':
				rail(-0.22, 4);
				for (let i = 0; i < 3; i++) token((i - 1) * 0.16 + 0.08, 0.19);
				arrow([-0.24, -0.1], [-0.08, 0.08]);
				arrow([-0.08, -0.1], [0.08, 0.08]);
				arrow([0.08, -0.1], [0.24, 0.08]);
				break;
			case 'layers':
				for (let i = 0; i < 3; i++) rect(0, -0.23 + i * 0.21, 0.55, 0.12);
				arrow([0, -0.15], [0, -0.08], true);
				arrow([0, 0.06], [0, 0.13], true);
				ports();
				break;
			case 'projection': {
				matrix(0, 0, 0.3, 0.32);
				for (const x of [-0.22, 0, 0.22]) {
					circle(x, -0.34, 0.025);
					line([
						[x, -0.31],
						[x * 0.55, -0.16]
					]);
					line([
						[x * 0.55, 0.16],
						[x, 0.31]
					]);
					rect(x, 0.34, 0.05, 0.05);
				}
				// Tiny format marks complement the existing precision color, never routing state.
				if (part.status === 'nvfp4')
					for (let i = 0; i < 4; i++) rect(-0.32 + i * 0.075, 0.02, 0.045, 0.065, true);
				else ports();
				break;
			}
			case 'lookup':
				rect(-0.07, -0.035, 0.62, 0.6);
				rect(-0.07, 0.03, 0.62, 0.12);
				arrow([0.28, 0.03], [0.43, 0.03]);
				for (let i = 0; i < 4; i++)
					line(
						[
							[-0.35, -0.27 + i * 0.15],
							[0.21, -0.27 + i * 0.15]
						],
						true
					);
				break;
			case 'packed':
				for (let r = 0; r < 3; r++)
					for (let c = 0; c < 2; c++) {
						const x = (c - 0.5) * 0.37,
							z = (r - 1) * 0.23;
						rect(x, z, 0.3, 0.17);
						line([
							[x, z - 0.085],
							[x, z + 0.085]
						]);
					}
				break;
			case 'cache':
				for (let i = 0; i < 3; i++) rect(0, -0.22 + i * 0.21, 0.6, 0.13);
				arrow([-0.4, -0.33], [-0.4, 0.33]);
				arrow([0.37, -0.22], [0.37, 0.21], true);
				break;
			case 'matrix':
				// Row and column indexing, distinct from the underlying weight grid.
				line([
					[-0.38, -0.32],
					[-0.43, -0.32],
					[-0.43, 0.32],
					[-0.38, 0.32]
				]);
				line([
					[-0.3, -0.37],
					[-0.3, -0.42],
					[0.3, -0.42],
					[0.3, -0.37]
				]);
				rect(0.06, 0.07, 0.13, 0.13, true);
				break;
			case 'read':
				matrix(0, 0, 0.45, 0.44);
				arrow([-0.43, 0], [-0.26, 0]);
				arrow([0.26, 0], [0.43, 0]);
				line(
					[
						[-0.2, 0],
						[0.2, 0]
					],
					true
				);
				break;
			case 'write':
				matrix(0, 0, 0.45, 0.44);
				arrow([0, -0.43], [0, -0.25]);
				arrow([-0.43, 0], [-0.26, 0]);
				circle(0, 0, 0.065);
				break;
			case 'memory':
				// Orthogonal read/write ports on the key-by-value state.
				arrow([-0.43, 0], [-0.2, 0]);
				arrow([0.1, -0.42], [0.1, -0.16]);
				rect(0.1, 0, 0.12, 0.13);
				line(
					[
						[0.25, 0.24],
						[0.4, 0.24],
						[0.4, -0.25],
						[0.3, -0.25]
					],
					true
				);
				break;
			case 'tokens':
				if (topic.id === 'stop-head') {
					circle(0, 0, 0.18);
					if (index === 0)
						line([
							[-0.1, 0],
							[0.1, 0]
						]);
					else arrow([-0.13, 0], [0.13, 0]);
				} else {
					line([
						[-0.29, -0.17],
						[0.27, -0.17]
					]);
					line([
						[-0.29, 0.02],
						[0.13, 0.02]
					]);
					line(
						[
							[-0.29, 0.2],
							[0.22, 0.2]
						],
						true
					);
					rect(0.3, 0.28, 0.08, 0.08, true);
				}
				break;
			case 'spectrogram':
				for (let i = 0; i < 4; i++)
					line(
						[
							[-0.36, -0.3 + i * 0.2],
							[-0.43, -0.3 + i * 0.2]
						],
						true
					);
				arrow([-0.4, 0.4], [0.4, 0.4]);
				break;
			case 'waveform':
				line([
					[-0.35, 0],
					[0.35, 0]
				]);
				for (let i = 0; i < 4; i++)
					line(
						[
							[-0.3 + i * 0.2, -0.15],
							[-0.3 + i * 0.2, 0.15]
						],
						true
					);
				break;
			case 'convolution':
				for (let i = 0; i < 3; i++) rect(0, (i - 1) * 0.23, 0.55, 0.14);
				arrow([-0.38, -0.34], [-0.38, 0.34], true);
				break;
			case 'norm':
				// The output keeps the input's relative values under a common rescaling.
				for (let i = 0; i < 3; i++) {
					const h = [0.38, 0.6, 0.25][i];
					line([
						[-0.34 + i * 0.12, h / 2],
						[-0.34 + i * 0.12, -h / 2]
					]);
					line([
						[0.12 + i * 0.12, h * 0.3],
						[0.12 + i * 0.12, -h * 0.3]
					]);
				}
				arrow([-0.04, 0], [0.06, 0]);
				break;
			case 'sum':
			case 'multiply':
			case 'gate':
				// Keep the mathematical mark readable; add separate input/output terminals.
				for (const x of [-0.4, 0.4]) {
					circle(x, 0, 0.045);
					line([
						[x + Math.sign(x) * 0.045, 0],
						[x - Math.sign(x) * 0.06, 0]
					]);
				}
				if (motif === 'gate') {
					circle(0, -0.4, 0.045);
					line([
						[0, -0.35],
						[0, -0.26]
					]);
				}
				break;
			case 'activation':
				for (let i = 0; i < 3; i++) {
					const p = (i - 1) * 0.24;
					line(
						[
							[p, 0.34],
							[p, 0.38]
						],
						true
					);
					line(
						[
							[-0.37, p],
							[-0.41, p]
						],
						true
					);
				}
				ports();
				break;
			case 'rotation':
				circle(0, 0, 0.36);
				arrow([0.34, -0.04], [0.29, -0.2]);
				line(
					[
						[0, 0],
						[0.23, 0.23]
					],
					true
				);
				break;
			case 'router':
				if (part.kind === 'disc') {
					circle(0, 0, 0.25);
					for (let i = 0; i < 3; i++)
						line(
							[
								[-0.2 + i * 0.2, -0.14],
								[-0.2 + i * 0.2, 0.14]
							],
							true
						);
				} else {
					rect(0, 0, 0.55, 0.5);
					line([
						[-0.2, 0],
						[0.2, 0]
					]);
				}
				break;
			case 'experts':
				bank(0, 0);
				ports();
				break;
			case 'ffn':
				matrix(-0.2, -0.22, 0.24, 0.22);
				matrix(0.2, -0.22, 0.24, 0.22);
				line([
					[-0.2, -0.1],
					[-0.2, 0.03],
					[0, 0.12]
				]);
				line([
					[0.2, -0.1],
					[0.2, 0.03],
					[0, 0.12]
				]);
				circle(0, 0.12, 0.05);
				rect(0, 0.31, 0.3, 0.13);
				arrow([0, 0.17], [0, 0.24]);
				break;
			case 'mlp':
				matrix(0, -0.2, 0.44, 0.22);
				matrix(0, 0.2, 0.44, 0.22);
				arrow([0, -0.07], [0, 0.07]);
				break;
			case 'qkv':
			case 'attention':
			case 'latent-attention':
				matrix(0, 0, 0.55, 0.55);
				if (/^(mla|talker)/.test(topic.id))
					for (let i = 0; i < 3; i++)
						line(
							[
								[-0.23 + i * 0.16, -0.23 + i * 0.16],
								[0.25, -0.23 + i * 0.16]
							],
							true
						);
				break;
			case 'distribution':
				line([
					[-0.33, 0.3],
					[0.33, 0.3]
				]);
				for (let i = 0; i < 3; i++)
					line(
						[
							[(i - 1) * 0.25, 0.3],
							[(i - 1) * 0.25, -0.1 - 0.1 * i]
						],
						true
					);
				break;
			case 'flow':
				for (let i = 0; i < 3; i++)
					line(
						[
							[-0.3, 0.3 - i * 0.1],
							[0.3, 0.3 - i * 0.1]
						],
						true
					);
				arrow([-0.37, -0.32], [0.35, -0.32]);
				break;
			case 'encode':
			case 'decode': {
				const waveSide = motif === 'encode' && part.kind !== 'wedge' ? -0.25 : 0.25;
				waveform(0, waveSide, 0.6, 0.17);
				for (let i = 0; i < 3; i++) rect((i - 1) * 0.16, -waveSide, 0.08, 0.12);
				const from = motif === 'encode' ? waveSide : -waveSide;
				arrow([0, from * 0.44], [0, -from * 0.48]);
				break;
			}
			case 'codec':
				break;
		}
		// Signal direction and a readable silhouette remain when fine markings are hidden.
		if (!strokes.length) rect(0, 0, 0.55, 0.55);
		details.push({ part: index, strokes, fine });
	}
	return details;
}
