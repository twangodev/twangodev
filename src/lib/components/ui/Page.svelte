<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Width = 'sm' | 'md' | 'lg' | 'xl' | 'full';

	interface Props {
		width?: Width;
		center?: boolean;
		class?: ClassValue;
		children: Snippet;
	}

	const widthMap: Record<Width, string> = {
		sm: 'max-w-sm',
		md: 'max-w-xl',
		lg: 'max-w-3xl',
		xl: 'max-w-5xl',
		full: 'max-w-full'
	};

	let { width = 'md', center = true, class: className, children }: Props = $props();
</script>

<main class="flex flex-1 flex-col {center ? 'justify-center' : ''} pb-24 {className}">
	<div class={widthMap[width]}>
		{@render children()}
	</div>
</main>
