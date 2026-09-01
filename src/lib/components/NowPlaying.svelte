<script lang="ts">
	import { onMount } from 'svelte';
	import { Vibrant } from 'node-vibrant/browser';
	import { Text, Link, Equalizer } from '$lib/components/ui';
	import { scramble } from '$lib/actions/scramble';
	import { Dot } from '@lucide/svelte';
	import { site } from '$lib/config';
	import MusicGlow from './now-playing/MusicGlow.svelte';

	interface Track {
		name: string;
		artist: string;
		album: string;
		url: string;
		image: {
			small: string;
			medium: string;
			large: string;
			extralarge: string;
		};
	}

	let track = $state<Track | null>(null);
	let colors = $state<string[]>([]);

	async function extractPalette(imageUrl: string) {
		try {
			const palette = await Vibrant.from(imageUrl).getPalette();
			const swatchKeys = [
				'Vibrant',
				'DarkVibrant',
				'LightVibrant',
				'Muted',
				'DarkMuted',
				'LightMuted'
			] as const;
			const extracted = swatchKeys
				.map((key) => palette[key]?.hex)
				.filter((hex): hex is string => !!hex);
			colors = extracted;
		} catch {
			colors = [];
		}
	}

	async function fetchNowPlaying() {
		try {
			const res = await fetch(`https://listening.twango.dev/playing/${site.author.lastfm}`);
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
	<div class="relative flex flex-1 items-center justify-center" data-nosnippet>
		<MusicGlow {colors} />

		<div class="track-info relative z-10 flex flex-col items-center gap-1.5 text-muted">
			<Text variant="muted" size="xs" as="span" class="text-[10px] tracking-widest opacity-50"
				>listening now</Text
			>
			<Link
				href={`https://www.last.fm/user/${site.author.lastfm}`}
				icon={false}
				class="inline-flex items-center gap-1 font-mono text-xs tracking-wider text-muted"
			>
				<Equalizer class="mr-1" />
				<span use:scramble={{ text: track.name }}></span>
				<Dot size={16} strokeWidth={3} class="shrink-0" />
				<span use:scramble={{ text: track.artist }}></span>
			</Link>
			{#if track.album}
				<Link
					href={track.url}
					icon={false}
					class="font-mono text-[10px] tracking-wider text-muted opacity-50"
				>
					<span use:scramble={{ text: track.album }}></span>
				</Link>
			{/if}
		</div>
	</div>
{/if}

<style>
	.track-info {
		opacity: 0;
		animation: fade-in 600ms ease 800ms forwards;
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
	}
</style>
