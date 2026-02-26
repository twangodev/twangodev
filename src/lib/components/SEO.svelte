<script lang="ts">
	import type { WithContext, Thing } from 'schema-dts';
	import { site } from '$lib/config';

	interface Props {
		title?: string;
		description?: string;
		canonical?: string;
		type?: 'website' | 'article';
		image?: string;
		article?: {
			publishedTime?: string;
			modifiedTime?: string;
			tags?: string[];
			section?: string;
		};
		noindex?: boolean;
		jsonLd?: WithContext<Thing> | WithContext<Thing>[];
	}

	const {
		title,
		description = site.description,
		canonical,
		type = 'website',
		image,
		article,
		noindex = false,
		jsonLd
	}: Props = $props();

	const fullTitle = $derived(title ? `${title} | ${site.name}` : site.name);
	const canonicalUrl = $derived(canonical ? `${site.url}${canonical}` : undefined);

	const jsonLdScripts = $derived(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
	{#if canonicalUrl}
		<link rel="canonical" href={canonicalUrl} />
	{/if}

	<!-- Open Graph -->
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={site.name} />
	<meta property="og:locale" content={site.locale} />
	{#if canonicalUrl}
		<meta property="og:url" content={canonicalUrl} />
	{/if}
	{#if image}
		<meta property="og:image" content={image} />
	{/if}

	<!-- Article metadata -->
	{#if article}
		{#if article.publishedTime}
			<meta property="article:published_time" content={article.publishedTime} />
		{/if}
		{#if article.modifiedTime}
			<meta property="article:modified_time" content={article.modifiedTime} />
		{/if}
		{#if article.section}
			<meta property="article:section" content={article.section} />
		{/if}
		{#if article.tags}
			{#each article.tags as tag}
				<meta property="article:tag" content={tag} />
			{/each}
		{/if}
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:creator" content="@twangodev" />
	{#if image}
		<meta name="twitter:image" content={image} />
	{/if}

	<!-- JSON-LD -->
	{#each jsonLdScripts as schema}
		{@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
	{/each}
</svelte:head>
