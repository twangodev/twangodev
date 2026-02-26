<script lang="ts">
	import { Heading, Text } from '$lib/components/ui';
	import SEO from '$lib/components/SEO.svelte';
	import { breadcrumbSchema } from '$lib/schema';
</script>

<SEO
	title="Security"
	description="Security policy for twango.dev"
	canonical="/security"
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Security', url: '/security' }
	])}
/>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>Security</Heading>
	<Text variant="body" size="base">Coming soon.</Text>
</div>
