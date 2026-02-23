<script lang="ts">
	import { onMount } from 'svelte';
	import createGlobe from 'cobe';
	import { projectArc } from '$lib/globe/projection';

	const { data } = $props();
	const flights = $derived(data.arcs);
	const markers = $derived(data.markers);
	const airports = $derived(data.airports);

	let canvasEl: HTMLCanvasElement;
	let overlayEl: HTMLCanvasElement;

	const THETA = 0.3;
	const DPR = 2;

	function hexToRgb(hex: string): [number, number, number] {
		const n = parseInt(hex.replace('#', ''), 16);
		return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
	}

	// Cached theme colors, updated each frame
	let themeBase: [number, number, number] = [0.137, 0.133, 0.118];
	let themeGlow: [number, number, number] = [0.102, 0.098, 0.086];
	let themeMarker: [number, number, number] = [0.478, 0.459, 0.408];
	let themeText = '232, 229, 223';
	let themeDark = 1;

	function readTheme() {
		const s = getComputedStyle(document.documentElement);
		const isDark = document.documentElement.classList.contains('dark');
		themeDark = isDark ? 0.75 : 0;
		themeBase = hexToRgb(s.getPropertyValue('--color-surface').trim());
		themeGlow = hexToRgb(s.getPropertyValue('--color-bg').trim());
		const muted = hexToRgb(s.getPropertyValue('--color-muted').trim());
		themeMarker = [muted[0] * 0.4, muted[1] * 0.4, muted[2] * 0.4];

		const text = s.getPropertyValue('--color-text').trim();
		const [tr, tg, tb] = hexToRgb(text);
		themeText = `${Math.round(tr * 255)}, ${Math.round(tg * 255)}, ${Math.round(tb * 255)}`;
	}

	const RAY_LENGTH = 0.25; // fraction of arc that the ray tail covers
	const RAY_SPEED = 0.004; // progress per frame (0→1)

	// Stagger each flight's start so they don't all animate in sync
	let rayHeads = $derived(flights.map((_: unknown, i: number) => i / flights.length));

	// Stable random hue per flight, computed once from index
	const flightHues = $derived(flights.map((_: unknown, i: number) => (i * 137.508) % 360));

	function drawArcs(
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
		phi: number,
		theta: number
	) {
		ctx.clearRect(0, 0, w, h);
		ctx.save();
		ctx.scale(DPR, DPR);

		const cssW = w / DPR;
		const cssH = h / DPR;

		for (let f = 0; f < flights.length; f++) {
			// Advance ray head, loop back to 0
			rayHeads[f] = (rayHeads[f] + RAY_SPEED) % (1 + RAY_LENGTH);
			const head = rayHeads[f];
			const tail = head - RAY_LENGTH;

			const points = projectArc(flights[f], phi, theta, cssW, cssH);
			const steps = points.length - 1;

			// Draw segment-by-segment so each segment gets its own opacity
			for (let i = 0; i < steps; i++) {
				const a = points[i];
				const b = points[i + 1];
				if (!a || !b) continue;

				const tMid = (i + 0.5) / steps;

				// Ray visibility: segment is visible if it's between tail and head
				if (tMid < tail || tMid > head) continue;

				// Brightness ramps up toward the head
				const rayAlpha = (tMid - tail) / RAY_LENGTH;
				// Combine with depth fade near the limb
				const alpha = rayAlpha * (0.15 + 0.85 * Math.min(a.depth, b.depth));

				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.strokeStyle = `hsla(${flightHues[f]}, 80%, 65%, ${alpha})`;
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
		}

		ctx.restore();
	}

	// Candidate offsets: [dx, dy, textAlign]
	const OFFSETS: [number, number, CanvasTextAlign][] = [
		[6, 0, 'left'],
		[6, -10, 'left'],
		[6, 10, 'left'],
		[-6, 0, 'right'],
		[-6, -10, 'right'],
		[-6, 10, 'right'],
		[0, -10, 'center'],
		[0, 10, 'center']
	];

	// Sticky offset index per airport — only changes when a much better option exists
	let chosenOffsets: number[] = [];

	function totalOverlap(
		lx: number,
		ly: number,
		lw: number,
		lh: number,
		rects: { x: number; y: number; w: number; h: number }[]
	) {
		let sum = 0;
		for (const r of rects) {
			const ox = Math.max(0, Math.min(lx + lw, r.x + r.w) - Math.max(lx, r.x));
			const oy = Math.max(0, Math.min(ly + lh, r.y + r.h) - Math.max(ly, r.y));
			sum += ox * oy;
		}
		return sum;
	}

	function labelRect(
		px: number,
		py: number,
		offsetIdx: number,
		lw: number,
		lh: number,
		fontSize: number
	) {
		const [dx, dy, align] = OFFSETS[offsetIdx];
		let lx = px + dx;
		if (align === 'right') lx -= lw;
		else if (align === 'center') lx -= lw / 2;
		const ly = py + dy - fontSize / 2;
		return { x: lx, y: ly, w: lw, h: lh };
	}

	// Project airport to screen without hard occlusion cutoff.
	// Returns null only for fully behind the globe; otherwise returns depth
	// that can go slightly negative (for smooth fade at limb).
	function projectAirport(
		lat: number,
		lng: number,
		phi: number,
		theta: number,
		cssW: number,
		cssH: number
	) {
		const latRad = (lat * Math.PI) / 180;
		const lngRad = (lng * Math.PI) / 180 - Math.PI;

		const cosLat = Math.cos(latRad);
		const dx = -cosLat * Math.cos(lngRad);
		const dy = Math.sin(latRad);
		const dz = cosLat * Math.sin(lngRad);

		const cp = Math.cos(phi),
			sp = Math.sin(phi);
		const ct = Math.cos(theta),
			st = Math.sin(theta);

		// Depth: how far in front of the globe center (1 = facing camera, 0 = limb, <0 = behind)
		const depth = dx * (-sp * ct) + dy * st + dz * (cp * ct);

		// Skip anything well behind the globe
		if (depth < -0.1) return null;

		const vx = dx * cp + dz * sp;
		const vy = dx * sp * st + dy * ct + dz * (-cp * st);

		const globeRadius = 0.8;
		const size = Math.min(cssW, cssH);
		const aspect = cssW / cssH;
		const x = cssW / 2 + (vx / aspect) * globeRadius * (size / 2);
		const y = cssH / 2 - vy * globeRadius * (size / 2);

		return { x, y, depth };
	}

	function drawLabels(
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
		phi: number,
		theta: number
	) {
		const cssW = w / DPR;
		const cssH = h / DPR;

		if (chosenOffsets.length !== airports.length) {
			chosenOffsets = new Array(airports.length).fill(0);
		}

		ctx.save();
		ctx.scale(DPR, DPR);

		const fontSize = 9;
		ctx.font = `${fontSize}px monospace`;
		ctx.textBaseline = 'middle';
		const padding = 2;
		// Labels fade in over this depth range (0 = limb)
		const fadeStart = 0.15;

		const placed: { x: number; y: number; w: number; h: number }[] = [];

		for (let i = 0; i < airports.length; i++) {
			const a = airports[i];
			const pt = projectAirport(a.location[0], a.location[1], phi, theta, cssW, cssH);
			if (!pt) continue;

			// Smooth opacity: ramp from 0 at the limb to full at fadeStart
			const alpha = Math.min(1, Math.max(0, pt.depth / fadeStart));
			if (alpha < 0.01) continue;

			const lw = ctx.measureText(a.iata).width + padding * 2;
			const lh = fontSize + padding * 2;

			// Score current sticky choice
			const curRect = labelRect(pt.x, pt.y, chosenOffsets[i], lw, lh, fontSize);
			const curOverlap = totalOverlap(curRect.x, curRect.y, lw, lh, placed);

			if (curOverlap > 0) {
				let bestIdx = chosenOffsets[i];
				let bestScore = curOverlap;
				for (let j = 0; j < OFFSETS.length; j++) {
					if (j === chosenOffsets[i]) continue;
					const r = labelRect(pt.x, pt.y, j, lw, lh, fontSize);
					const score = totalOverlap(r.x, r.y, lw, lh, placed);
					if (score < bestScore) {
						bestScore = score;
						bestIdx = j;
						if (score === 0) break;
					}
				}
				if (bestScore < curOverlap * 0.5) {
					chosenOffsets[i] = bestIdx;
				}
			}

			const rect = labelRect(pt.x, pt.y, chosenOffsets[i], lw, lh, fontSize);
			placed.push(rect);

			ctx.fillStyle = `rgba(${themeText}, ${alpha})`;
			ctx.fillText(a.iata, rect.x + padding, rect.y + lh / 2);
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

		readTheme();

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
			width: canvasEl.offsetWidth * DPR,
			height: canvasEl.offsetHeight * DPR,
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
			onRender: (state) => {
				readTheme();

				if (pointerInteracting === null) phi += 0.0018;
				dragPhi += (pointerMovement / 200 - dragPhi) * 0.1;
				dragTheta += (pointerMovementY / 300 - dragTheta) * 0.1;
				const effectiveTheta = Math.max(-0.5, Math.min(1.2, THETA + dragTheta));

				state.phi = phi + dragPhi;
				state.theta = effectiveTheta;
				state.dark = themeDark;
				state.baseColor = themeBase;
				state.glowColor = themeGlow;
				state.markerColor = themeMarker;

				const w = canvasEl.offsetWidth * DPR;
				const h = canvasEl.offsetHeight * DPR;
				state.width = w;
				state.height = h;

				// Sync overlay canvas size
				overlayEl.width = w;
				overlayEl.height = h;

				const effectivePhi = phi + dragPhi;
				drawArcs(overlayCtx, w, h, effectivePhi, effectiveTheta);
				drawLabels(overlayCtx, w, h, effectivePhi, effectiveTheta);
			}
		});
		return () => {
			canvasEl.removeEventListener('pointerdown', onPointerDown);
			canvasEl.removeEventListener('pointerup', onPointerUp);
			canvasEl.removeEventListener('pointerout', onPointerUp);
			canvasEl.removeEventListener('mousemove', onMouseMove);
			canvasEl.removeEventListener('touchmove', onTouchMove);
			globe.destroy();
		};
	});
</script>

<div class="flex flex-1 items-center justify-center">
	<div class="relative aspect-square w-full max-w-5xl">
		<canvas bind:this={canvasEl} style="cursor: grab" class="absolute inset-0 h-full w-full"
		></canvas>
		<canvas bind:this={overlayEl} class="pointer-events-none absolute inset-0 h-full w-full"
		></canvas>
	</div>
</div>
