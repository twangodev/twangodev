<script lang="ts">
	import { Page, Heading, Text, Divider, DetailList, DetailItem, Link } from '$lib/components/ui';
</script>

<Page>
	<Heading>James Ding</Heading>
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
</Page>
