import { describe, expect, it } from 'vitest';
import { createExplorer } from './knowledge';
import { createShape, shapeKind } from './shapes';

describe('architecture shape semantics', () => {
	it('distinguishes operations that share similar names', () => {
		const t = createExplorer('tiny', 1);
		expect(shapeKind(t['expert-gate'])).toBe('projection');
		expect(shapeKind(t.router)).toBe('router');
		expect(shapeKind(t['kda-output-gate'])).toBe('gate');
		expect(shapeKind(t['expert-multiply'])).toBe('multiply');
		expect(shapeKind(t['kda-cache'])).toBe('memory');
		expect(shapeKind(t['mla-cache'])).toBe('matrix');
		expect(shapeKind(t['audio-ffn'])).toBe('mlp');
		expect(shapeKind(t.expert)).toBe('ffn');
		expect(shapeKind(t.mel)).toBe('spectrogram');
	});
	it.each(['tiny', 'flash'] as const)(
		'%s gives every concept finite inspectable geometry',
		(variant) => {
			const topics = createExplorer(variant, 1);
			for (const topic of Object.values(topics)) {
				const shape = createShape(
					topic,
					topic.rows.flat().map((id) => topics[id])
				);
				expect(shape.parts.length, topic.id).toBeGreaterThan(0);
				expect(shape.volume, topic.id).toBeGreaterThan(0);
				expect(shape.details.length, topic.id).toBeGreaterThan(0);
				for (const detail of shape.details) {
					expect(shape.parts[detail.part], topic.id).toBeDefined();
					expect(detail.strokes.length, topic.id).toBeGreaterThan(0);
					for (const point of [...detail.strokes, ...detail.fine].flat()) {
						expect(point.every(Number.isFinite), topic.id).toBe(true);
						expect(Math.abs(point[0]), topic.id).toBeLessThanOrEqual(0.5);
						expect(Math.abs(point[2]), topic.id).toBeLessThanOrEqual(0.5);
					}
				}
				for (const n of Object.values(shape.bounds))
					expect(Number.isFinite(n), topic.id).toBe(true);
			}
		}
	);
	it('keeps the shared expert unchanged beside retained and quantized routed experts', () => {
		for (const layer of [1, 5]) {
			const topics = createExplorer('tiny', layer);
			const topic = topics.moe;
			const shape = createShape(
				topic,
				topic.rows.flat().map((id) => topics[id])
			);
			expect(shape.parts.filter((p) => p.status === (layer === 1 ? 'nvfp4' : 'bf16'))).toHaveLength(
				8
			);
			expect(shape.parts.filter((p) => p.status === 'source')).toHaveLength(1);
		}
	});
});
