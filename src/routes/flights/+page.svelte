<script lang="ts">
	import { onMount } from 'svelte';
	import createGlobe from 'cobe';
	import {
		precomputeArcPoints,
		projectPrecomputedArc,
		type ScreenPoint
	} from '$lib/globe/projection';
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
	let overlayEl: HTMLCanvasElement;
	let labelHovered = $state(false);

	const THETA = 0.3;
	const DPR = 2;

	function hexToRgb(hex: string): [number, number, number] {
		const n = parseInt(hex.replace('#', ''), 16);
		return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
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

	const RAY_LENGTH = 0.25; // fraction of arc that the ray tail covers
	const RAY_SPEED = 0.004; // progress per frame (0->1)

	// Random start position per flight so they don't animate in lockstep
	let rayHeads = $derived(flights.map(() => Math.random() * (1 + RAY_LENGTH)));

	// Pre-compute solid HSL color string per flight (use globalAlpha for opacity)
	const flightColors = $derived(
		flights.map((_: unknown, i: number) => `hsl(${(i * 137.508) % 360}, 80%, 65%)`)
	);

	// Pre-compute 3D arc geometry (rotation-independent) -- recomputed only when flights change
	const arcGeometry = $derived(
		flights.map((arc: { from: [number, number]; to: [number, number] }) => {
			const points3D = precomputeArcPoints(arc);
			const buffer: (ScreenPoint | null)[] = new Array(points3D.length).fill(null);
			return { points3D, buffer };
		})
	);

	function drawArcs(
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
		cp: number,
		sp: number,
		ct: number,
		st: number
	) {
		ctx.clearRect(0, 0, w, h);
		ctx.save();
		ctx.scale(DPR, DPR);

		const cssW = w / DPR;
		const cssH = h / DPR;
		ctx.lineWidth = 1.5;

		for (let f = 0; f < flights.length; f++) {
			// Advance ray head, loop back to 0
			rayHeads[f] = (rayHeads[f] + RAY_SPEED) % (1 + RAY_LENGTH);
			const head = rayHeads[f];
			const tail = head - RAY_LENGTH;

			const { points3D, buffer } = arcGeometry[f];

			// Early-out: skip arcs where both endpoints are behind the globe
			const first = points3D[0];
			const last = points3D[points3D.length - 1];
			const depthFirst = first.wx * (-sp * ct) + first.wy * st + first.wz * (cp * ct);
			const depthLast = last.wx * (-sp * ct) + last.wy * st + last.wz * (cp * ct);
			if (depthFirst < -0.2 && depthLast < -0.2) continue;

			projectPrecomputedArc(points3D, cp, sp, ct, st, cssW, cssH, buffer);
			const steps = buffer.length - 1;

			ctx.strokeStyle = flightColors[f];

			// Batch consecutive segments with the same quantized alpha
			let curAlpha = -1;
			let pathOpen = false;

			for (let i = 0; i < steps; i++) {
				const a = buffer[i];
				const b = buffer[i + 1];
				if (!a || !b) {
					if (pathOpen) {
						ctx.stroke();
						pathOpen = false;
						curAlpha = -1;
					}
					continue;
				}

				const tMid = (i + 0.5) / steps;
				if (tMid < tail || tMid > head) continue;

				const rayAlpha = (tMid - tail) / RAY_LENGTH;
				const alpha = rayAlpha * (0.15 + 0.85 * Math.min(a.depth, b.depth));
				const qAlpha = Math.round(alpha * 20) / 20;

				if (qAlpha !== curAlpha) {
					if (pathOpen) ctx.stroke();
					ctx.globalAlpha = qAlpha;
					ctx.beginPath();
					curAlpha = qAlpha;
					pathOpen = true;
				}

				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
			}

			if (pathOpen) ctx.stroke();
		}

		ctx.restore();
	}

	onMount(() => {
		let phi = 0;
		let pointerInteracting: number | null = null;
		let pointerMovement = 0;
		let dragPhi = 0;

		// Vertical drag (theta tilt)
		let pointerInteractingY: number | null = null;
		let pointerMovementY = 0;
		let dragTheta = 0;

		const overlayCtx = overlayEl.getContext('2d')!;

		// Read theme once on mount
		readTheme();

		// Re-read theme only when dark/light mode toggles (class attribute changes)
		const themeObserver = new MutationObserver(() => readTheme());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		// Track overlay canvas dimensions to avoid resetting every frame
		let overlayW = 0;
		let overlayH = 0;

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
			markerElevation: 0
		});

		let animationId: number;

		function animate() {
			if (pointerInteracting === null && !labelHovered) phi += 0.0018;
			dragPhi += (pointerMovement / 200 - dragPhi) * 0.1;
			dragTheta += (pointerMovementY / 300 - dragTheta) * 0.1;
			const effectiveTheta = Math.max(-0.5, Math.min(1.2, THETA + dragTheta));

			const cssW = canvasEl.offsetWidth;
			const cssH = canvasEl.offsetHeight;
			const w = cssW * DPR;
			const h = cssH * DPR;

			globe.update({
				phi: phi + dragPhi,
				theta: effectiveTheta,
				width: cssW,
				height: cssH,
				dark: themeDark,
				baseColor: themeBase,
				glowColor: themeGlow,
				markerColor: themeMarker
			});

			// Only reset overlay canvas dimensions when they actually change
			if (w !== overlayW || h !== overlayH) {
				overlayEl.width = w;
				overlayEl.height = h;
				overlayW = w;
				overlayH = h;
			}

			const effectivePhi = phi + dragPhi;
			const cp = Math.cos(effectivePhi),
				sp = Math.sin(effectivePhi);
			const ct = Math.cos(effectiveTheta),
				st = Math.sin(effectiveTheta);
			drawArcs(overlayCtx, w, h, cp, sp, ct, st);

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
		<canvas bind:this={overlayEl} class="pointer-events-none absolute inset-0 h-full w-full"
		></canvas>
		{#each airportLabels as label (label.id)}
			<AirportLabel {...label} onhover={(h) => (labelHovered = h)} />
		{/each}
	</div>
</div>
