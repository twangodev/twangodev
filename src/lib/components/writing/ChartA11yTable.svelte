<script lang="ts">
	import type { Cell } from '$lib/writing/agent-table';

	interface Props {
		headers: string[];
		rows: Cell[][];
		caption?: string;
	}

	let { headers, rows, caption }: Props = $props();
</script>

<!--
	Visually-hidden semantic fallback for the adjacent (aria-hidden) chart. Gives
	screen readers — and agents reading the rendered HTML — the underlying data
	the visual conveys. Built from the same module-scope data as the chart's
	`agentText`, so there is a single source of truth. Inside a <figure>, the
	visible <figcaption> serves as the caption, so one is optional here.
-->
<table class="sr-only">
	{#if caption}
		<caption>{caption}</caption>
	{/if}
	<thead>
		<tr>
			{#each headers as header (header)}
				<th scope="col">{header}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each rows as row, i (i)}
			<tr>
				{#each row as cell, j (j)}
					<td>{cell}</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
