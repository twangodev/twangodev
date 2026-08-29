<script lang="ts">
	import type { Cell } from '$lib/writing/agent-table';

	interface Props {
		headers: string[];
		rows: Cell[][];
		caption?: string;
	}

	let { headers, rows, caption }: Props = $props();
</script>

<!-- Clip a normal table from a non-table wrapper so its intrinsic layout cannot create page overflow. -->
<div class="sr-only">
	<table>
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
</div>
