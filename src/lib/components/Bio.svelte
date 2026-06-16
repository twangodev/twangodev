<script lang="ts">
	import {
		Heading,
		Text,
		Divider,
		DetailList,
		DetailItem,
		Link,
		Tooltip
	} from '$lib/components/ui';
	import Handwriting from '$lib/components/ui/Handwriting.svelte';
	import { ArrowRight, Info } from '@lucide/svelte';
	import { onDestroy } from 'svelte';
	import { flight } from '$lib/flight.svelte';
	import type { BioRouteHeading } from '$lib/bio.svelte';

	interface Props {
		compact?: boolean;
		heading?: string;
		headingRoute?: BioRouteHeading;
		description?: string;
		details?: { label: string; value: string; annotation?: string }[];
		handwriting?: string[];
	}

	let {
		compact = false,
		heading,
		headingRoute,
		description,
		details,
		handwriting
	}: Props = $props();

	const location = $derived(flight.location);
	const locationInfo = $derived(flight.locationInfo);
	const defaultDescription = 'Second-year student at UW\u2013Madison studying computer science.';
	const nextRouteKey = $derived(routeKey(headingRoute, heading));
	const nextDescription = $derived(description ?? defaultDescription);

	interface RouteDisplay {
		key: string;
		heading: string;
		route?: BioRouteHeading;
	}

	let displayedRoute = $state<RouteDisplay>({ key: 'James Ding', heading: 'James Ding' });
	let previousRoute = $state<RouteDisplay | undefined>();
	let routeTransitionKey = $state(0);
	let displayedDescription = $state(defaultDescription);
	let previousDescription = $state<string | undefined>();
	let descriptionTransitionKey = $state(0);
	let routeTimer: ReturnType<typeof setTimeout> | undefined;
	let descriptionTimer: ReturnType<typeof setTimeout> | undefined;
	let routeInitialized = false;
	let descriptionInitialized = false;

	const fadeMs = 180;

	function routeKey(route: BioRouteHeading | undefined, fallback: string | undefined): string {
		return route ? `${route.from}-${route.to}` : (fallback ?? 'James Ding');
	}

	function createRouteDisplay(
		route: BioRouteHeading | undefined,
		fallback: string | undefined,
		key: string
	): RouteDisplay {
		return {
			key,
			heading: fallback ?? 'James Ding',
			route: route ? { ...route } : undefined
		};
	}

	function clearRouteTimer() {
		if (routeTimer) {
			clearTimeout(routeTimer);
			routeTimer = undefined;
		}
	}

	function clearDescriptionTimer() {
		if (descriptionTimer) {
			clearTimeout(descriptionTimer);
			descriptionTimer = undefined;
		}
	}

	$effect(() => {
		if (!routeInitialized) {
			displayedRoute = createRouteDisplay(headingRoute, heading, nextRouteKey);
			routeInitialized = true;
			return;
		}

		if (nextRouteKey === displayedRoute.key) return;
		clearRouteTimer();
		previousRoute = displayedRoute;
		displayedRoute = createRouteDisplay(headingRoute, heading, nextRouteKey);
		routeTransitionKey += 1;
		routeTimer = setTimeout(() => {
			previousRoute = undefined;
			routeTimer = undefined;
		}, fadeMs);
	});

	$effect(() => {
		if (!descriptionInitialized) {
			displayedDescription = nextDescription;
			descriptionInitialized = true;
			return;
		}

		if (nextDescription === displayedDescription) return;
		clearDescriptionTimer();
		previousDescription = displayedDescription;
		displayedDescription = nextDescription;
		descriptionTransitionKey += 1;
		descriptionTimer = setTimeout(() => {
			previousDescription = undefined;
			descriptionTimer = undefined;
		}, fadeMs);
	});

	onDestroy(() => {
		clearRouteTimer();
		clearDescriptionTimer();
	});
</script>

{#snippet routeLabel(display: RouteDisplay)}
	{#if display.route}
		<span class="inline-flex min-w-0 items-baseline gap-3">
			<span>{display.route.from}</span>
			<ArrowRight size={44} strokeWidth={2.1} class="shrink-0 translate-y-[7px] text-muted" />
			<span>{display.route.to}</span>
		</span>
	{:else}
		{display.heading}
	{/if}
{/snippet}

<Heading class={handwriting ? 'group' : undefined}>
	<span class="bio-crossfade">
		{#if previousRoute}
			<span class="bio-crossfade__item bio-crossfade__previous" aria-hidden="true">
				{@render routeLabel(previousRoute)}
			</span>
		{/if}
		{#key routeTransitionKey}
			<span
				class="bio-crossfade__item"
				class:bio-crossfade__current--entering={previousRoute !== undefined}
			>
				{@render routeLabel(displayedRoute)}
			</span>
		{/key}
	</span>
	{#if handwriting}
		<Handwriting phrases={handwriting} class="ml-2 text-lg font-extralight text-muted sm:text-xl" />
	{/if}
</Heading>

{#snippet content()}
	<Text variant="body" size="lg" class="mt-4">
		<span class="bio-crossfade bio-crossfade--description">
			{#if previousDescription}
				<span class="bio-crossfade__item bio-crossfade__previous" aria-hidden="true"
					>{previousDescription}</span
				>
			{/if}
			{#key descriptionTransitionKey}
				<span
					class="bio-crossfade__item"
					class:bio-crossfade__current--entering={previousDescription !== undefined}
					>{displayedDescription}</span
				>
			{/key}
		</span>
	</Text>
	<Divider />
	<DetailList>
		{#if details}
			{#each details as detail}
				<DetailItem label={detail.label}
					>{detail.value}{#if detail.annotation}
						<span class="ml-1 text-muted">{detail.annotation}</span>{/if}</DetailItem
				>
			{/each}
		{:else}
			<DetailItem label="currently">open sourcing & training</DetailItem>
			<DetailItem label="currently in"
				>{location}{#if locationInfo}<Tooltip text={locationInfo}
						><Info size={12} class="ml-1.5 inline translate-y-[0.5px] text-muted" /></Tooltip
					>{/if}</DetailItem
			>
			<DetailItem label="interests">systems, infra, open source</DetailItem>
		{/if}
	</DetailList>
{/snippet}

{#if compact}
	<div class="hidden md:contents">
		{@render content()}
	</div>
{:else}
	{@render content()}
{/if}

<style>
	.bio-crossfade {
		display: inline-grid;
		align-items: baseline;
		vertical-align: baseline;
	}

	.bio-crossfade--description {
		display: grid;
		align-items: start;
		width: 100%;
	}

	.bio-crossfade__item {
		grid-area: 1 / 1;
		min-width: 0;
	}

	.bio-crossfade__previous {
		pointer-events: none;
		animation: bio-crossfade-out 180ms ease-out both;
	}

	.bio-crossfade__current--entering {
		animation: bio-crossfade-in 180ms ease-out both;
	}

	@keyframes bio-crossfade-in {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	@keyframes bio-crossfade-out {
		from {
			opacity: 1;
		}

		to {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bio-crossfade__previous {
			display: none;
			animation: none;
		}

		.bio-crossfade__current--entering {
			animation: none;
		}
	}
</style>
