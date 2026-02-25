<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { page } from '$app/state';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Bio from '$lib/components/Bio.svelte';
	import BioToggle from '$lib/components/BioToggle.svelte';
	import { Divider } from '$lib/components/ui';

	let { children } = $props();

	let userOverride = $state<boolean | null>(null);

	const pageWantsExpanded = $derived(page.data.bioExpanded ?? page.url.pathname === '/');
	const collapsed = $derived(userOverride !== null ? userOverride : !pageWantsExpanded);

	afterNavigate(() => {
		userOverride = null;
	});

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	function toggle() {
		userOverride = !collapsed;
	}

	const isRoot = $derived(page.url.pathname === '/');
	const gridColumns = $derived(isRoot ? '1fr 2fr' : collapsed ? '0fr 0fr 1fr' : '1fr 3.5rem 2fr');
</script>

<ModeWatcher defaultMode="dark" />
<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="alternate" type="application/rss+xml" title="twango.dev" href="/rss.xml" />
</svelte:head>

<div
	class="flex min-h-svh flex-col gap-10 bg-bg px-6 py-6 text-text antialiased sm:px-10 md:gap-12 md:px-16"
>
	<Header />
	<div
		class="bio-layout flex flex-1 flex-col gap-8 md:grid md:items-stretch md:gap-12"
		style:grid-template-columns={gridColumns}
	>
		<aside class="flex flex-col justify-center overflow-hidden">
			<div class="md:min-w-80">
				<Bio
					compact={collapsed}
					heading={page.data.bioHeading}
					description={page.data.bioDescription}
					details={page.data.bioDetails}
				/>
			</div>
		</aside>
		{#if !isRoot}
			<div
				class="hidden items-center justify-center overflow-hidden transition-opacity duration-300 select-none md:flex"
				class:opacity-0={collapsed}
			>
				<button
					onclick={toggle}
					aria-label="Collapse bio"
					class="cursor-pointer font-mono text-6xl text-subtle transition-colors hover:text-accent"
					tabindex={collapsed ? -1 : 0}
				>
					/
				</button>
			</div>
		{/if}
		<Divider width="full" spacing="md" class="md:hidden" />
		<main class="flex flex-1 flex-col justify-center">
			{@render children()}
		</main>
	</div>
	{#if !isRoot && !page.error}
		<BioToggle {collapsed} ontoggle={toggle} />
	{/if}
	<Footer />
</div>
