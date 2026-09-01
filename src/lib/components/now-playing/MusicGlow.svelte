<script lang="ts">
	import { normalizeGlowPalette } from '$lib/now-playing/music-glow';
	import CssMusicGlow from './CssMusicGlow.svelte';
	import WebGpuMusicGlow from './WebGpuMusicGlow.svelte';

	interface Props {
		colors: readonly string[];
	}

	let { colors }: Props = $props();
	let webGpuReady = $state(false);
	const palette = $derived(normalizeGlowPalette(colors));

	$effect(() => {
		if (palette.length === 0) webGpuReady = false;
	});
</script>

<div
	class="pointer-events-none absolute inset-0"
	class:webgpu-ready={webGpuReady}
	aria-hidden="true"
>
	<div class="fallback-layer absolute inset-0">
		<CssMusicGlow colors={palette} active={!webGpuReady} />
	</div>

	{#if palette.length > 0}
		<div class="gpu-layer absolute inset-0">
			<WebGpuMusicGlow
				colors={palette}
				onready={() => (webGpuReady = true)}
				onunavailable={() => (webGpuReady = false)}
			/>
		</div>
	{/if}
</div>

<style>
	.fallback-layer,
	.gpu-layer {
		transition: opacity 900ms ease;
	}

	.gpu-layer,
	.webgpu-ready .fallback-layer {
		opacity: 0;
	}

	.webgpu-ready .gpu-layer {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.fallback-layer,
		.gpu-layer {
			transition: none;
		}
	}
</style>
