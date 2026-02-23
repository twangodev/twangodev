<script lang="ts">
	import { Heading, Text, Divider, DetailList, DetailItem, Link } from '$lib/components/ui';

	interface Props {
		compact?: boolean;
	}

	let { compact = false }: Props = $props();
</script>

<Heading>James Ding</Heading>
{#if compact}
	<div class="hidden md:contents">
		<Text variant="body" size="lg" class="mt-4">
			Second-year student at UW–Madison studying computer science.
		</Text>
		<Divider />
		<DetailList>
			<DetailItem label="currently">
				founding engineer at <Link href="https://fish.audio" underline>fish audio</Link>
			</DetailItem>
			<DetailItem label="location">san francisco bay area / madison, wi</DetailItem>
			<DetailItem label="interests">systems, web, open source</DetailItem>
		</DetailList>
	</div>
{:else}
	<Text variant="body" size="lg" class="mt-4">
		Second-year student at UW–Madison studying computer science.
	</Text>
	<Divider />
	<DetailList>
		<DetailItem label="currently">
			founding engineer at <Link href="https://fish.audio" underline>fish audio</Link>
		</DetailItem>
		<DetailItem label="location">san francisco bay area / madison, wi</DetailItem>
		<DetailItem label="interests">systems, web, open source</DetailItem>
	</DetailList>
{/if}
