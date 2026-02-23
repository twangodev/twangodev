import type { Action } from 'svelte/action';

export interface ScrambleParams {
	text: string;
	speed?: number;
	seed?: number;
	step?: number;
	scramble?: number;
	chance?: number;
	range?: [number, number];
	overdrive?: number | boolean;
	ignore?: Set<string>;
}

function randomChar(range: [number, number]): string {
	const [min, max] = range;
	return String.fromCharCode(min + Math.floor(Math.random() * (max - min)));
}

export const scramble: Action<HTMLElement, ScrambleParams> = (node, params) => {
	let rafId: number | null = null;

	function run(p: ScrambleParams) {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}

		const {
			text,
			speed = 30,
			seed = 2,
			step = 3,
			scramble: ticks = 2,
			chance = 0.8,
			range = [33, 125],
			overdrive: od = false,
			ignore = new Set([' '])
		} = p;

		if (
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			node.textContent = text;
			return;
		}

		const target = text.split('');
		const len = target.length;

		// Each slot resolves after a computed number of ticks
		const resolveAt = target.map((ch, i) => {
			if (ignore.has(ch)) return 0;
			return Math.ceil((i + 1) / step) + ticks + Math.floor(Math.random() * seed);
		});

		const overdriveExtra = typeof od === 'boolean' ? (od ? 3 : 0) : od;
		const maxTick = Math.max(...resolveAt) + overdriveExtra;
		let currentTick = 0;
		let lastTime = 0;

		function frame(time: number) {
			if (!lastTime) lastTime = time;

			if (time - lastTime >= speed) {
				lastTime = time;
				currentTick++;

				const output = target.map((ch, i) => {
					if (currentTick >= resolveAt[i]) return ch;
					return Math.random() < chance ? randomChar(range) : ch;
				});

				node.textContent = output.join('');

				if (currentTick >= maxTick) {
					node.textContent = text;
					rafId = null;
					return;
				}
			}

			rafId = requestAnimationFrame(frame);
		}

		rafId = requestAnimationFrame(frame);
	}

	run(params!);

	return {
		update(newParams: ScrambleParams) {
			run(newParams);
		},
		destroy() {
			if (rafId !== null) cancelAnimationFrame(rafId);
		}
	};
};
