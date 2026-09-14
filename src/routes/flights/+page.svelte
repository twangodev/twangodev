<script lang="ts">
	import { onMount } from 'svelte';
	import { Play, Route } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import createGlobe from 'cobe';
	import RouteInspector from '$lib/components/flights/RouteInspector.svelte';
	import type { RouteInspectorHandle } from '$lib/globe/route-camera';
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

	let canvasEl = $state<HTMLCanvasElement>(null!);
	let inspector: RouteInspectorHandle | undefined;
	let routeFocused = $state(false);
	let dragGlobe: (dx: number, dy: number) => void = () => {};
	let startDrag = () => {};
	let endDrag = () => {};
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
		themeMarker = [muted[0] * 0.2, muted[1] * 0.2, muted[2] * 0.2];
	}

	const RAY_LENGTH = 0.25;
	const RAY_SPEED = 0.004;

	// Pre-compute RGB colors per flight using golden angle distribution
	const arcColors = $derived(
		flights.map((_: unknown, i: number) => hslToRgb((i * 137.508) % 360, 80, 65))
	);

	onMount(() => {
		let phi = 0;
		let dragging = false;
		let pointerMovement = 0;
		let dragPhi = 0;

		let pointerMovementY = 0;
		let dragTheta = 0;

		readTheme();

		const themeObserver = new MutationObserver(() => readTheme());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		// Random start positions and per-flight speeds so rays drift out of sync
		const rayHeads = flights.map(() => Math.random() * (1 + RAY_LENGTH));
		const raySpeeds = flights.map(() => RAY_SPEED * (0.6 + Math.random() * 0.8));

		startDrag = () => {
			dragging = true;
		};
		endDrag = () => {
			dragging = false;
		};
		dragGlobe = (dx, dy) => {
			pointerMovement += dx;
			pointerMovementY += dy;
		};

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

		function animate(now: number) {
			const inspecting = inspector?.isPaused() ?? false;
			if (!dragging && !labelHovered && !inspecting) phi += 0.0018;
			if (!inspecting) dragPhi += (pointerMovement / 200 - dragPhi) * 0.1;
			if (!inspecting) dragTheta += (pointerMovementY / 300 - dragTheta) * 0.1;
			const effectiveTheta = Math.max(-0.5, Math.min(1.2, THETA + dragTheta));

			// Advance ray heads
			for (let i = 0; i < rayHeads.length && !inspecting; i++) {
				rayHeads[i] = (rayHeads[i] + raySpeeds[i]) % (1 + RAY_LENGTH);
			}

			const frame = {
				phi: phi + dragPhi,
				theta: effectiveTheta,
				width: canvasEl.offsetWidth,
				height: canvasEl.offsetHeight,
				dark: themeDark,
				baseColor: themeBase,
				glowColor: themeGlow,
				markerColor: themeMarker,
				arcs: flights.map((arc: { from: [number, number]; to: [number, number] }, i: number) => ({
					from: arc.from,
					to: arc.to,
					color: arcColors[i],
					progress: rayHeads[i],
					trailLength: RAY_LENGTH
				}))
			};
			const view = inspector?.getView(frame, frame.arcs, now) ?? frame;
			globe.update({ ...frame, ...view });
			inspector?.update(view, frame.arcs);

			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(animationId);
			themeObserver.disconnect();

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
		<nav
			aria-label="Flight views"
			class="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-sm bg-bg/85 p-1 shadow-sm backdrop-blur"
		>
			<a
				href={resolve('/flights/watch')}
				title="Watch playback"
				aria-label="Watch flight playback"
				class="flex size-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-text focus-visible:bg-surface focus-visible:text-text focus-visible:outline-none"
			>
				<Play size={17} strokeWidth={1.8} />
			</a>
			<a
				href={resolve('/flights/routes')}
				title="View all routes"
				aria-label="View all flight routes"
				class="flex size-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-text focus-visible:bg-surface focus-visible:text-text focus-visible:outline-none"
			>
				<Route size={17} strokeWidth={1.8} />
			</a>
		</nav>
		<div class="globe-scene globe-edge-fade" class:route-focused={routeFocused}>
			<canvas
				bind:this={canvasEl}
				style="cursor: grab; touch-action: none"
				class="absolute inset-0 h-full w-full"
			></canvas>

			{#each airportLabels as label (label.id)}
				<AirportLabel {...label} onhover={(h) => (labelHovered = h)} />
			{/each}
		</div>
		<RouteInspector
			bind:this={inspector}
			onfocuschange={(focused) => (routeFocused = focused)}
			canvas={canvasEl}
			routes={data.routeSummaries}
			routeIds={data.arcRouteIds}
			ondrag={(dx, dy) => dragGlobe(dx, dy)}
			ondragstart={() => startDrag()}
			ondragend={() => endDrag()}
		/>
	</div>
</div>
