<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { KeyInfo } from '$lib/components/security';
	import SEO from '$lib/components/SEO.svelte';
	import { breadcrumbSchema } from '$lib/schema';

	const { data } = $props();
</script>

<SEO
	title="Security"
	description="GPG key verification for twango.dev"
	canonical="/security"
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Security', url: '/security' }
	])}
/>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>Security</Heading>

	<section class="flex flex-col gap-4">
		<Heading level={3}>GPG Public Keys</Heading>
		<KeyInfo keys={data.keys} />
	</section>
</div>
