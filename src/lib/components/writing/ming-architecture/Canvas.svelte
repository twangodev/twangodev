<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { NoToneMapping, WebGLRenderer } from 'three';
	import Grid from './Grid.svelte';
	import type { SceneProps } from './model';
	let props: SceneProps = $props();
	function createRenderer(canvas: HTMLCanvasElement) {
		return new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: 'low-power'
		});
	}
</script>

<Canvas
	{createRenderer}
	dpr={[2, 3]}
	renderMode="on-demand"
	toneMapping={NoToneMapping}
	shadows={false}
>
	<Grid {...props} />
</Canvas>
