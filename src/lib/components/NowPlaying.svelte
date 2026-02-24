<script lang="ts">
	import { onMount } from 'svelte';
	import { extractColors } from 'extract-colors';
	import { Text, Link, Equalizer } from '$lib/components/ui';
	import { scramble } from '$lib/actions/scramble';
	import { Dot } from '@lucide/svelte';

	interface Track {
		name: string;
		artist: string;
		url: string;
		image: {
			small: string;
			medium: string;
			large: string;
			extralarge: string;
		};
	}

	const blobLayout = [
		// anchor blob — stays center, largest
		{ x: 50, y: 48, size: 240, duration: 24, delay: -8, drift: [8, -6, -10, 8, 6, -8, -5, 10], morphDuration: 30, morphDelay: 0, shapes: ['50% 50% 40% 60% / 60% 30% 70% 40%', '40% 60% 55% 45% / 45% 55% 35% 65%', '55% 45% 50% 50% / 35% 65% 50% 50%', '45% 55% 60% 40% / 55% 45% 40% 60%'] },
		// tight orbit blobs
		{ x: 49, y: 47, size: 200, duration: 20, delay: 0, drift: [15, -12, -18, 10, 12, -15, -10, 18], morphDuration: 26, morphDelay: -7, shapes: ['30% 70% 70% 30% / 30% 30% 70% 70%', '60% 40% 35% 65% / 55% 45% 50% 50%', '45% 55% 60% 40% / 40% 60% 45% 55%', '70% 30% 40% 60% / 50% 50% 35% 65%'] },
		{ x: 51, y: 49, size: 180, duration: 25, delay: -5, drift: [-12, 18, 20, -14, -16, 12, 14, -20], morphDuration: 34, morphDelay: -12, shapes: ['70% 30% 30% 70% / 60% 40% 60% 40%', '35% 65% 55% 45% / 45% 55% 40% 60%', '55% 45% 40% 60% / 35% 65% 55% 45%', '40% 60% 65% 35% / 55% 45% 35% 65%'] },
		// breakaway blobs
		{ x: 50, y: 47, size: 160, duration: 18, delay: -10, drift: [200, -150, -120, 180, -180, 130, 150, -200], morphDuration: 22, morphDelay: -4, shapes: ['40% 60% 30% 70% / 50% 60% 40% 50%', '65% 35% 50% 50% / 40% 60% 55% 45%', '35% 65% 60% 40% / 60% 40% 35% 65%', '55% 45% 45% 55% / 35% 65% 60% 40%'] },
		{ x: 50, y: 49, size: 150, duration: 22, delay: -3, drift: [-180, 200, 150, -130, 120, -180, -200, 160], morphDuration: 28, morphDelay: -9, shapes: ['60% 40% 70% 30% / 40% 50% 60% 50%', '45% 55% 35% 65% / 55% 45% 40% 60%', '50% 50% 55% 45% / 40% 60% 50% 50%', '35% 65% 45% 55% / 60% 40% 55% 45%'] }
	];

	let track = $state<Track | null>(null);
	let colors = $state<string[]>([]);

	async function extractPalette(imageUrl: string) {
		try {
			const extracted = await extractColors(imageUrl, {
				pixels: 10000,
				distance: 0.2
			});
			const sorted = extracted.sort((a, b) => b.area - a.area).slice(0, blobLayout.length);
			colors = sorted.map((c) => c.hex);
			// pad if we got fewer colors than blobs
			while (colors.length < blobLayout.length) {
				colors.push(colors[colors.length - 1]);
			}
		} catch {
			colors = [];
		}
	}

	async function fetchNowPlaying() {
		try {
			const res = await fetch('https://listening.twango.dev/playing/twangodev');
			const data = await res.json();
			const next = data.status === 'playing' && data.track ? data.track : null;
			if (next?.name !== track?.name || next?.artist !== track?.artist) {
				track = next;
				if (next) extractPalette(next.image.extralarge);
			}
		} catch {
			track = null;
			colors = [];
		}
	}

	function scheduleNext() {
		const delay = 5_000 + Math.random() * 5_000;
		return setTimeout(() => {
			fetchNowPlaying();
			timer = scheduleNext();
		}, delay);
	}

	let timer: ReturnType<typeof setTimeout>;

	onMount(() => {
		fetchNowPlaying();
		timer = scheduleNext();
		return () => clearTimeout(timer);
	});
</script>

{#if track}
	<div class="relative flex flex-1 items-center justify-center">
		<div class="glow-container pointer-events-none absolute inset-0 flex items-center justify-center">
			{#each blobLayout as blob, i}
				{#if colors[i]}
					<div
						class="blob absolute"
						style:background-color={colors[i]}
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

		<div class="track-info relative z-10 flex flex-col items-center gap-1.5 text-muted">
			<Text variant="muted" size="xs" as="span" class="text-[10px] tracking-widest uppercase opacity-50">listening now</Text>
			<Link href={track.url} icon={false} class="inline-flex items-center gap-1 font-mono text-xs tracking-wider text-muted">
				<Equalizer class="mr-1" />
				<span use:scramble={{ text: track.name }}></span>
				<Dot size={16} strokeWidth={3} class="shrink-0" />
				<span use:scramble={{ text: track.artist }}></span>
			</Link>
		</div>
	</div>
{/if}

<style>
	.glow-container {
		opacity: 0;
		scale: 0.6;
		animation:
			glow-in 2s ease 300ms forwards,
			breathe 6s ease-in-out 2.3s infinite;
	}

	.blob {
		position: absolute;
		translate: -50% -50%;
		filter: blur(80px);
		transition: background-color 1.5s ease;
		animation:
			drift var(--drift-duration) ease-in-out infinite alternate,
			morph var(--morph-duration) ease-in-out infinite alternate;
		animation-delay: var(--drift-delay), var(--morph-delay);
	}

	@keyframes morph {
		0% { border-radius: var(--shape1); }
		33% { border-radius: var(--shape2); }
		66% { border-radius: var(--shape3); }
		100% { border-radius: var(--shape4); }
	}

	@keyframes drift {
		0% { translate: -50% -50%; }
		25% { translate: calc(-50% + var(--dx1)) calc(-50% + var(--dy1)); }
		50% { translate: calc(-50% + var(--dx2)) calc(-50% + var(--dy2)); }
		75% { translate: calc(-50% + var(--dx3)) calc(-50% + var(--dy3)); }
		100% { translate: calc(-50% + var(--dx4)) calc(-50% + var(--dy4)); }
	}

	.track-info {
		opacity: 0;
		animation: fade-in 600ms ease 800ms forwards;
	}

	@keyframes glow-in {
		to {
			opacity: 0.12;
			scale: 1;
		}
	}

	@keyframes breathe {
		0%, 100% {
			scale: 1;
		}
		50% {
			scale: 1.08;
		}
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.track-info {
			animation: none;
			opacity: 1;
		}

		.glow-container {
			animation: none;
			opacity: 0.12;
			scale: 1;
		}

		.blob {
			animation: none;
			border-radius: var(--shape1);
		}
	}
</style>