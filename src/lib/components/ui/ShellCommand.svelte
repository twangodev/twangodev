<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		command: string;
		children?: Snippet;
	}

	let { command }: Props = $props();
</script>

<p class="font-mono text-xs tracking-wide text-muted">$ {command}</p>
