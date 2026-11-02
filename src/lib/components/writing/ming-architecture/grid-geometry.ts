import {
	BoxGeometry,
	CylinderGeometry,
	Float32BufferAttribute,
	BufferGeometry,
	EdgesGeometry,
	Group,
	LineDashedMaterial,
	DoubleSide,
	Matrix4,
	MeshBasicMaterial,
	InstancedBufferAttribute,
	LineSegments,
	Mesh,
	MeshStandardMaterial,
	CircleGeometry,
	Vector3
} from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { Status } from './knowledge';
import { createShape } from './shapes';
import type { Tile, Spring } from './navigation';
import { viewCamera, type FlowRoute } from './flow-routing';
export function gridGeometry() {
	const root = new Group(),
		box = new BoxGeometry(1, 1, 1),
		outline = new EdgesGeometry(box),
		flowDot = new CircleGeometry(1, 32),
		disc = new CylinderGeometry(0.5, 0.5, 1, 64);
	const wedge = new BufferGeometry();
	wedge.setAttribute(
		'position',
		new Float32BufferAttribute(
			[
				-0.3, -0.5, -0.5, 0.3, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.3, 0.5, -0.5, 0.3,
				0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5
			],
			3
		)
	);
	wedge.setIndex([
		0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6, 2, 7, 3, 2, 6, 7, 3, 4,
		0, 3, 7, 4
	]);
	const taper = wedge.toNonIndexed();
	taper.computeVertexNormals();
	wedge.dispose();
	const taperOutline = new EdgesGeometry(taper),
		discOutline = new EdgesGeometry(disc, 30);
	const owned = new Set<BufferGeometry>();
	const materials = {
		source: new MeshStandardMaterial({ roughness: 0.85 }),
		ink: new LineMaterial({ transparent: true, opacity: 0.85, linewidth: 0.9, depthWrite: false }),
		etch: new LineMaterial({ depthWrite: false, transparent: true, linewidth: 1 }),
		etchColor: new LineMaterial({
			color: '#15321c',
			depthWrite: false,
			transparent: true,
			linewidth: 1
		}),
		nvfp4: new MeshStandardMaterial({ color: '#57ce70', roughness: 0.8 }),
		bf16: new MeshStandardMaterial({ color: '#e9ba45', roughness: 0.8 }),
		edge: new LineDashedMaterial({ transparent: true, opacity: 0.3, dashSize: 2, gapSize: 0 }),
		dot: new MeshBasicMaterial({ color: '#eeeece', transparent: true, depthWrite: false })
	};
	const paint = (status: Status) =>
		status === 'nvfp4' ? materials.nvfp4 : status === 'bf16' ? materials.bf16 : materials.source;
	function tile(data: Tile, origin: [number, number, number]) {
		const group = new Group(),
			detail = new Group();
		root.add(group);
		group.add(detail);
		const shape = data.shape ?? createShape(data.topic, data.children);
		const parts = shape.parts.map((part) => {
			const geo = part.kind === 'disc' ? disc : part.kind === 'wedge' ? taper : box;
			const edges =
				part.kind === 'disc' ? discOutline : part.kind === 'wedge' ? taperOutline : outline;
			const mesh = new Mesh(geo, paint(part.status));
			mesh.scale.set(...part.size);
			mesh.rotation.y = part.rotation;
			mesh.position.set(...part.position);
			mesh.add(new LineSegments(edges, materials.edge));
			group.add(mesh);
			return {
				mesh,
				part,
				rest: new Vector3(...part.position),
				travel: new Vector3(...part.travel)
			};
		});
		const decorations: BufferGeometry[] = [];
		function drawing(paths: [number, number, number][][], material: LineMaterial) {
			// Batch disconnected strokes to avoid one draw call for every tiny mark.
			const segments = paths.flatMap((path) =>
				path.slice(1).flatMap((point, i) => [new Vector3(...path[i]), new Vector3(...point)])
			);
			const geo = new LineSegmentsGeometry().setPositions(segments.flatMap((p) => p.toArray()));
			owned.add(geo);
			decorations.push(geo);
			return new LineSegments2(geo, material);
		}
		if (shape.lines.length) detail.add(drawing(shape.lines, materials.ink));
		const engravings = shape.details.map((icon) => {
			const owner = parts[icon.part];
			const coarse = drawing(icon.strokes, materials.etch);
			const fine = icon.fine.length ? drawing(icon.fine, materials.etch) : null;
			owner.mesh.add(coarse);
			if (fine) owner.mesh.add(fine);
			return { owner, coarse, fine };
		});
		const state = (value: number): Spring => ({ value, velocity: 0 });
		return {
			data,
			group,
			parts,
			detail,
			shape,
			decorations,
			engravings,
			x: state(origin[0]),
			y: state(origin[1]),
			z: state(origin[2]),
			scale: state(0.1),
			spread: state(0),
			target: [...data.position] as [number, number, number],
			retiring: false
		};
	}
	const arrowhead = new BufferGeometry().setFromPoints([
		new Vector3(0, 0, 0),
		new Vector3(-0.42, -1, 0),
		new Vector3(0.42, -1, 0)
	]);
	// Arrowheads face the fixed camera so direction stays legible at every size.
	const cameraRotation = viewCamera().quaternion,
		facing = new Vector3(0, 0, 1).applyQuaternion(cameraRotation);
	function wire(route: FlowRoute) {
		const points = route.points.map((point) => new Vector3(...point));
		const lengths = points.slice(1).map((point, i) => point.distanceTo(points[i]));
		const length = lengths.reduce((sum, n) => sum + n, 0);
		const geometry = new LineSegmentsGeometry().setPositions(
			route.strokes.flatMap((s) => [...s.a, ...s.b])
		);
		geometry.setAttribute(
			'instanceDistanceStart',
			new InstancedBufferAttribute(new Float32Array(route.strokes.map((s) => s.start)), 1)
		);
		geometry.setAttribute(
			'instanceDistanceEnd',
			new InstancedBufferAttribute(new Float32Array(route.strokes.map((s) => s.end)), 1)
		);
		const material = new LineMaterial({
			transparent: true,
			depthWrite: false,
			opacity: 0.5,
			worldUnits: false,
			linewidth: 1.2,
			dashed: true,
			dashSize: 1.6,
			gapSize: 4.4
		});
		const line = new LineSegments2(geometry, material);
		root.add(line);
		const tip = points.at(-1)!;
		const direction = tip
			.clone()
			.sub(points[points.length - 2])
			.projectOnPlane(facing)
			.normalize();
		const side = direction.clone().cross(facing).normalize();
		const arrowMaterial = new MeshBasicMaterial({
			transparent: true,
			depthWrite: false,
			side: DoubleSide
		});
		const arrow = new Mesh(arrowhead, arrowMaterial);
		arrow.position.copy(tip);
		arrow.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(side, direction, facing));
		root.add(arrow);
		const marker = new Mesh(flowDot, materials.dot);
		marker.quaternion.copy(cameraRotation);
		root.add(marker);
		marker.visible = false;
		return {
			a: route.a,
			b: route.b,
			line,
			marker,
			points,
			lengths,
			length,
			material,
			arrowMaterial,
			arrow,
			arrowLimit: Math.min(
				(route.endClearance * 0.75) / 0.84,
				points.at(-1)!.distanceTo(points.at(-2)!) * 0.85
			),
			dispose() {
				geometry.dispose();
				material.dispose();
				arrowMaterial.dispose();
				root.remove(line, marker, arrow);
			}
		};
	}
	return {
		root,
		paint,
		ink(status: Status) {
			return status === 'nvfp4' || status === 'bf16' ? materials.etchColor : materials.etch;
		},
		tile,
		retire(node: ReturnType<typeof tile>) {
			root.remove(node.group);
			node.decorations.forEach((geo) => {
				geo.dispose();
				owned.delete(geo);
			});
		},
		wire,
		theme(dark: boolean) {
			materials.source.color.set(dark ? '#687060' : '#bdc6b3');
			materials.ink.color.set(dark ? '#d3d8c8' : '#4c5644');
			materials.etch.color.set(dark ? '#eef1e7' : '#2f3a2b');
			materials.edge.color.set(dark ? '#d3d8c8' : '#4c5644');
			materials.dot.color.set(dark ? '#e7eadb' : '#343e2d');
		},
		dispose() {
			box.dispose();
			disc.dispose();
			discOutline.dispose();
			taper.dispose();
			taperOutline.dispose();
			owned.forEach((geo) => geo.dispose());
			owned.clear();
			outline.dispose();
			flowDot.dispose();
			arrowhead.dispose();
			Object.values(materials).forEach((m) => m.dispose());
		}
	};
}
