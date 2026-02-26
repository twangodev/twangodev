<script lang="ts">
	import NowPlaying from '$lib/components/NowPlaying.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { personSchema, breadcrumbSchema } from '$lib/schema';
</script>

<SEO canonical="/" jsonLd={[personSchema(), breadcrumbSchema([{ name: 'Home', url: '/' }])]} />

<NowPlaying />
