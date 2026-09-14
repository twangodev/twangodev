<script lang="ts">
	import { ArrowLeftRight } from '@lucide/svelte';
	import { RouteCamera } from '$lib/globe/route-camera';
	import '$lib/globe/globe.css';
	import type { Arc } from 'cobe';
	import { SvelteMap } from 'svelte/reactivity';
	import type { RouteSummary } from '$lib/flights/route-summaries';
	import {
		sampleArc,
		projectSegments,
		pickRoute,
		type View,
		type Point,
		type ProjectedRoute
	} from '$lib/globe/route-picking';

	interface Props {
		canvas: HTMLCanvasElement | undefined;
		routes: RouteSummary[];
		routeIds: string[];
		ondrag: (dx: number, dy: number) => void;
		ondragstart: () => void;
		ondragend: () => void;
		onfocuschange?: (focused: boolean) => void;
	}
	const { canvas, routes, routeIds, ondrag, ondragstart, ondragend, onfocuschange }: Props =
		$props();
	const camera = new RouteCamera();
	let reducedMotion = false;
	let wasFocused = false;
	let selected = $state<string | null>(null);
	let pinned = $state(false);
	let path = $state('');
	let anchor = $state<Point>({ x: 8, y: 48 });
	let dimensions = $state({ width: 0, height: 0 });
	let tooltipWidth = $state(240),
		tooltipHeight = $state(100);
	let overTooltip = false;
	let pointer: Point | null = null;
	let canAcquire = false;
	let focusPivot: Point = { x: 0.5, y: 0.5 };
	let dragging = false;
	let down: { id: number; x: number; y: number; lastX: number; lastY: number } | null = null;
	let pendingTap: Point | null = null;
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;
	let geometry: ReturnType<typeof sampleArc>[] = [];
	let geometryKeys: string[] = [];
	let projected: ProjectedRoute[] = [];
	const summary = $derived(routes.find((route) => route.id === selected));
	const tooltipX = $derived(
		Math.max(4, Math.min(anchor.x + 12, dimensions.width - tooltipWidth - 4))
	);
	const tooltipY = $derived(
		Math.max(4, Math.min(anchor.y + 12, dimensions.height - tooltipHeight - 4))
	);

	export function isPaused() {
		return selected !== null || camera.active;
	}
	export function getView(base: View, arcs: Arc[], now: number): View {
		const index = routeIds.findIndex((id) => id === selected);
		const view = camera.step(
			base,
			selected && index >= 0
				? {
						id: selected,
						arc: arcs[index],
						pivot: { x: focusPivot.x * base.width, y: focusPivot.y * base.height }
					}
				: null,
			now,
			reducedMotion
		);
		const focused = selected !== null || camera.active;
		if (focused !== wasFocused) {
			wasFocused = focused;
			onfocuschange?.(focused);
		}
		return view;
	}

	export function clear() {
		selected = null;
		canAcquire = false;
		overTooltip = false;
		pinned = false;
		path = '';
		pointer = null;
		pendingTap = null;
		cancelLeave();
		if (canvas && !dragging) canvas.style.cursor = 'grab';
	}

	function cancelLeave() {
		if (leaveTimer) clearTimeout(leaveTimer);
		leaveTimer = undefined;
	}

	function scheduleLeave() {
		if (leaveTimer || pinned) return;
		leaveTimer = setTimeout(() => {
			leaveTimer = undefined;
			if (!overTooltip && !pinned) clear();
		}, 150);
	}

	function refreshHighlight(view: View) {
		const index = routeIds.findIndex((id) => id === selected);
		// Reveal the complete route immediately on acquisition, including the first frame.
		// One representative also avoids drawing repeat/reverse flights over each other.
		path = (index >= 0 ? projectSegments(geometry[index], view, {}) : [])
			.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`)
			.join('');
	}

	export function update(view: View, arcs: Arc[]) {
		if (dimensions.width !== view.width || dimensions.height !== view.height) {
			dimensions = { width: view.width, height: view.height };
		}
		if (dragging || (!pointer && !selected && !pendingTap)) return;
		// Camera motion alone must never acquire a replacement route, including on return.
		if (!selected && !pendingTap && (camera.active || !canAcquire)) return;
		projected = arcs.map((arc, i) => {
			const key = `${arc.from.join(',')}/${arc.to.join(',')}`;
			if (geometryKeys[i] !== key) {
				geometry[i] = sampleArc(arc);
				geometryKeys[i] = key;
			}
			return {
				id: routeIds[i],
				segments: projectSegments(geometry[i], view, routeIds[i] === selected ? {} : arc)
			};
		});
		// Aggregate repeated and reverse-direction traces before applying hover hysteresis.
		const grouped = new SvelteMap<string, ProjectedRoute>();
		for (const route of projected) {
			const group = grouped.get(route.id);
			if (group) group.segments.push(...route.segments);
			else grouped.set(route.id, { id: route.id, segments: [...route.segments] });
		}
		projected = [...grouped.values()];
		if (pendingTap) {
			selected = pickRoute(projected, pendingTap, null, 12);
			pinned = selected !== null;
			anchor = pendingTap;
			focusPivot = { x: anchor.x / view.width, y: anchor.y / view.height };
			canAcquire = false;
			pendingTap = null;
		} else if (!pinned && !overTooltip && pointer) {
			// Keep the selected route locked, including at crossings. No other route can
			// replace it until inspection ends and a fresh pointer move starts a new hit test.
			const holding = selected && Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y) <= 10;
			const radius = Math.hypot(
				(pointer.x - view.width / 2) / (view.width / 2),
				(pointer.y - view.height / 2) / (view.height / 2)
			);
			const next = holding
				? selected
				: radius < 0.94
					? pickRoute(
							selected ? projected.filter((route) => route.id === selected) : projected,
							pointer,
							selected
						)
					: null;
			if (!next && selected) scheduleLeave();
			else {
				cancelLeave();
				if (next !== selected) {
					selected = next;
					anchor = pointer;
					focusPivot = { x: anchor.x / view.width, y: anchor.y / view.height };
					canAcquire = false;
				}
			}
		}
		refreshHighlight(view);
		if (canvas) canvas.style.cursor = selected ? 'pointer' : 'grab';
	}

	function deferLeave() {
		pointer = null;
		scheduleLeave();
	}

	$effect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const change = () => {
			reducedMotion = query.matches;
		};
		change();
		query.addEventListener('change', change);
		return () => query.removeEventListener('change', change);
	});

	$effect(() => {
		if (!canvas) return;
		const element = canvas;
		function local(e: PointerEvent): Point {
			const rect = element.getBoundingClientRect();
			return {
				x: ((e.clientX - rect.left) * element.offsetWidth) / rect.width,
				y: ((e.clientY - rect.top) * element.offsetHeight) / rect.height
			};
		}
		function pointerDown(e: PointerEvent) {
			if (!e.isPrimary || e.button !== 0) return;
			clear();
			down = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY };
			element.setPointerCapture(e.pointerId);
		}
		function pointerMove(e: PointerEvent) {
			if (!e.isPrimary) return;
			if (down) {
				if (e.pointerId !== down.id) return;
				if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
					dragging = true;
					clear();
					ondragstart();
					element.style.cursor = 'grabbing';
				}
				if (dragging) ondrag(e.clientX - down.lastX, e.clientY - down.lastY);
				down.lastX = e.clientX;
				down.lastY = e.clientY;
				return;
			}
			if (e.pointerType !== 'touch') {
				pointer = local(e);
				if (!selected && !camera.active) canAcquire = true;
			}
		}
		function pointerUp(e: PointerEvent) {
			if (!down || down.id !== e.pointerId) return;
			const wasDragging = dragging;
			down = null;
			dragging = false;
			if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
			if (wasDragging) ondragend();
			else if (e.pointerType === 'touch') pendingTap = local(e);
			else pointer = local(e);
			element.style.cursor = 'grab';
		}
		function lostCapture() {
			if (down) cancel();
		}
		function cancel() {
			const id = down?.id;
			if (dragging) ondragend();
			down = null;
			dragging = false;
			clear();
			if (id !== undefined && element.hasPointerCapture(id)) element.releasePointerCapture(id);
		}
		function enter(e: PointerEvent) {
			if (!down && e.pointerType !== 'touch') pointer = local(e);
		}
		function leave(e: PointerEvent) {
			if (down) return;
			// A moving airport label can pass beneath a stationary pointer during focus.
			// That is not user intent to leave the route.
			const position = local(e);
			if (selected && Math.hypot(position.x - anchor.x, position.y - anchor.y) <= 10) return;
			const target = e.relatedTarget;
			if (target instanceof Element && target.closest('[data-airport-label]')) {
				clear();
				return;
			}
			deferLeave();
		}
		function outsideMove(e: PointerEvent) {
			if (
				!selected ||
				pinned ||
				down ||
				!e.isPrimary ||
				e.pointerType === 'touch' ||
				e.target === element
			)
				return;
			const target = e.target;
			if (target instanceof Element && target.closest('[data-route-summary]')) return;
			const position = local(e);
			if (Math.hypot(position.x - anchor.x, position.y - anchor.y) <= 10) return;
			if (target instanceof Element && target.closest('[data-airport-label]')) clear();
			else deferLeave();
		}
		function key(e: KeyboardEvent) {
			if (e.key === 'Escape') clear();
		}
		element.addEventListener('pointerdown', pointerDown);
		element.addEventListener('pointermove', pointerMove);
		element.addEventListener('pointerup', pointerUp);
		element.addEventListener('pointercancel', cancel);
		element.addEventListener('lostpointercapture', lostCapture);
		element.addEventListener('pointerenter', enter);
		element.addEventListener('pointerleave', leave);
		window.addEventListener('keydown', key);
		window.addEventListener('pointermove', outsideMove);
		window.addEventListener('blur', cancel);
		return () => {
			element.removeEventListener('pointerdown', pointerDown);
			element.removeEventListener('pointermove', pointerMove);
			element.removeEventListener('pointerup', pointerUp);
			element.removeEventListener('pointercancel', cancel);
			element.removeEventListener('lostpointercapture', lostCapture);
			element.removeEventListener('pointerenter', enter);
			element.removeEventListener('pointerleave', leave);
			window.removeEventListener('keydown', key);
			window.removeEventListener('pointermove', outsideMove);
			window.removeEventListener('blur', cancel);
			cancelLeave();
		};
	});
</script>

<svg
	aria-hidden="true"
	class="globe-edge-fade pointer-events-none absolute inset-0 h-full w-full text-text"
	viewBox={`0 0 ${dimensions.width || 1} ${dimensions.height || 1}`}
>
	<path d={path} fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
</svg>
{#if summary}
	<div
		data-route-summary
		role="status"
		class="absolute z-[10000] w-max max-w-[calc(100%-0.5rem)] rounded-lg bg-surface p-3 text-xs text-text shadow-lg"
		bind:clientWidth={tooltipWidth}
		bind:clientHeight={tooltipHeight}
		style:left={`${tooltipX}px`}
		style:top={`${tooltipY}px`}
		onpointerenter={() => {
			overTooltip = true;
			cancelLeave();
		}}
		onpointerleave={() => {
			overTooltip = false;
			deferLeave();
		}}
	>
		<div class="flex items-center justify-between gap-4">
			<strong class="flex items-center gap-1.5 font-mono text-sm">
				{summary.from.code}
				<ArrowLeftRight size={14} aria-hidden="true" class="shrink-0" />
				<span class="sr-only">to and from</span>
				{summary.to.code}
			</strong>
			<button
				type="button"
				aria-label="Dismiss route summary"
				class="rounded px-1 text-muted hover:text-text focus-visible:outline"
				onclick={clear}>×</button
			>
		</div>
		{#if summary.from.city || summary.to.city}<p class="mt-1 flex items-center gap-1.5 text-muted">
				{summary.from.city ?? summary.from.code}
				<ArrowLeftRight size={12} aria-hidden="true" class="shrink-0" />
				<span class="sr-only">to and from</span>
				{summary.to.city ?? summary.to.code}
			</p>{/if}
		<p class="mt-2">
			{Math.round(summary.distance).toLocaleString()} mi one way · {summary.count}
			{summary.count === 1 ? 'flight' : 'flights'} total
		</p>
	</div>
{/if}
