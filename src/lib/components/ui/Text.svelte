<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Variant = 'body' | 'muted' | 'label';
	type Size = 'xs' | 'sm' | 'base' | 'lg';
	type As = 'p' | 'span' | 'div';

	interface Props {
		variant?: Variant;
		size?: Size;
		as?: As;
		class?: ClassValue;
		children: Snippet;
	}

	const variantStyles: Record<Variant, string> = {
		body: 'font-sans text-text/80 leading-relaxed',
		muted: 'font-mono tracking-wider text-muted',
		label: 'font-mono tracking-wider text-muted'
	};

	const sizeStyles: Record<Size, string> = {
		xs: 'text-xs',
		sm: 'text-sm',
		base: 'text-base',
		lg: 'text-lg'
	};

	let { variant = 'body', size = 'base', as = 'p', class: className, children }: Props = $props();
</script>

<svelte:element this={as} class="{variantStyles[variant]} {sizeStyles[size]} {className}">
	{@render children()}
</svelte:element>
