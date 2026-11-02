import { describe, expect, it } from 'vitest';
import { createExplorer } from './knowledge';
import { variants, type Variant } from './model';

describe('Ming architecture explorer', () => {
	for (const variant of ['tiny', 'flash'] as Variant[]) {
		it(`${variant}: nested paths and data-flow edges resolve`, () => {
			const topics = createExplorer(variant, variants[variant].dense);
			function visit(id: string, parents: string[] = []) {
				expect(topics[id], id).toBeDefined();
				expect(parents, `recursive expansion at ${id}`).not.toContain(id);
				for (const child of topics[id].rows.flat()) visit(child, [...parents, id]);
			}
			for (const root of ['model', 'kda', 'mla', 'mtp', 'dense']) visit(root);
			for (const topic of Object.values(topics)) {
				const children = topic.rows.flat();
				expect(new Set(children).size, topic.id).toBe(children.length);
				for (const [from, to] of topic.edges) {
					expect(children, topic.id).toContain(from);
					expect(children, topic.id).toContain(to);
				}
				expect(topic.source.url).toMatch(/^https:\/\/(huggingface.co|github.com)\//);
			}
		});
		it(`${variant}: precision follows the recipe across every decoder layer`, () => {
			for (let layer = 0; layer < variants[variant].layers; layer++) {
				const topics = createExplorer(variant, layer);
				const expected =
					layer < variants[variant].dense
						? 'source'
						: variants[variant].retained.includes(layer)
							? 'bf16'
							: 'nvfp4';
				for (const projection of ['gate', 'up', 'down']) {
					expect(topics[`expert-${projection}`].status).toBe(expected);
					for (const unchanged of ['shared', 'dense', 'mtp-expert', 'mtp-shared']) {
						expect(topics[`${unchanged}-${projection}`].status).toBe('source');
					}
				}
				for (const id of [
					'kda',
					'mla',
					'router',
					'norm',
					'residual',
					'audio',
					'head',
					'speech',
					'mtp',
					'expert-activation',
					'expert-multiply'
				]) {
					expect(topics[id].status, id).toBe('source');
				}
				const attention = (layer + 1) % variants[variant].attentionGroup === 0 ? 'mla' : 'kda';
				expect(topics.attention.rows).toEqual([[attention]]);
			}
		});
	}
	it('keeps the Tiny and Flash MLA query paths distinct', () => {
		expect(createExplorer('tiny', 3)['mla-query'].rows.flat()).toEqual([
			'mla-q-down',
			'mla-q-norm',
			'mla-q-up'
		]);
		expect(createExplorer('flash', 5)['mla-query'].rows.flat()).toEqual(['mla-q-up']);
	});
	it('represents original late-Flash SwiGLU clipping separately from quantization', () => {
		expect(createExplorer('flash', 34)['expert-activation'].title).toBe('SiLU gate');
		expect(createExplorer('flash', 35)['expert-activation'].body).toContain('cap it at 4');
		expect(createExplorer('flash', 33)['shared-activation'].title).toBe('SiLU gate');
		expect(createExplorer('flash', 34)['shared-activation'].body).toContain('cap it at 5');
		expect(createExplorer('flash', 39)['shared-activation'].body).toContain('cap it at 5');
		expect(createExplorer('flash', 40)['shared-activation'].body).toContain('cap it at 7');
	});
});
