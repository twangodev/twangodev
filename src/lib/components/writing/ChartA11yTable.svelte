<script lang="ts">
	import type { Cell } from '$lib/writing/agent-table';

	interface Props {
		headers: string[];
		rows: Cell[][];
		caption?: string;
	}

	let { headers, rows, caption }: Props = $props();
</script>

<!-- Visually-hidden data table for the adjacent aria-hidden chart. The figure's
	visible <figcaption> serves as the caption, so one here is optional. -->
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
