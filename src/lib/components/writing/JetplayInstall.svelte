<script module lang="ts">
	import type { MarketplaceDownloadPoint } from '$lib/jetbrains/marketplace-downloads';
	import type { AgentText } from '$lib/writing/agent-text';

	const PLUGIN_URL = 'https://plugins.jetbrains.com/plugin/31014-jetplay';

	// Inlined at build time from the JetBrains Marketplace API (see vite.config.ts).
	declare const __JETPLAY_DOWNLOADS__: number;
	declare const __JETPLAY_DOWNLOAD_SERIES__: MarketplaceDownloadPoint[];

	export const agentText: AgentText = () =>
		`[Get Jetplay on the JetBrains Marketplace](${PLUGIN_URL}) — ${__JETPLAY_DOWNLOADS__.toLocaleString('en-US')} downloads.`;
</script>

<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { createJetplayPreviewSeries } from '$lib/jetbrains/marketplace-downloads';
	import { ArrowUpRight } from '@lucide/svelte';
	import { AreaChart, Tooltip } from 'layerchart';
	import { scaleUtc } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import ChartA11yTable from './ChartA11yTable.svelte';
	import jetbrainsLogo from '$lib/assets/jetbrains.svg?raw';

	type ChartPoint = MarketplaceDownloadPoint & { timestamp: Date };

	const config = {
		downloads: { label: 'Daily downloads', color: 'var(--color-accent)' }
	} satisfies Chart.ChartConfig;

	const preview = __JETPLAY_DOWNLOAD_SERIES__.length === 0 && import.meta.env.DEV;
	const series = preview
		? createJetplayPreviewSeries(__JETPLAY_DOWNLOADS__)
		: __JETPLAY_DOWNLOAD_SERIES__;
	const chartData: ChartPoint[] = series.map((point) => ({
		...point,
		timestamp: new Date(`${point.date}T00:00:00Z`)
	}));
	const recentDownloads = chartData.slice(-30).reduce((sum, point) => sum + point.downloads, 0);
	const downloads = __JETPLAY_DOWNLOADS__.toLocaleString('en-US');
	const recentDownloadsLabel = recentDownloads.toLocaleString('en-US');
	const tableHeaders = ['Date', 'Downloads'];
	const tableRows = series.map((point) => [point.date, point.downloads]);

	const axisDateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		timeZone: 'UTC'
	});
	const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
	const compactNumberFormatter = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});

	function formatAxisDate(value: Date | number): string {
		return axisDateFormatter.format(new Date(value));
	}

	function formatCount(value: number): string {
		return compactNumberFormatter.format(value);
	}
</script>

<figure
	class="not-prose my-6 w-full overflow-hidden rounded-3xl border border-subtle bg-surface/45 shadow-[0_1px_0_color-mix(in_srgb,var(--color-text)_4%,transparent)]"
>
	<div class="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
		<div class="flex min-w-0 items-center gap-2.5">
			<span class="inline-flex size-8 shrink-0 [&>svg]:size-full">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted local brand asset -->
				{@html jetbrainsLogo}
			</span>
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<a
						href={PLUGIN_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="group inline-flex items-center gap-1 font-sans text-base font-semibold tracking-tight text-text transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
					>
						Jetplay
						<ArrowUpRight size={14} class="text-muted transition-colors group-hover:text-accent" />
					</a>
					{#if preview}
						<span
							class="rounded-full border border-subtle bg-bg/60 px-2 py-0.5 font-mono text-[0.58rem] tracking-wide text-muted uppercase"
						>
							preview data
						</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex shrink-0 items-baseline gap-1.5">
			<span class="font-mono text-lg font-medium tracking-tight text-text tabular-nums">
				{downloads}
			</span>
			<span class="font-sans text-xs text-muted">total downloads</span>
		</div>
	</div>

	{#if chartData.length > 0}
		<div class="border-t border-subtle px-3 pt-2.5 pb-2 sm:px-5">
			<div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
				<div class="flex items-baseline gap-2">
					<span class="font-sans text-sm font-medium text-text">Daily downloads</span>
					<span class="font-mono text-[0.65rem] text-muted">all time</span>
				</div>
				<div class="font-mono text-[0.65rem] text-text tabular-nums">
					+{recentDownloadsLabel} <span class="text-muted">/ 30d</span>
				</div>
			</div>

			<div aria-hidden="true">
				<Chart.Container
					{config}
					class="h-32 w-full [&_.lc-axis-tick-label]:font-mono [&_.lc-axis-tick-label]:text-[0.6rem]"
				>
					<AreaChart
						data={chartData}
						x="timestamp"
						y="downloads"
						xScale={scaleUtc()}
						series={[
							{
								key: 'downloads',
								label: config.downloads.label,
								value: 'downloads',
								color: config.downloads.color
							}
						]}
						grid={{ x: false, y: { opacity: 0.45 } }}
						highlight={{ lines: false, points: true }}
						padding={{ top: 6, right: 6, bottom: 16, left: 28 }}
						props={{
							area: {
								curve: curveMonotoneX,
								fillOpacity: 0.12,
								line: {
									strokeWidth: 1.75,
									'stroke-linecap': 'round',
									'stroke-linejoin': 'round'
								}
							},
							xAxis: {
								format: formatAxisDate,
								ticks: 5
							},
							yAxis: {
								format: formatCount,
								ticks: 3
							}
						}}
					>
						{#snippet tooltip()}
							<Tooltip.Root variant="none">
								{#snippet children({ data }: { data: ChartPoint })}
									<div
										class="flex min-w-[10rem] items-baseline justify-between gap-4 rounded-lg border border-subtle bg-bg px-2.5 py-2 text-xs shadow-lg"
									>
										<span class="font-sans text-muted">
											{fullDateFormatter.format(data.timestamp)}
										</span>
										<span class="font-mono font-medium text-text tabular-nums">
											{data.downloads.toLocaleString('en-US')}
										</span>
									</div>
								{/snippet}
							</Tooltip.Root>
						{/snippet}
					</AreaChart>
				</Chart.Container>
			</div>

			<ChartA11yTable
				headers={tableHeaders}
				rows={tableRows}
				caption="Daily Jetplay downloads on the JetBrains Marketplace"
			/>
		</div>
	{/if}
</figure>
