<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createWebGpuMusicGlow,
		type WebGpuMusicGlowRenderer
	} from '$lib/now-playing/webgpu-music-glow';

	interface Props {
		colors: readonly string[];
		onready?: () => void;
		onunavailable?: (reason?: unknown) => void;
	}

	let { colors, onready, onunavailable }: Props = $props();
	let canvas: HTMLCanvasElement;
	let renderer: WebGpuMusicGlowRenderer | undefined;
	let animationFrame = 0;
	let reducedMotion = false;
	let intersecting = true;
	let disposed = false;
	let unavailable = false;
	let lastFrame = 0;
	const frameInterval = 1000 / 30;

	function readIntensity(): number {
		return document.documentElement.classList.contains('dark') ? 0.28 : 0.52;
	}

	function stopAnimation(): void {
		if (!animationFrame) return;
		cancelAnimationFrame(animationFrame);
		animationFrame = 0;
	}

	function fail(reason?: unknown): void {
		if (disposed || unavailable) return;
		unavailable = true;
		stopAnimation();
		renderer?.destroy();
		renderer = undefined;
		onunavailable?.(reason);
	}

	function shouldAnimate(): boolean {
		return !reducedMotion && intersecting && !document.hidden;
	}

	function renderFrame(timestamp: number): void {
		animationFrame = 0;
		if (!renderer || unavailable) return;
		if (timestamp - lastFrame < frameInterval) {
			animationFrame = requestAnimationFrame(renderFrame);
			return;
		}
		lastFrame = timestamp;

		try {
			renderer.render(reducedMotion ? 0 : timestamp / 1000);
		} catch (error) {
			fail(error);
			return;
		}

		if (shouldAnimate()) animationFrame = requestAnimationFrame(renderFrame);
	}

	function renderOnce(): void {
		if (!renderer || unavailable) return;
		try {
			renderer.render(reducedMotion ? 0 : performance.now() / 1000);
		} catch (error) {
			fail(error);
		}
	}

	function startAnimation(): void {
		if (animationFrame || !shouldAnimate() || !renderer || unavailable) return;
		animationFrame = requestAnimationFrame(renderFrame);
	}

	$effect(() => {
		const palette = [...colors];
		if (!renderer) return;
		renderer.setColors(palette);
		renderOnce();
		startAnimation();
	});

	onMount(() => {
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = motion.matches;

		const resizeObserver = new ResizeObserver(() => renderOnce());
		resizeObserver.observe(canvas);

		const intersectionObserver = new IntersectionObserver(([entry]) => {
			intersecting = entry?.isIntersecting ?? true;
			if (intersecting) {
				renderOnce();
				startAnimation();
			} else {
				stopAnimation();
			}
		});
		intersectionObserver.observe(canvas);

		const themeObserver = new MutationObserver(() => {
			renderer?.setIntensity(readIntensity());
			renderOnce();
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		const handleMotionChange = (event: MediaQueryListEvent) => {
			reducedMotion = event.matches;
			stopAnimation();
			renderOnce();
			startAnimation();
		};
		const handleVisibilityChange = () => {
			if (document.hidden) stopAnimation();
			else {
				renderOnce();
				startAnimation();
			}
		};
		motion.addEventListener('change', handleMotionChange);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		void (async () => {
			try {
				const nextRenderer = await createWebGpuMusicGlow(canvas);
				if (disposed) {
					nextRenderer.destroy();
					return;
				}

				renderer = nextRenderer;
				renderer.setColors(colors);
				renderer.setIntensity(readIntensity());
				void renderer.lost.then((info) => {
					if (info.reason !== 'destroyed') fail(info);
				});

				renderer.render(reducedMotion ? 0 : performance.now() / 1000);
				await renderer.whenSubmitted();
				if (disposed || unavailable) return;

				onready?.();
				startAnimation();
			} catch (error) {
				fail(error);
			}
		})();

		return () => {
			disposed = true;
			stopAnimation();
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			themeObserver.disconnect();
			motion.removeEventListener('change', handleMotionChange);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			renderer?.destroy();
			renderer = undefined;
		};
	});
</script>

<canvas bind:this={canvas} aria-hidden="true" class="absolute inset-0 h-full w-full"></canvas>
