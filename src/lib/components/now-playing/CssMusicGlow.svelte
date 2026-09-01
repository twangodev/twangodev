<script lang="ts">
	import { MUSIC_GLOW_BLOBS, normalizeGlowPalette } from '$lib/now-playing/music-glow';

	interface Props {
		colors: readonly string[];
		active?: boolean;
	}

	let { colors, active = true }: Props = $props();
	const palette = $derived(normalizeGlowPalette(colors));
</script>

<div
	class="glow-container absolute inset-0 flex items-center justify-center"
	class:paused={!active}
>
	{#each MUSIC_GLOW_BLOBS as blob, index (index)}
		{#if palette[index]}
			<div
				class="blob absolute"
				style:background-color={palette[index]}
				style:width="{blob.size}px"
				style:height="{blob.size}px"
				style:left="{blob.x}%"
				style:top="{blob.y}%"
				style:--drift-duration="{blob.duration}s"
				style:--drift-delay="{blob.delay}s"
				style:--morph-duration="{blob.morphDuration}s"
				style:--morph-delay="{blob.morphDelay}s"
				style:--shape1={blob.shapes[0]}
				style:--shape2={blob.shapes[1]}
				style:--shape3={blob.shapes[2]}
				style:--shape4={blob.shapes[3]}
				style:--dx1="{blob.drift[0]}px"
				style:--dy1="{blob.drift[1]}px"
				style:--dx2="{blob.drift[2]}px"
				style:--dy2="{blob.drift[3]}px"
				style:--dx3="{blob.drift[4]}px"
				style:--dy3="{blob.drift[5]}px"
				style:--dx4="{blob.drift[6]}px"
				style:--dy4="{blob.drift[7]}px"
			></div>
		{/if}
	{/each}
</div>

<style>
	.glow-container {
		opacity: 0;
		scale: 0.6;
		animation:
			glow-in 2s ease 300ms forwards,
			breathe 6s ease-in-out 2.3s infinite;
	}

	.blob {
		translate: -50% -50%;
		filter: blur(80px);
		transition: background-color 1.5s ease;
		animation:
			drift var(--drift-duration) ease-in-out infinite alternate,
			morph var(--morph-duration) ease-in-out infinite alternate;
		animation-delay: var(--drift-delay), var(--morph-delay);
	}

	.paused,
	.paused .blob {
		animation-play-state: paused;
	}

	@keyframes morph {
		0% {
			border-radius: var(--shape1);
		}
		33% {
			border-radius: var(--shape2);
		}
		66% {
			border-radius: var(--shape3);
		}
		100% {
			border-radius: var(--shape4);
		}
	}

	@keyframes drift {
		0% {
			translate: -50% -50%;
		}
		25% {
			translate: calc(-50% + var(--dx1)) calc(-50% + var(--dy1));
		}
		50% {
			translate: calc(-50% + var(--dx2)) calc(-50% + var(--dy2));
		}
		75% {
			translate: calc(-50% + var(--dx3)) calc(-50% + var(--dy3));
		}
		100% {
			translate: calc(-50% + var(--dx4)) calc(-50% + var(--dy4));
		}
	}

	@keyframes glow-in {
		to {
			opacity: var(--glow-opacity, 0.5);
			scale: 1;
		}
	}

	:global(.dark) .glow-container {
		--glow-opacity: 0.12;
	}

	@keyframes breathe {
		0%,
		100% {
			scale: 1;
		}
		50% {
			scale: 1.08;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.glow-container {
			animation: none;
			opacity: var(--glow-opacity, 0.5);
			scale: 1;
		}

		.blob {
			animation: none;
			border-radius: var(--shape1);
		}
	}
</style>
