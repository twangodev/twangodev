<script lang="ts">
	import { onMount } from 'svelte';
	import { T, useTask, useThrelte } from '@threlte/core';
	import { HTML } from '@threlte/extras';
	import { OrthographicCamera, Vector3 } from 'three';
	import { gridGeometry } from './grid-geometry';
	import { routeConnections, viewCamera } from './flow-routing';
	import { spring, type GridView } from './navigation';
	import { formatParameters, floorCoordinates } from './overview';
	import {
		placeLabels,
		projectNode,
		fitNodes,
		screenPoint,
		type LabelNode,
		type PlacedLabel
	} from './label-layout';
	let {
		view,
		dark,
		visible,
		reducedMotion,
		onopen,
		onpreview,
		onready
	}: {
		view: GridView;
		dark: boolean;
		visible: boolean;
		reducedMotion: boolean;
		onopen: (id: string) => void;
		onpreview: (id: string | null) => void;
		onready: () => void;
	} = $props();
	const { canvas, size, invalidate } = useThrelte();
	const geometry = gridGeometry(),
		camera = viewCamera();
	type Node = ReturnType<typeof geometry.tile>;
	// Three.js animation state is deliberately nonreactive; the task publishes labels.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const nodes = new Map<string, Node>();
	let wires: ReturnType<typeof geometry.wire>[] = [];
	let labels = $state<
		{
			key: string;
			id: string;
			title: string;
			short: string;
			parameters?: number;
			rect: PlacedLabel;
			text: string;
		}[]
	>([]);
	let hovered = $state<string | null>(null),
		phase = 0;
	let pending: ReturnType<typeof setTimeout> | undefined,
		candidate: string | null = null;
	const zoom = { value: 10, velocity: 0 },
		panX = { value: 0, velocity: 0 },
		panY = { value: 0, velocity: 0 };
	let activeKey = '';
	let labelsVisible = $state(false);
	let plannedKey = '',
		plannedHeight = 10,
		plannedX = 0,
		plannedY = 0;
	const planningCamera = new OrthographicCamera();
	const textMeasure =
		typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
	function planLabels(width: number, height: number, frameHeight: number, cx: number, cy: number) {
		const small = width < 480,
			fontSize = small ? 10 : 11;
		const family = getComputedStyle(canvas).getPropertyValue('--font-sans') || 'sans-serif';
		if (textMeasure) textMeasure.font = `${fontSize}px ${family}`;
		const measure = (text: string) =>
			textMeasure?.measureText(text).width ?? text.length * fontSize * 0.55;
		const metadata = [...nodes.values()]
			.filter((n) => !n.retiring)
			.map((node) => {
				const parameters = node.data.parameters;
				const words = node.data.topic.short.split(/\s+/),
					lines: string[] = [];
				for (const word of words) {
					const last = lines.at(-1);
					if (last && measure(last + ' ' + word) < (small ? 76 : 100))
						lines[lines.length - 1] = last + ' ' + word;
					else lines.push(word);
				}
				return {
					node,
					key: node.data.key,
					id: node.data.id,
					title: node.data.topic.title,
					short: node.data.topic.short,
					text: lines.join('\n'),
					parameters,
					width: Math.max(
						20,
						Math.ceil(
							Math.max(
								...lines.map(measure),
								parameters === undefined ? 0 : measure(formatParameters(parameters))
							)
						) + 10
					),
					height: Math.max(
						24,
						Math.ceil(lines.length * fontSize * 1.4 + (parameters === undefined ? 0 : 12)) + 6
					),
					above:
						parameters !== undefined &&
						(node.data.id === 'projector' || floorCoordinates(node.target)[1] < -2)
				};
			});
		const targets: LabelNode[] = metadata.map(({ node }) => ({
			key: node.data.key,
			position: node.target,
			scale: node.data.scale ?? 1,
			shape: node.shape
		}));
		planningCamera.copy(camera);
		let result: ReturnType<typeof placeLabels> = { labels: [], missing: [] };
		for (let attempt = 0; attempt < 9; attempt++) {
			plannedHeight = frameHeight * 1.12 ** attempt;
			planningCamera.left = cx - (plannedHeight * width) / height / 2;
			planningCamera.right = cx + (plannedHeight * width) / height / 2;
			planningCamera.top = cy + plannedHeight / 2;
			planningCamera.bottom = cy - plannedHeight / 2;
			planningCamera.updateProjectionMatrix();
			planningCamera.updateMatrixWorld();
			const projected = targets.map((n) => projectNode(n, planningCamera, width, height));
			const flow = wires.map((w) =>
				w.points.map((p) => screenPoint(p, planningCamera, width, height))
			);
			result = placeLabels(metadata, projected, width, height, flow);
			if (!result.missing.length) break;
		}
		labels = result.labels.map((rect) => {
			const meta = metadata.find((m) => m.key === rect.key)!;
			return {
				key: meta.key,
				id: meta.id,
				title: meta.title,
				short: meta.short,
				text: meta.text,
				parameters: meta.parameters,
				rect
			};
		});
	}
	function hover(key: string | null) {
		if (candidate === key) return;
		candidate = key;
		clearTimeout(pending);
		pending = setTimeout(
			() => {
				hovered = key;
				onpreview(key ? (nodes.get(key)?.data.id ?? null) : null);
			},
			key ? 120 : 180
		);
	}
	function open(key: string) {
		const node = nodes.get(key);
		if (!node || node.retiring) return;
		clearTimeout(pending);
		candidate = null;
		hovered = null;
		onpreview(null);
		onopen(node.data.id);
	}
	$effect(() => {
		const next = view;
		const layoutKey = `${next.key}:${next.rowSpacing}:${next.columns}:${$size.width}:${$size.height}`;
		if (activeKey === layoutKey) return;
		activeKey = layoutKey;
		clearTimeout(pending);
		candidate = null;
		hovered = null;
		const parentKey = next.key,
			parent = nodes.get(parentKey);
		const origin: [number, number, number] = parent
			? [parent.x.value, parent.y.value, parent.z.value]
			: [0, 0, 0];
		const data = next.tiles;
		for (const node of nodes.values()) {
			node.retiring = true;
			node.target = origin;
		}
		for (const item of data) {
			let node = nodes.get(item.key);
			if (!node) {
				node = geometry.tile(item, origin);
				nodes.set(item.key, node);
			}
			node.data = item;
			node.target = item.position;
			node.retiring = false;
		}
		wires.forEach((w) => w.dispose());
		wires = routeConnections(
			data,
			next.edges,
			Math.max(1, $size.width),
			Math.max(1, $size.height)
		).map((connection) => geometry.wire(connection));
	});
	$effect(() => {
		geometry.theme(dark);
		for (const wire of wires) wire.material.color.set(dark ? '#c3ccba' : '#56634b');
		invalidate();
	});
	const { start, stop } = useTask(
		(delta) => {
			if (!visible) {
				stop();
				return;
			}
			const dt = Math.min(delta, 0.05);
			phase += dt;
			let moving = false;
			const aspect = Math.max(0.1, size.current.width / Math.max(1, size.current.height));
			camera.updateMatrixWorld();
			const planKey = `${activeKey}:${size.current.width}:${size.current.height}`;
			if (plannedKey !== planKey) {
				const targets = [...nodes.values()]
					.filter((n) => !n.retiring)
					.map((node) => ({
						key: node.data.key,
						position: node.target,
						scale: node.data.scale ?? 1,
						shape: node.shape
					}));
				const frame = fitNodes(
					targets,
					camera,
					size.current.width,
					size.current.height,
					view.path.length ? 54 : 100,
					!view.path.length,
					wires.flatMap((w) => w.points)
				);
				plannedX = frame.x;
				plannedY = frame.y;
				planLabels(size.current.width, size.current.height, frame.height, plannedX, plannedY);
				plannedKey = planKey;
			}
			const height = plannedHeight,
				cx = plannedX,
				cy = plannedY;
			moving = spring(zoom, height, dt, reducedMotion) || moving;
			moving = spring(panX, cx, dt, reducedMotion) || moving;
			moving = spring(panY, cy, dt, reducedMotion) || moving;
			camera.left = panX.value - (zoom.value * aspect) / 2;
			camera.right = panX.value + (zoom.value * aspect) / 2;
			camera.top = panY.value + zoom.value / 2;
			camera.bottom = panY.value - zoom.value / 2;
			camera.near = 0.1;
			camera.far = 80;
			camera.updateProjectionMatrix();
			camera.updateMatrixWorld();
			let relocating =
				Math.abs(zoom.value - height) > 0.01 ||
				Math.abs(panX.value - cx) > 0.01 ||
				Math.abs(panY.value - cy) > 0.01;
			for (const [key, node] of nodes) {
				const focused = hovered === key;
				moving = spring(node.x, node.target[0], dt, reducedMotion) || moving;
				moving = spring(node.y, node.target[1] + (focused ? 0.12 : 0), dt, reducedMotion) || moving;
				moving = spring(node.z, node.target[2], dt, reducedMotion) || moving;
				moving =
					spring(node.scale, node.retiring ? 0 : (node.data.scale ?? 1), dt, reducedMotion) ||
					moving;
				moving = spring(node.spread, focused ? 1 : 0, dt, reducedMotion) || moving;
				node.group.position.set(node.x.value, node.y.value, node.z.value);
				node.group.scale.setScalar(node.scale.value);
				const spread =
					node.spread.value /
					(node.data.parameters !== undefined ? Math.max(1, node.data.scale ?? 1) : 1);
				node.parts.forEach(({ mesh, part, rest, travel }) => {
					mesh.position.copy(rest).addScaledVector(travel, spread);
					mesh.material = geometry.paint(
						node.spread.value > 0.1 ? (part.expandedStatus ?? part.status) : part.status
					);
				});
				node.engravings.forEach(({ owner, coarse, fine }) => {
					const status =
						node.spread.value > 0.1
							? (owner.part.expandedStatus ?? owner.part.status)
							: owner.part.status;
					coarse.material = geometry.ink(status);
					if (fine) {
						fine.material = coarse.material;
						const pixels =
							((((owner.part.size[0] + owner.part.size[2]) / Math.SQRT2) * node.scale.value) /
								zoom.value) *
							size.current.height;
						fine.visible = pixels >= 44;
					}
				});
				node.detail.position.y = spread * node.shape.lineLift;
				if (node.retiring && node.scale.value === 0) {
					geometry.retire(node);
					nodes.delete(key);
					continue;
				}
				const targetScale = node.data.scale ?? 1;
				relocating ||=
					node.retiring ||
					Math.abs(node.x.value - node.target[0]) > 0.01 ||
					Math.abs(node.z.value - node.target[2]) > 0.01 ||
					Math.abs(node.scale.value - targetScale) > 0.01;
			}
			labelsVisible = !relocating;
			const hasPin = view.path.length > 0;
			for (const wire of wires) {
				const active = hovered ? wire.a === hovered || wire.b === hovered : hasPin;
				wire.material.color.set(dark ? '#c3ccba' : '#56634b');
				const unitsPerPixel = zoom.value / Math.max(1, size.current.height);
				wire.material.dashScale = 1 / unitsPerPixel;
				wire.material.linewidth = active ? 1.6 : 1.2;
				wire.material.opacity = active ? 0.95 : dark ? 0.62 : 0.72;
				wire.arrow.scale.setScalar(Math.min(unitsPerPixel * 7, wire.arrowLimit));
				wire.arrowMaterial.color.copy(wire.material.color);
				wire.arrowMaterial.opacity = active ? 1 : 0.85;
				wire.marker.scale.setScalar(unitsPerPixel * 1.8);
				wire.marker.visible = !!active && !reducedMotion;
				if (wire.marker.visible) {
					let distance = ((phase * 0.38) % 1) * wire.length;
					let segment = 0;
					while (segment < wire.lengths.length - 1 && distance > wire.lengths[segment]) {
						distance -= wire.lengths[segment++];
					}
					wire.marker.position
						.copy(wire.points[segment])
						.lerp(wire.points[segment + 1], distance / Math.max(0.0001, wire.lengths[segment]));
				}
			}
			invalidate();
			if (!moving && !((hovered || hasPin) && !reducedMotion && wires.length)) stop();
		},
		{ autoStart: false, autoInvalidate: false }
	);
	$effect(() => {
		void view;
		void hovered;
		void dark;
		void $size;
		void reducedMotion;
		if (visible) start();
		else stop();
	});
	onMount(() => {
		canvas.setAttribute('aria-hidden', 'true');
		canvas.style.touchAction = 'pan-y';
		let destroyed = false;
		void document.fonts.ready.then(() => {
			if (!destroyed) {
				plannedKey = '';
				start();
			}
		});
		const project = (x: number, y: number, z: number) => new Vector3(x, y, z).project(camera);
		function hit(e: PointerEvent) {
			const rect = canvas.getBoundingClientRect(),
				x = ((e.clientX - rect.left) / rect.width) * 2 - 1,
				y = 1 - ((e.clientY - rect.top) / rect.height) * 2;
			let best: string | null = null,
				distance = Infinity;
			for (const [key, node] of nodes) {
				if (node.retiring) continue;
				const [a, , b] = node.target,
					scale = node.data.scale ?? 1,
					center = project(a, node.shape.bounds.height * 0.5 * scale, b),
					edge = project(
						a + node.shape.bounds.width * 0.6 * scale,
						node.shape.bounds.height * 0.5 * scale,
						b + node.shape.bounds.depth * 0.6 * scale
					),
					side = project(
						a + node.shape.bounds.width * 0.6 * scale,
						node.shape.bounds.height * 0.5 * scale,
						b - node.shape.bounds.depth * 0.6 * scale
					);
				const width = Math.max(Math.abs(side.x - center.x), 0.035),
					height = Math.max(Math.abs(edge.y - center.y), 0.035);
				const dx = Math.abs(x - center.x),
					dy = Math.abs(y - center.y);
				if (dx < width && dy < height * 1.4) {
					const d = dx * dx + dy * dy;
					if (d < distance) {
						distance = d;
						best = key;
					}
				}
			}
			// Preserve the current target while the pointer crosses its exploded pieces.
			if (!best && hovered) {
				const node = nodes.get(hovered);
				if (node && !node.retiring) {
					const base = project(node.target[0], 0, node.target[2]),
						top = project(
							node.target[0],
							node.shape.bounds.height * (node.data.scale ?? 1) + 1.1,
							node.target[2]
						);
					if (Math.abs(x - base.x) < 0.11 && y > base.y - 0.06 && y < top.y + 0.08) best = hovered;
				}
			}
			return best;
		}
		let downX = 0,
			downY = 0;
		const move = (e: PointerEvent) => {
			if (e.pointerType !== 'touch' && !e.buttons) {
				const key = hit(e);
				hover(key);
				canvas.style.cursor = key ? 'pointer' : 'default';
			}
		};
		const leave = () => hover(null);
		const down = (e: PointerEvent) => {
			downX = e.clientX;
			downY = e.clientY;
		};
		const up = (e: PointerEvent) => {
			if (Math.hypot(e.clientX - downX, e.clientY - downY) < 8) {
				const key = hit(e);
				if (key) open(key);
			}
		};
		canvas.addEventListener('pointermove', move);
		canvas.addEventListener('pointerleave', leave);
		canvas.addEventListener('pointerdown', down);
		canvas.addEventListener('pointerup', up);
		onready();
		return () => {
			destroyed = true;
			clearTimeout(pending);
			canvas.removeEventListener('pointermove', move);
			canvas.removeEventListener('pointerleave', leave);
			canvas.removeEventListener('pointerdown', down);
			canvas.removeEventListener('pointerup', up);
			wires.forEach((w) => w.dispose());
			geometry.dispose();
		};
	});
</script>

<T is={camera} makeDefault manual />
<T.AmbientLight intensity={1.4} />
<T.DirectionalLight position={[5, 10, 8]} intensity={1.8} />
<T is={geometry.root} dispose={false} />
<HTML
	fullscreen
	calculatePosition={(_, __, viewport) => [viewport.width / 2, viewport.height / 2]}
	wrapperClass="ming-label-overlay"
	pointerEvents="none"
	zIndexRange={[10, 10]}
>
	<div class="label-layer" class:transitioning={!labelsVisible}>
		{#each labels as label (label.key)}
			<button
				type="button"
				class="tile-label"
				class:active={hovered === label.key}
				style:left={`${label.rect.x}px`}
				style:top={`${label.rect.y}px`}
				style:width={`${label.rect.width}px`}
				style:height={`${label.rect.height}px`}
				style:font-size={`${$size.width < 480 ? 10 : 11}px`}
				data-node={label.id}
				aria-label={`Inspect ${label.title}${label.parameters !== undefined ? `, ${formatParameters(label.parameters)} parameters` : ''}`}
				onpointerenter={() => hover(label.key)}
				onpointerleave={() => hover(null)}
				onfocus={() => hover(label.key)}
				onblur={() => hover(null)}
				onclick={() => open(label.key)}
			>
				<span class="label-text">{label.text}</span>
				{#if label.parameters !== undefined}<span class="parameter-count"
						>{formatParameters(label.parameters)}</span
					>{/if}
			</button>
		{/each}
	</div>
</HTML>

<style>
	:global(.ming-label-overlay),
	.label-layer {
		pointer-events: none;
	}
	.label-layer {
		position: absolute;
		inset: 0;
	}
	.transitioning {
		visibility: hidden;
	}
	.label-text {
		white-space: pre;
		display: block;
	}

	.tile-label {
		position: absolute;
		box-sizing: border-box;
		pointer-events: auto;
		cursor: pointer;
		border: 0;
		border-radius: 3px;
		padding: 3px 5px;
		color: var(--color-text);
		background: transparent;
		font: 11px/1.4 var(--font-sans);
		text-align: center;
	}
	.parameter-count {
		display: block;
		font-size: 10px;
		line-height: 12px;
		font-variant-numeric: tabular-nums;
	}
	.tile-label.active,
	.tile-label:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.tile-label:focus-visible {
		outline: 2px solid var(--color-text);
		outline-offset: 3px;
	}
</style>
