<script lang="ts">
	interface Props {
		tag: string;
		active?: boolean;
	}

	let { tag, active = false }: Props = $props();
</script>

<a
	href="/writing/tags/{tag}"
	class="inline-block rounded-full border px-2.5 py-0.5 font-mono text-xs tracking-wide transition-colors {active
		? 'border-accent bg-accent/10 text-accent'
		: 'border-subtle text-muted hover:border-accent hover:text-accent'}"
>
	{tag}
</a>
