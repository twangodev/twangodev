<script lang="ts">
	interface Props {
		phrases: string[];
		class?: string;
	}

	let { phrases, class: className = '' }: Props = $props();

	const phrase = $derived(phrases[Math.floor(Math.random() * phrases.length)]);
</script>

<span
	class="pointer-events-none font-hand opacity-0 transition-opacity duration-300 select-none group-hover:opacity-100 {className}"
>
	{phrase}
</span>
