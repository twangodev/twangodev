<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { GitGraph } from '$lib/components/timeline';

	const { data } = $props();
</script>

<svelte:head>
	<title>Experience</title>
	<meta name="description" content="Work experience timeline" />
</svelte:head>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>Experience</Heading>
	<p class="font-mono text-xs tracking-wide text-muted">$ git log --graph --all --decorate</p>
	<GitGraph entries={data.entries} />
</div>
