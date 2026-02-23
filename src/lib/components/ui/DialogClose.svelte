<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: ClassValue;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<Dialog.Close
	class="cursor-pointer text-sm text-muted transition-colors hover:text-text {className}"
>
	{@render children()}
</Dialog.Close>
