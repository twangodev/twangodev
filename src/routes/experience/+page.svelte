<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { ExperienceTimeline } from '$lib/components/experience';

	const { data } = $props();
</script>

<svelte:head>
	<title>Experience</title>
	<meta name="description" content="Work experience timeline" />
</svelte:head>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>Experience</Heading>
	<p class="font-mono text-xs tracking-wide text-muted">$ git log --graph --oneline --all</p>
	<ExperienceTimeline experiences={data.experiences} />
</div>
