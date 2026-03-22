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
		airports.map((a: { iata: string; city: string; name: string; count: number }, i: number) => {
			const importance = 0.25 + 0.55 * (a.count / maxAirportCount);
			return {
				id: a.iata.toLowerCase(),
				iata: a.iata,
				city: a.city,
				name: a.name,
				count: a.count,
				z: airports.length - i,
				importance
			};
		})
	);

	let canvasEl: HTMLCanvasElement;
	let labelHovered = $state(false);

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

	// Cached theme colors, updated via MutationObserver on class changes
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
		themeMarker = [muted[0] * 0.4, muted[1] * 0.4, muted[2] * 0.4];
	}

	const RAY_LENGTH = 0.25;
	const RAY_SPEED = 0.004;

	// Pre-compute RGB colors per flight using golden angle distribution
	const arcColors = $derived(
		flights.map((_: unknown, i: number) => hslToRgb((i * 137.508) % 360, 80, 65))
	);

	onMount(() => {
		let phi = 0;
		let pointerInteracting: number | null = null;
		let pointerMovement = 0;
		let dragPhi = 0;

		let pointerInteractingY: number | null = null;
		let pointerMovementY = 0;
		let dragTheta = 0;

		readTheme();

		const themeObserver = new MutationObserver(() => readTheme());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		// Random start positions per flight
		const rayHeads = flights.map(() => Math.random() * (1 + RAY_LENGTH));

		const onPointerDown = (e: PointerEvent) => {
			pointerInteracting = e.clientX - pointerMovement;
			pointerInteractingY = e.clientY - pointerMovementY;
			canvasEl.style.cursor = 'grabbing';
		};
		const onPointerUp = () => {
			pointerInteracting = null;
			pointerInteractingY = null;
			canvasEl.style.cursor = 'grab';
		};
		const onMouseMove = (e: MouseEvent) => {
			if (pointerInteracting !== null) {
				pointerMovement = e.clientX - pointerInteracting;
			}
			if (pointerInteractingY !== null) {
				pointerMovementY = e.clientY - pointerInteractingY;
			}
		};
		const onTouchMove = (e: TouchEvent) => {
			if (pointerInteracting !== null && e.touches[0]) {
				pointerMovement = (e.touches[0].clientX - pointerInteracting) * 2;
			}
			if (pointerInteractingY !== null && e.touches[0]) {
				pointerMovementY = (e.touches[0].clientY - pointerInteractingY) * 2;
			}
		};

		canvasEl.addEventListener('pointerdown', onPointerDown);
		canvasEl.addEventListener('pointerup', onPointerUp);
		canvasEl.addEventListener('pointerout', onPointerUp);
		canvasEl.addEventListener('mousemove', onMouseMove);
		canvasEl.addEventListener('touchmove', onTouchMove);

		const initialArcs = flights.map(
			(arc: { from: [number, number]; to: [number, number] }, i: number) => ({
				from: arc.from,
				to: arc.to,
				color: arcColors[i],
				progress: rayHeads[i],
				trailLength: RAY_LENGTH
			})
		);

		const globe = createGlobe(canvasEl, {
			devicePixelRatio: DPR,
			width: canvasEl.offsetWidth,
			height: canvasEl.offsetHeight,
			phi: 0,
			theta: THETA,
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
			arcs: initialArcs
		});

		let animationId: number;

		function animate() {
			if (pointerInteracting === null && !labelHovered) phi += 0.0018;
			dragPhi += (pointerMovement / 200 - dragPhi) * 0.1;
			dragTheta += (pointerMovementY / 300 - dragTheta) * 0.1;
			const effectiveTheta = Math.max(-0.5, Math.min(1.2, THETA + dragTheta));

			// Advance ray heads
			for (let i = 0; i < rayHeads.length; i++) {
				rayHeads[i] = (rayHeads[i] + RAY_SPEED) % (1 + RAY_LENGTH);
			}

			globe.update({
				phi: phi + dragPhi,
				theta: effectiveTheta,
				width: canvasEl.offsetWidth,
				height: canvasEl.offsetHeight,
				dark: themeDark,
				baseColor: themeBase,
				glowColor: themeGlow,
				markerColor: themeMarker,
				arcs: flights.map(
					(arc: { from: [number, number]; to: [number, number] }, i: number) => ({
						from: arc.from,
						to: arc.to,
						color: arcColors[i],
						progress: rayHeads[i],
						trailLength: RAY_LENGTH
					})
				)
			});

			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(animationId);
			themeObserver.disconnect();
			canvasEl.removeEventListener('pointerdown', onPointerDown);
			canvasEl.removeEventListener('pointerup', onPointerUp);
			canvasEl.removeEventListener('pointerout', onPointerUp);
			canvasEl.removeEventListener('mousemove', onMouseMove);
			canvasEl.removeEventListener('touchmove', onTouchMove);
			globe.destroy();
		};
	});
</script>

<SEO
	title="Flights"
	description="Interactive globe visualization of flights"
	canonical="/flights"
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Flights', url: '/flights' }
	])}
/>

<div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
	<div class="relative aspect-square max-h-[calc(100svh-16rem)] w-full max-w-5xl">
		<canvas bind:this={canvasEl} style="cursor: grab" class="absolute inset-0 h-full w-full"
		></canvas>
		{#each airportLabels as label (label.id)}
			<AirportLabel {...label} onhover={(h) => (labelHovered = h)} />
		{/each}
	</div>
</div>
