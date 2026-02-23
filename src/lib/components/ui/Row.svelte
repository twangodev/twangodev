<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
	type Justify = 'start' | 'center' | 'end' | 'between';

	interface Props {
		gap?: Gap;
		align?: Align;
		justify?: Justify;
		class?: ClassValue;
		children: Snippet;
	}

	const gapMap: Record<Gap, string> = {
		none: '',
		xs: 'gap-1',
		sm: 'gap-2',
		md: 'gap-3',
		lg: 'gap-4',
		xl: 'gap-6'
	};

	const alignMap: Record<Align, string> = {
		start: 'items-start',
		center: 'items-center',
		end: 'items-end',
		stretch: 'items-stretch',
		baseline: 'items-baseline'
	};

	const justifyMap: Record<Justify, string> = {
		start: 'justify-start',
		center: 'justify-center',
		end: 'justify-end',
		between: 'justify-between'
	};

	let { gap = 'none', align, justify, class: className, children }: Props = $props();
</script>

<div
	class="flex {gapMap[gap]} {align ? alignMap[align] : ''} {justify ? justifyMap[justify] : ''} {className}"
>
	{@render children()}
</div>
