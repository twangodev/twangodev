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
	import { Info } from '@lucide/svelte';

	declare const __CURRENT_LOCATION__: string;
	declare const __LOCATION_INFO__: string;

	interface Props {
		compact?: boolean;
		heading?: string;
		description?: string;
		details?: { label: string; value: string; annotation?: string }[];
	}

	let { compact = false, heading, description, details }: Props = $props();
</script>

<Heading>{heading ?? 'James Ding'}</Heading>

{#snippet content()}
	<Text variant="body" size="lg" class="mt-4">
		{description ?? 'Second-year student at UW\u2013Madison studying computer science.'}
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
			<DetailItem label="currently">
				founding engineer at <Link href="https://fish.audio" underline>fish audio</Link>
			</DetailItem>
			<DetailItem label="currently in"
				>{__CURRENT_LOCATION__}{#if __LOCATION_INFO__}<Tooltip text={__LOCATION_INFO__}
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
