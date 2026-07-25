<script lang="ts">
	import { onMount } from 'svelte';
	import createGlobe from 'cobe';
	import SEO from '$lib/components/SEO.svelte';
	import AirportLabel from '$lib/components/flights/AirportLabel.svelte';
	import { breadcrumbSchema } from '$lib/schema';

	const { data } = $props();
	const flights = $derived(data.arcs);
	const markers = $derived(data.markers);
	const airports = $derived(data.airports);
	const maxAirportCount = $derived(airports.length > 0 ? airports[0].count : 1);
	const airportLabels = $derived(
		airports.map(
			(
				a: {
					iata: string;
					city: string;
					subd?: string;
					country: string;
					name: string;
					count: number;
				},
				i: number
			) => {
				const importance = 0.25 + 0.55 * (a.count / maxAirportCount);
				const location = [a.city, a.subd, a.country].filter(Boolean).join(', ');
				return {
					id: a.iata.toLowerCase(),
					iata: a.iata,
					location,
					name: a.name,
					count: a.count,
					z: airports.length - i,
					importance
				};
			}
		)
	);

	let canvasEl: HTMLCanvasElement;

	const THETA = 0.3;
	const DPR = 2;

	function hexToRgb(hex: string): [number, number, number] {
		const n = parseInt(hex.replace('#', ''), 16);
		return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
	}

	function hslToRgb(h: number, s: number, l: number): [number, number, number] {
		s /= 100;
		l /= 100;
		const a = s * Math.min(l, 1 - l);
		const f = (n: number) => {
			const k = (n + h / 30) % 12;
			return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
		};
		return [f(0), f(8), f(4)];
	}

	let themeBase: [number, number, number] = [0.137, 0.133, 0.118];
	let themeGlow: [number, number, number] = [0.102, 0.098, 0.086];
	let themeMarker: [number, number, number] = [0.478, 0.459, 0.408];
	let themeDark = 1;

	function readTheme() {
		const s = getComputedStyle(document.documentElement);
		const isDark = document.documentElement.classList.contains('dark');
		themeDark = isDark ? 0.75 : 0;
		themeBase = hexToRgb(s.getPropertyValue('--color-surface').trim());
		themeGlow = hexToRgb(s.getPropertyValue('--color-bg').trim());
		const muted = hexToRgb(s.getPropertyValue('--color-muted').trim());
		themeMarker = [muted[0] * 0.2, muted[1] * 0.2, muted[2] * 0.2];
	}

	const staticArcs = $derived(
		flights.map((arc: { from: [number, number]; to: [number, number] }, i: number) => ({
			from: arc.from,
			to: arc.to,
			color: hslToRgb((i * 137.508) % 360, 80, 65)
		}))
	);

	onMount(() => {
		let phi = 0;
		let theta = THETA;
		let dragging = false;
		let lastX = 0;
		let lastY = 0;

		readTheme();

		const themeObserver = new MutationObserver(() => readTheme());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		const onPointerDown = (e: PointerEvent) => {
			dragging = true;
			lastX = e.clientX;
			lastY = e.clientY;
			canvasEl.setPointerCapture(e.pointerId);
			canvasEl.style.cursor = 'grabbing';
		};
		const onPointerMove = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = e.clientX - lastX;
			const dy = e.clientY - lastY;
			lastX = e.clientX;
			lastY = e.clientY;
			phi += dx / 180;
			theta = Math.max(-0.9, Math.min(1.25, theta + dy / 240));
		};
		const onPointerUp = (e: PointerEvent) => {
			dragging = false;
			if (canvasEl.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId);
			canvasEl.style.cursor = 'grab';
		};

		canvasEl.addEventListener('pointerdown', onPointerDown);
		canvasEl.addEventListener('pointermove', onPointerMove);
		canvasEl.addEventListener('pointerup', onPointerUp);
		canvasEl.addEventListener('pointercancel', onPointerUp);

		const globe = createGlobe(canvasEl, {
			devicePixelRatio: DPR,
			width: canvasEl.offsetWidth,
			height: canvasEl.offsetHeight,
			phi,
			theta,
			dark: themeDark,
			diffuse: 1.2,
			mapSamples: 16000,
			mapBrightness: 6,
			baseColor: themeBase,
			markerColor: themeMarker,
			glowColor: themeGlow,
			markers,
			markerElevation: 0,
			arcWidth: 0.3,
			arcs: staticArcs
		});

		let animationId: number;
		function render() {
			globe.update({
				phi,
				theta,
				width: canvasEl.offsetWidth,
				height: canvasEl.offsetHeight,
				dark: themeDark,
				baseColor: themeBase,
				glowColor: themeGlow,
				markerColor: themeMarker,
				arcs: staticArcs
			});

			animationId = requestAnimationFrame(render);
		}

		animationId = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(animationId);
			themeObserver.disconnect();
			canvasEl.removeEventListener('pointerdown', onPointerDown);
			canvasEl.removeEventListener('pointermove', onPointerMove);
			canvasEl.removeEventListener('pointerup', onPointerUp);
			canvasEl.removeEventListener('pointercancel', onPointerUp);
			globe.destroy();
		};
	});
</script>

<SEO
	title="Flight Routes"
	description="A static globe of every flight route"
	canonical="/flights/routes"
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Flights', url: '/flights' },
		{ name: 'Routes', url: '/flights/routes' }
	])}
/>

<div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
	<div class="relative aspect-square max-h-[calc(100svh-16rem)] w-full max-w-5xl">
		<canvas bind:this={canvasEl} style="cursor: grab" class="absolute inset-0 h-full w-full"
		></canvas>
		{#each airportLabels as label (label.id)}
			<AirportLabel {...label} />
		{/each}
	</div>
</div>
