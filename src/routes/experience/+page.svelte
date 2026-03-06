<script lang="ts">
	import { Heading, ShellCommand } from '$lib/components/ui';
	import { GitGraph } from '$lib/components/timeline';
	import SEO from '$lib/components/SEO.svelte';
	import { breadcrumbSchema } from '$lib/schema';

	const { data } = $props();
</script>

<SEO
	title="Experience"
	description="Work experience and project timeline for James Ding"
	canonical="/experience"
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Experience', url: '/experience' }
	])}
/>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>Experience</Heading>
	<ShellCommand command="git log --graph --all --decorate" />
	<GitGraph entries={data.entries} />
</div>
