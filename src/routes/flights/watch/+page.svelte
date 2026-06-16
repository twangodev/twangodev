<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Crosshair,
		Gauge,
		Pause,
		Play,
		Repeat,
		RotateCcw,
		SkipBack,
		SkipForward
	} from '@lucide/svelte';
	import NumberFlow from '@number-flow/svelte';
	import createGlobe from 'cobe';
	import { bio } from '$lib/bio.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import AirportLabel from '$lib/components/flights/AirportLabel.svelte';
	import { compactMilesFormatFor, formatCompactMiles } from '$lib/flights/format';
	import { interpolateGreatCircle } from '$lib/globe/projection';
	import { breadcrumbSchema } from '$lib/schema';
	import type { FlightAirport, FlightRoute } from '$lib/flights/data';

	const { data } = $props();
	const flights = $derived(data.flights as FlightRoute[]);
	const markers = $derived(data.markers);
	const airports = $derived(data.airports as FlightAirport[]);
	const totalMiles = $derived(data.totalMiles as number);

	let canvasEl: HTMLCanvasElement;
	let playing = $state(true);
	// Position along the playback track, measured in miles plus the phantom dwell gaps
	// inserted between legs (see GAP_MILES). Distinct from liveMiles, which is the real
	// distance flown.
	let trackCursor = $state(0);
	let speed = $state(16);
	let follow = $state(true);
	let repeat = $state(true);
	let activeDot = $state({ x: 0, y: 0, visible: false, pulse: 0 });

	const speedOptions = [1, 4, 8, 16, 32];
	const cumulativeMiles = $derived(
		flights.reduce<number[]>((totals: number[], flight: FlightRoute) => {
			totals.push((totals.at(-1) ?? 0) + flight.distance);
			return totals;
		}, [])
	);
	// Phantom dwell region inserted between consecutive legs, in track space (so the hold is
	// scrubbable). Its width does not set the pause length — DWELL_SECONDS does.
	const GAP_MILES = 100;
	// Fixed wall-clock hold between legs, applied regardless of playback speed so the wait
	// stays visible at 16x/32x instead of shrinking to nothing.
	const DWELL_SECONDS = 0.125;
	const trackStarts = $derived(
		flights.map((_: FlightRoute, i: number) => (cumulativeMiles[i - 1] ?? 0) + i * GAP_MILES)
	);
	const trackLength = $derived(
		flights.length === 0 ? 0 : (trackStarts.at(-1) ?? 0) + (flights.at(-1)?.distance ?? 0)
	);
	const trackState = $derived.by(() => {
		const count = flights.length;
		if (count === 0) return { index: 0, progress: 0, inGap: false };
		const clamped = Math.min(Math.max(trackCursor, 0), Math.max(0, trackLength - 0.001));
		for (let i = 0; i < count; i++) {
			const start = trackStarts[i];
			const span = flights[i].distance;
			if (clamped < start + span) {
				const progress = span > 0 ? (clamped - start) / span : 1;
				return { index: i, progress: Math.min(1, Math.max(0, progress)), inGap: false };
			}
			if (clamped < start + span + GAP_MILES) {
				return { index: i, progress: 1, inGap: true };
			}
		}
		return { index: count - 1, progress: 1, inGap: false };
	});
	const activeIndex = $derived(trackState.index);
	const inGap = $derived(trackState.inGap);
	const activeFlight = $derived(flights[activeIndex]);
	const airportByIata = $derived(new Map(airports.map((airport) => [airport.iata, airport])));
	const maxAirportCount = $derived(
		airports.length > 0 ? Math.max(...airports.map((a) => a.count)) : 1
	);
	const airportRank = $derived(new Map(airports.map((airport, i) => [airport.iata, i])));
	const playbackAirportLabels = $derived(
		activeFlight
			? Array.from(
					flights.slice(0, activeIndex + 1).reduce((visited, flight) => {
						visited.add(flight.fromIata);
						visited.add(flight.toIata);
						return visited;
					}, new Set<string>())
				)
					.map((iata) => {
						const airport = airportByIata.get(iata);
						if (!airport) return null;
						const baseImportance = 0.25 + 0.55 * (airport.count / maxAirportCount);
						const active = iata === activeFlight.fromIata || iata === activeFlight.toIata;
						const rank = airportRank.get(iata) ?? airports.length;
						return {
							id: airport.iata.toLowerCase(),
							iata: airport.iata,
							location: [airport.city, airport.subd, airport.country].filter(Boolean).join(', '),
							name: airport.name,
							count: airport.count,
							z: active ? 1000 - rank : airports.length - rank,
							importance: active ? Math.min(1, baseImportance + 0.18) : baseImportance * 0.55
						};
					})
					.filter((label) => label !== null)
			: []
	);
	const activeProgress = $derived(activeFlight ? trackState.progress : 0);
	const sortedFlightDistances = $derived(
		flights.map((flight) => flight.distance).toSorted((a, b) => a - b)
	);
	const shortFlightDistance = $derived(percentile(sortedFlightDistances, 0.25));
	const medianFlightDistance = $derived(percentile(sortedFlightDistances, 0.5));
	const activeFlightSpeedScale = $derived(
		activeFlight
			? flightSpeedScale(activeFlight.distance, shortFlightDistance, medianFlightDistance)
			: 1
	);
	const easedProgress = $derived(easeInOut(activeProgress));
	const arcHeadProgress = $derived(activeFlight ? Math.max(0.015, easedProgress) : 0);
	const liveMiles = $derived(
		activeFlight
			? Math.min(
					totalMiles,
					(cumulativeMiles[activeIndex - 1] ?? 0) + activeProgress * activeFlight.distance
				)
			: 0
	);
	const roundedLiveMiles = $derived(Math.round(liveMiles));
	const roundedTotalMiles = $derived(Math.round(totalMiles));
	const liveMilesFormat = $derived(compactMilesFormatFor(roundedLiveMiles));
	const totalMilesFormat = $derived(compactMilesFormatFor(roundedTotalMiles));
	const THETA = 0.3;
	const DPR = 2;
	const BASE_MILES_PER_SECOND = 240;
	const ACTIVE_TRAIL_PAD = 0.02;
	const COBE_GLOBE_RADIUS = 0.8;

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

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

	const arcColors = $derived(
		flights.map((_: FlightRoute, i: number) => hslToRgb((i * 137.508 + 205) % 360, 76, 62))
	);

	function formatDate(ms: number): string {
		return dateFormatter.format(new Date(ms));
	}

	function formatDuration(ms: number): string {
		const minutes = Math.max(1, Math.round(ms / 60000));
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `${m}m`;
		return m === 0 ? `${h}h` : `${h}h ${m}m`;
	}

	function easeInOut(t: number): number {
		const clamped = Math.min(1, Math.max(0, t));
		return clamped * clamped * (3 - 2 * clamped);
	}

	function percentile(values: number[], p: number): number {
		if (values.length === 0) return 0;
		const index = (values.length - 1) * p;
		const lower = Math.floor(index);
		const upper = Math.ceil(index);
		const amount = index - lower;
		return values[lower] + (values[upper] - values[lower]) * amount;
	}

	function flightSpeedScale(
		distance: number,
		shortDistance: number,
		medianDistance: number
	): number {
		if (medianDistance <= shortDistance) return 1;
		if (distance <= shortDistance) return 0.5;
		if (distance >= medianDistance) return 1;
		return 0.5 + easeInOut((distance - shortDistance) / (medianDistance - shortDistance)) * 0.5;
	}

	$effect(() => {
		if (!activeFlight) return;
		const fromAirport = airportByIata.get(activeFlight.fromIata);
		const toAirport = airportByIata.get(activeFlight.toIata);
		const airportDescription =
			fromAirport && toAirport
				? `${fromAirport.name} to ${toAirport.name}.`
				: 'chronological playback of the flight log.';

		bio.set({
			headingRoute: { from: activeFlight.fromIata, to: activeFlight.toIata },
			description: airportDescription,
			handwriting: playing
				? ['in motion', 'cruising', 'airspeed']
				: ['paused', 'holding', 'standby'],
			details: [
				{
					label: 'flight',
					value: activeFlight.flightNumber ?? 'unknown',
					annotation: `${activeIndex + 1}/${flights.length}`
				},
				{
					label: 'leg',
					value: `${Math.round(activeProgress * 100)}%`,
					annotation: formatCompactMiles(activeFlight.distance)
				},
				{
					label: 'date',
					value: formatDate(activeFlight.depMs),
					annotation: activeFlight.estimatedArrival
						? 'arrival est.'
						: formatDuration(activeFlight.durationMs)
				},
				{
					label: 'state',
					value: playing ? `${speed}x playback` : 'paused',
					annotation: `${follow ? 'following' : 'free camera'}, ${repeat ? 'repeat' : 'single pass'}`
				}
			]
		});
	});

	function setCursor(value: number) {
		trackCursor = Math.min(Math.max(value, 0), Math.max(0, trackLength - 0.001));
	}

	function skip(delta: number) {
		const nextIndex = Math.min(Math.max(activeIndex + delta, 0), Math.max(0, flights.length - 1));
		setCursor(trackStarts[nextIndex] ?? 0);
		follow = true;
	}

	function resetPlayback() {
		trackCursor = 0;
		playing = true;
		follow = true;
	}

	function cycleSpeed() {
		const index = speedOptions.indexOf(speed);
		speed = speedOptions[(index + 1) % speedOptions.length];
	}

	function locationToAngles(lat: number, lng: number): { phi: number; theta: number } {
		return {
			phi: -Math.PI / 2 - (lng * Math.PI) / 180,
			theta: (lat * Math.PI) / 180
		};
	}

	function lerp(a: number, b: number, amount: number): number {
		return a + (b - a) * amount;
	}

	function lerpAngle(a: number, b: number, amount: number): number {
		const diff = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
		return a + diff * amount;
	}

	function latLonToCobe3D([lat, lng]: [number, number]): [number, number, number] {
		const latRad = (lat * Math.PI) / 180;
		const lngRad = (lng * Math.PI) / 180 - Math.PI;
		const cosLat = Math.cos(latRad);
		return [-cosLat * Math.cos(lngRad), Math.sin(latRad), cosLat * Math.sin(lngRad)];
	}

	function angularDistance(from: [number, number], to: [number, number]): number {
		const a = latLonToCobe3D(from);
		const b = latLonToCobe3D(to);
		const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
		return Math.acos(Math.min(1, Math.max(-1, dot)));
	}

	function projectCobeArcHead(
		flight: FlightRoute,
		progress: number,
		phi: number,
		theta: number,
		width: number,
		height: number
	): { x: number; y: number; visible: boolean } {
		const fromDir = latLonToCobe3D(flight.from);
		const toDir = latLonToCobe3D(flight.to);
		const endpointR = COBE_GLOBE_RADIUS;
		const from = fromDir.map((value) => value * endpointR) as [number, number, number];
		const to = toDir.map((value) => value * endpointR) as [number, number, number];

		const midSum: [number, number, number] = [
			fromDir[0] + toDir[0],
			fromDir[1] + toDir[1],
			fromDir[2] + toDir[2]
		];
		const midLen = Math.hypot(...midSum);
		const midDir =
			midLen > 0.001
				? (midSum.map((value) => value / midLen) as [number, number, number])
				: ([0, 1, 0] as [number, number, number]);
		const arcHeight = angularDistance(flight.from, flight.to) / Math.PI;
		const mid = midDir.map((value) => value * (COBE_GLOBE_RADIUS + arcHeight)) as [
			number,
			number,
			number
		];

		const t = Math.min(1, Math.max(0, progress));
		const u = 1 - t;
		const point: [number, number, number] = [
			u * u * from[0] + 2 * u * t * mid[0] + t * t * to[0],
			u * u * from[1] + 2 * u * t * mid[1] + t * t * to[1],
			u * u * from[2] + 2 * u * t * mid[2] + t * t * to[2]
		];

		const cx = Math.cos(theta);
		const sx = Math.sin(theta);
		const cy = Math.cos(phi);
		const sy = Math.sin(phi);
		const rx = cy * point[0] + sy * point[2];
		const ry = sy * sx * point[0] + cx * point[1] - cy * sx * point[2];
		const rz = -sy * cx * point[0] + sx * point[1] + cy * cx * point[2];
		const visible = rz >= 0 || Math.hypot(rx, ry) >= COBE_GLOBE_RADIUS;

		return {
			x: width / 2 + (rx * height) / 2,
			y: height / 2 - (ry * height) / 2,
			visible
		};
	}

	function buildPlaybackArcs() {
		return flights.map((flight: FlightRoute, i: number) => {
			let progress = -1;
			let trailLength = 0.01;

			if (i < activeIndex) {
				progress = 1;
				trailLength = 1.02;
			} else if (i === activeIndex) {
				progress = arcHeadProgress;
				trailLength = Math.min(1.02, progress + ACTIVE_TRAIL_PAD);
			}

			return {
				id: flight.id,
				from: flight.from,
				to: flight.to,
				color: arcColors[i],
				progress,
				trailLength
			};
		});
	}

	function buildPlaybackMarkers() {
		return markers;
	}

	onMount(() => {
		if (flights.length === 0) return;

		let phi = 0;
		let theta = THETA;
		let dragging = false;
		let lastX = 0;
		let lastY = 0;
		let lastFrame = performance.now();

		const first = flights[0];
		const initial = locationToAngles(first.from[0], first.from[1]);
		phi = initial.phi;
		theta = initial.theta;

		readTheme();
		const themeObserver = new MutationObserver(() => readTheme());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		const onPointerDown = (e: PointerEvent) => {
			dragging = true;
			follow = false;
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
			markers: buildPlaybackMarkers(),
			markerElevation: 0,
			arcWidth: 0.48,
			arcs: buildPlaybackArcs()
		});

		let animationId: number;
		function animate(now: number) {
			const dt = Math.min(0.08, (now - lastFrame) / 1000);
			lastFrame = now;

			if (playing) {
				// In a dwell, cross the gap at a fixed wall-clock rate so the wait is identical at
				// every speed; otherwise advance at the current playback speed.
				const advance = inGap
					? dt * (GAP_MILES / DWELL_SECONDS)
					: dt * BASE_MILES_PER_SECOND * speed * activeFlightSpeedScale;
				const next = trackCursor + advance;
				if (next >= trackLength) {
					if (repeat) {
						trackCursor = 0;
					} else {
						setCursor(trackLength);
						playing = false;
					}
				} else {
					trackCursor = next;
				}
			}
			const pulse = (Math.sin(now / 240) + 1) / 2;

			if (follow && activeFlight) {
				// During the dwell, ease the camera all the way onto the arrival airport.
				const lookahead = inGap ? 1 : Math.min(0.88, Math.max(0.12, easedProgress));
				const [lat, lng] = interpolateGreatCircle(activeFlight.from, activeFlight.to, lookahead);
				const target = locationToAngles(lat, lng);
				phi = lerpAngle(phi, target.phi, 0.045);
				theta = Math.max(-0.9, Math.min(1.25, lerp(theta, target.theta, 0.045)));
			}

			if (activeFlight) {
				activeDot = {
					...projectCobeArcHead(
						activeFlight,
						arcHeadProgress,
						phi,
						theta,
						canvasEl.offsetWidth,
						canvasEl.offsetHeight
					),
					pulse
				};
			} else {
				activeDot.visible = false;
			}

			globe.update({
				phi,
				theta,
				width: canvasEl.offsetWidth,
				height: canvasEl.offsetHeight,
				dark: themeDark,
				baseColor: themeBase,
				glowColor: themeGlow,
				markerColor: themeMarker,
				markers: buildPlaybackMarkers(),
				arcs: buildPlaybackArcs()
			});

			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(animationId);
			themeObserver.disconnect();
			canvasEl.removeEventListener('pointerdown', onPointerDown);
			canvasEl.removeEventListener('pointermove', onPointerMove);
			canvasEl.removeEventListener('pointerup', onPointerUp);
			canvasEl.removeEventListener('pointercancel', onPointerUp);
			globe.destroy();
			bio.clear();
		};
	});
</script>

<SEO
	title="Flight Watch"
	description="Chronological playback of flights"
	canonical="/flights/watch"
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Flights', url: '/flights' },
		{ name: 'Watch', url: '/flights/watch' }
	])}
/>

<div class="relative flex min-h-[calc(100svh-16rem)] flex-1 flex-col overflow-hidden">
	<div class="relative flex min-h-0 flex-1 items-center justify-center">
		<div class="relative aspect-square max-h-[calc(100svh-18rem)] w-full max-w-5xl">
			<canvas bind:this={canvasEl} style="cursor: grab" class="absolute inset-0 h-full w-full"
			></canvas>
			{#each playbackAirportLabels as label (label.id)}
				<AirportLabel {...label} />
			{/each}
			{#if activeFlight}
				<div
					class="active-flight-ping pointer-events-none absolute"
					style:left={`${activeDot.x}px`}
					style:top={`${activeDot.y}px`}
					style:opacity={activeDot.visible ? 1 : 0.38}
					style:--active-flight-pulse={activeDot.pulse}
					class:active-flight-ping--occluded={!activeDot.visible}
				>
					<span></span>
				</div>
			{/if}
		</div>
	</div>

	<div
		class="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-3 bg-bg/80 px-1 py-2 backdrop-blur"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-1.5">
				<button
					type="button"
					aria-label="Previous flight"
					class="control-button"
					onclick={() => skip(-1)}
				>
					<SkipBack size={15} strokeWidth={1.8} />
				</button>
				<button
					type="button"
					aria-label={playing ? 'Pause playback' : 'Play playback'}
					class="control-button text-text"
					onclick={() => (playing = !playing)}
				>
					{#if playing}
						<Pause size={16} strokeWidth={1.8} />
					{:else}
						<Play size={16} strokeWidth={1.8} />
					{/if}
				</button>
				<button
					type="button"
					aria-label="Next flight"
					class="control-button"
					onclick={() => skip(1)}
				>
					<SkipForward size={15} strokeWidth={1.8} />
				</button>
				<button
					type="button"
					aria-label="Restart and follow"
					class="control-button"
					onclick={resetPlayback}
				>
					<RotateCcw size={15} strokeWidth={1.8} />
				</button>
			</div>

			<div class="flex items-center gap-1.5 font-mono text-[11px] text-muted">
				<button
					type="button"
					aria-label={`Playback speed ${speed}x`}
					class="control-button w-auto gap-1 px-2 font-mono text-[11px]"
					onclick={cycleSpeed}
				>
					<Gauge size={15} strokeWidth={1.8} />
					<span>{speed}x</span>
				</button>
				<button
					type="button"
					aria-label={follow ? 'Disable follow camera' : 'Follow active flight'}
					class="control-button"
					class:control-button--active={follow}
					class:text-text={follow}
					onclick={() => (follow = !follow)}
				>
					<Crosshair size={15} strokeWidth={1.8} />
				</button>
				<button
					type="button"
					aria-label={repeat ? 'Disable repeat' : 'Enable repeat'}
					class="control-button"
					class:control-button--active={repeat}
					class:text-text={repeat}
					onclick={() => (repeat = !repeat)}
				>
					<Repeat size={15} strokeWidth={1.8} />
				</button>
			</div>
		</div>

		<div class="grid items-center gap-2">
			<input
				type="range"
				min="0"
				max={Math.max(0, trackLength - 0.001)}
				step="1"
				value={trackCursor}
				aria-label="Flight playback position"
				class="watch-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-subtle"
				oninput={(e) => {
					playing = false;
					follow = true;
					setCursor(Number(e.currentTarget.value));
				}}
			/>
			<div class="flex items-baseline justify-between gap-4 font-mono text-[10px] text-muted/75">
				<span class="min-w-0 tabular-nums">
					<NumberFlow value={roundedLiveMiles} format={liveMilesFormat} />
					<span> miles</span>
				</span>
				<span class="shrink-0 tabular-nums">
					<span>of </span>
					<NumberFlow value={roundedTotalMiles} format={totalMilesFormat} />
					<span> miles</span>
				</span>
			</div>
		</div>
	</div>
</div>

<style>
	.control-button {
		display: inline-flex;
		height: 2rem;
		width: 2rem;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		border: 0;
		background: transparent;
		color: var(--color-muted);
		transition:
			color 150ms ease,
			background-color 150ms ease;
	}

	.control-button:hover {
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		color: var(--color-text);
	}

	.control-button--active {
		background: color-mix(in srgb, var(--color-surface) 88%, var(--color-text) 12%);
		color: var(--color-text);
	}

	.control-button--active:hover {
		background: color-mix(in srgb, var(--color-surface) 82%, var(--color-text) 18%);
	}

	.control-button:focus-visible {
		outline: none;
		background: color-mix(in srgb, var(--color-surface) 80%, transparent);
		color: var(--color-text);
	}

	.watch-range::-webkit-slider-thumb {
		appearance: none;
		width: 0.875rem;
		height: 0.875rem;
		border-radius: 9999px;
		border: 2px solid var(--color-bg);
		background: var(--color-text);
		box-shadow: 0 0 0 1px var(--color-subtle);
	}

	.watch-range::-moz-range-thumb {
		width: 0.875rem;
		height: 0.875rem;
		border: 2px solid var(--color-bg);
		border-radius: 9999px;
		background: var(--color-text);
		box-shadow: 0 0 0 1px var(--color-subtle);
	}

	.watch-range:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
	}

	.active-flight-ping {
		width: 0.75rem;
		height: 0.75rem;
		translate: -50% -50%;
		transition: opacity 120ms ease;
		isolation: isolate;
	}

	.active-flight-ping--occluded {
		width: 0.375rem;
		height: 0.375rem;
	}

	.active-flight-ping span {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 9999px;
		background: color-mix(in srgb, white 28%, transparent);
		box-shadow: 0 0 0 calc(2px + var(--active-flight-pulse) * 3px)
			color-mix(in srgb, white 18%, transparent);
		animation: active-flight-ping 1.15s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	.active-flight-ping::after {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 1;
		width: 0.5rem;
		height: 0.5rem;
		content: '';
		border-radius: 9999px;
		border: 1px solid color-mix(in srgb, var(--color-bg) 86%, transparent);
		background: white;
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--color-text) 35%, transparent),
			0 0 8px color-mix(in srgb, white 35%, transparent);
		transform: translate(-50%, -50%);
	}

	.active-flight-ping--occluded span {
		background: color-mix(in srgb, white 24%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, white 14%, transparent);
		animation: none;
	}

	.active-flight-ping--occluded::after {
		width: 0.375rem;
		height: 0.375rem;
		box-shadow: 0 0 0 1px color-mix(in srgb, white 14%, transparent);
	}

	@keyframes active-flight-ping {
		75%,
		100% {
			transform: scale(3);
			opacity: 0;
		}
	}
</style>
