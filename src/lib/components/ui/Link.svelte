<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { ExternalLink } from '@lucide/svelte';

	interface Props {
		href: string;
		external?: boolean;
		icon?: boolean;
		underline?: boolean;
		class?: ClassValue;
		children: Snippet;
	}

	let { href, external, icon, underline = false, class: className, children }: Props = $props();

	const isExternal = $derived(external ?? /^(https?:\/\/|mailto:)/.test(href));
	const showIcon = $derived(icon ?? isExternal);

	const baseStyles = 'transition-colors hover:text-accent';
	const underlineStyles = 'underline decoration-subtle underline-offset-2';
</script>

{#if isExternal}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		class="{baseStyles} {underline ? underlineStyles : ''} {showIcon ? 'group/link inline-flex items-center gap-1' : ''} {className}"
	>
		{@render children()}
		{#if showIcon}
			<span class="inline-flex w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/link:w-3 group-hover/link:opacity-100">
				<ExternalLink size={12} strokeWidth={1.5} class="shrink-0" />
			</span>
		{/if}
	</a>
{:else}
	<a
		{href}
		class="{baseStyles} {underline ? underlineStyles : ''} {className}"
	>
		{@render children()}
	</a>
{/if}
