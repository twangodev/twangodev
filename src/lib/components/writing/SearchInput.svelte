<script lang="ts">
	import { Search } from '@lucide/svelte';

	interface Props {
		value: string;
		oninput: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let { value, oninput }: Props = $props();
</script>

<div class="relative">
	<Search
		size={14}
		class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
	/>
	<input
		type="text"
		placeholder="Search posts..."
		{value}
		{oninput}
		class="w-full rounded-lg border border-subtle bg-surface py-2 pr-3 pl-9 font-mono text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
	/>
</div>
