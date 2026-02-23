<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { SearchInput, TagPill, PostList } from '$lib/components/writing';

	const { data } = $props();

	let search = $state('');
	let activeTag = $state<string | null>(null);

	const filtered = $derived(
		data.posts.filter((post) => {
			const matchesSearch =
				!search ||
				post.title.toLowerCase().includes(search.toLowerCase()) ||
				post.description.toLowerCase().includes(search.toLowerCase()) ||
				post.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

			const matchesTag = !activeTag || post.tags.includes(activeTag);

			return matchesSearch && matchesTag;
		})
	);

	function toggleTag(tag: string) {
		activeTag = activeTag === tag ? null : tag;
	}
</script>

<svelte:head>
	<title>Writing</title>
	<meta name="description" content="Blog posts and writing" />
</svelte:head>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>Writing</Heading>

	<SearchInput value={search} oninput={(e) => (search = e.currentTarget.value)} />

	{#if data.tags.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each data.tags as { name } (name)}
				<button onclick={() => toggleTag(name)}>
					<TagPill tag={name} active={activeTag === name} />
				</button>
			{/each}
		</div>
	{/if}

	<PostList posts={filtered} />
</div>
