<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	type Width = 'sm' | 'md' | 'lg' | 'full';
	type Spacing = 'sm' | 'md' | 'lg';

	interface Props {
		width?: Width;
		spacing?: Spacing;
		class?: ClassValue;
	}

	const widthMap: Record<Width, string> = {
		sm: 'w-24',
		md: 'w-48',
		lg: 'w-72',
		full: 'w-full'
	};

	const spacingMap: Record<Spacing, string> = {
		sm: 'my-4',
		md: 'my-8',
		lg: 'my-12'
	};

	let { width = 'md', spacing = 'md', class: className }: Props = $props();
</script>

<div
	class="{widthMap[width]} {spacingMap[spacing]} h-px bg-subtle {className}"
	role="separator"
></div>
