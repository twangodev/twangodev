<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';

	interface Props {
		collapsed: boolean;
		ontoggle: () => void;
	}

	let { collapsed, ontoggle }: Props = $props();
</script>

{#if collapsed}
	<button
		onclick={ontoggle}
		aria-label="Expand bio"
		class="fixed top-1/2 left-0 z-10 hidden h-12 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-full bg-surface text-muted transition-colors hover:text-text md:flex"
	>
		<ChevronRight size={16} />
	</button>
{/if}
