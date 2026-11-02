import type { Tile } from './navigation';
import type { Topic } from './knowledge';
import { floorPoint, floorRadius } from './overview';

/** Columns are processing stages; operations in the same stage run in parallel. */
export function arrangeStages(
	tiles: Tile[],
	edges: Topic['edges'],
	stages: string[][],
	width: number,
	rowSpacing: number
) {
	const maxColumns = width < 480 ? 2 : 5;
	const rank = new Map(
		tiles.map((t) => [
			t.id,
			Math.max(
				0,
				stages.findIndex((row) => row.includes(t.id))
			)
		])
	);
	const forward = edges.filter(([a, b, kind]) => kind !== 'feedback' && rank.has(a) && rank.has(b));
	if (!forward.length) {
		const columns = Math.min(tiles.length, width < 480 ? 2 : 4),
			rows = Math.ceil(tiles.length / columns);
		tiles.forEach((t, i) => {
			t.position = floorPoint(
				((i % columns) - (columns - 1) / 2) * 3.5,
				(Math.floor(i / columns) - (rows - 1) / 2) * rowSpacing
			);
		});
		return { columns, rows };
	}
	// Topological order also corrects dependencies inside an upstream presentation row.
	const pending = new Set(tiles.map((t) => t.id));
	while (pending.size) {
		const ready = [...pending].filter(
			(id) => !forward.some(([a, b]) => b === id && pending.has(a))
		);
		if (!ready.length) throw new Error('Unmarked cycle in model data flow');
		for (const id of ready) {
			for (const [a, b] of forward)
				if (b === id) rank.set(id, Math.max(rank.get(id)!, rank.get(a)! + 1));
			pending.delete(id);
		}
	}
	const count = Math.max(...rank.values()) + 1,
		columns = Math.min(count, maxColumns);
	const groups = Array.from({ length: count }, (_, i) => tiles.filter((t) => rank.get(t.id) === i));
	const columnSpacing =
		width < 480
			? 3.7
			: Math.max(3.7, Math.min(5.4, Math.max(...groups.map((g) => g.length)) * 1.8));
	// Keep branches in the supplied semantic order; align single stages to the centre.
	let base = 0,
		totalRows = 0;
	for (let first = 0; first < count; first += columns) {
		const band = groups.slice(first, first + columns),
			rows = Math.max(...band.map((g) => g.length));
		band.forEach((group, col) =>
			group.forEach((tile, i) => {
				tile.position = floorPoint(
					(col - (columns - 1) / 2) * columnSpacing,
					base + ((rows - 1) / 2 + i - (group.length - 1) / 2) * rowSpacing
				);
			})
		);
		base += rows * rowSpacing + 1;
		totalRows += rows;
	}
	const vs = tiles.map((t) => (t.position[0] + t.position[2]) / Math.SQRT2),
		center = (Math.min(...vs) + Math.max(...vs)) / 2;
	for (const t of tiles) {
		t.position[0] -= center / Math.SQRT2;
		t.position[2] -= center / Math.SQRT2;
	}
	return { columns, rows: totalRows };
}

/** A horizontal overview keeps the same parameter-proportional shapes. */
export function arrangeHorizontalOverview(tiles: Tile[]) {
	const find = (id: string) => tiles.find((t) => t.id === id)!;
	const stages = [
		['audio'],
		['projector', 'text'],
		['decoder', 'mtp'],
		['final-norm'],
		['text-output'],
		['talker-system'],
		['vae']
	];
	const widths = stages.map((ids) => Math.max(...ids.map((id) => floorRadius(find(id)) * 2), 1.2));
	const centers = [0];
	for (let i = 1; i < stages.length; i++)
		centers.push(centers[i - 1] + (widths[i - 1] + widths[i]) / 2 + 1.05);
	const center = (centers.at(-1)! + widths.at(-1)! / 2 - widths[0] / 2) / 2;
	stages.forEach((ids, i) =>
		ids.forEach((id, j) => {
			const t = find(id),
				v = j === 0 ? 0 : floorRadius(find(ids[0])) + floorRadius(t) + 1.8;
			t.position = floorPoint(centers[i] - center, v);
		})
	);
}
