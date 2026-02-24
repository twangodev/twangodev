<script lang="ts">
	import { onMount } from 'svelte';
	import { Text, Link, Equalizer } from '$lib/components/ui';

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

	let track = $state<Track | null>(null);

	async function fetchNowPlaying() {
		try {
			const res = await fetch('https://listening.twango.dev/playing/twangodev');
			const data = await res.json();
			track = data.status === 'playing' && data.track ? data.track : null;
		} catch {
			track = null;
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
		<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
			<img
				src={track.image.extralarge}
				alt=""
				aria-hidden="true"
				class="ambient-glow h-72 w-72 rounded-full object-cover select-none"
			/>
		</div>

		<div class="track-info relative z-10 flex flex-col items-center gap-1.5 text-muted">
			<Text variant="muted" size="xs" as="span" class="text-[10px] tracking-widest uppercase opacity-50">listening now</Text>
			<Link href={track.url} icon={false} class="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-muted">
				<Equalizer />
				<span>{track.name}</span>
				<span class="opacity-40">·</span>
				<span>{track.artist}</span>
			</Link>
		</div>
	</div>
{/if}

<style>
	.ambient-glow {
		opacity: 0;
		filter: blur(80px) saturate(1.2);
		animation: glow-in 2s ease 300ms forwards;
	}

	.track-info {
		opacity: 0;
		animation: fade-in 600ms ease 800ms forwards;
	}

	@keyframes glow-in {
		to {
			opacity: 0.07;
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

		.ambient-glow {
			animation: none;
			opacity: 0.07;
		}
	}
</style>