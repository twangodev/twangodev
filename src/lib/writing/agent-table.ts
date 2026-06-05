export type Cell = string | number;

export function markdownTable(headers: string[], rows: Cell[][]): string {
	const escape = (c: Cell) => String(c).replace(/\|/g, '\\|');
	const line = (cells: Cell[]) => `| ${cells.map(escape).join(' | ')} |`;
	const divider = `| ${headers.map(() => '---').join(' | ')} |`;
	return [line(headers), divider, ...rows.map(line)].join('\n');
}
