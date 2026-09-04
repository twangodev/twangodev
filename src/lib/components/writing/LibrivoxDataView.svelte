<script module lang="ts">
	import type { LibrivoxActivitySnapshot } from '$lib/librivox/activity';
	import type { AgentText } from '$lib/writing/agent-text';
	import { markdownTable } from '$lib/writing/agent-table';

	// Refetched from the mirror's Hugging Face book indexes at build time (see vite.config.ts).
	declare const __LIBRIVOX_ACTIVITY__: LibrivoxActivitySnapshot;

	const snapshot = __LIBRIVOX_ACTIVITY__;
	const yearTotals = snapshot.years.map(({ year, weeks }) => [
		year,
		weeks.reduce((sum, count) => sum + count, 0)
	]);
	const firstYear = snapshot.years[0]?.year;
	const lastYear = snapshot.years.at(-1)?.year;
	const peakWeek = Math.max(1, ...snapshot.years.flatMap(({ weeks }) => weeks));

	export const agentText: AgentText = () =>
		[
			`Weekly publication activity for ${snapshot.totalSegments.toLocaleString('en-US')} mirrored LibriVox audio segments from ${firstYear} through ${lastYear}, based on each book's Internet Archive publicdate stored in the mirror. Interactive week details divide each day into three-hour UTC windows.`,
			'',
			markdownTable(['Year', 'Segments'], yearTotals)
		].join('\n');
</script>

<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import {
		LIBRIVOX_WINDOWS_PER_WEEK,
		type LibrivoxActivityBin,
		type LibrivoxActivityYear
	} from '$lib/librivox/activity';
	import { curveMonotoneX } from 'd3-shape';
	import { LineChart } from 'layerchart';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import ChartA11yTable from './ChartA11yTable.svelte';

	interface ActiveWeek {
		bins: number[];
		count: number;
		hasBreakdown: boolean;
		week: number;
		year: number;
	}

	const DAY_MS = 24 * 60 * 60 * 1000;
	const WEEK_MS = 7 * DAY_MS;
	const TOOLTIP_WIDTH = 320;
	const TOOLTIP_HEIGHT = 190;
	const generatedAt = new Date(snapshot.generatedAt);
	const detailConfig = {
		segments: { label: 'Segments', color: 'var(--color-chart-2)' }
	} satisfies Chart.ChartConfig;
	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
	const monthMarkers = [
		{ label: 'Jan', column: 1 },
		{ label: 'Feb', column: 5 },
		{ label: 'Mar', column: 9 },
		{ label: 'Apr', column: 14 },
		{ label: 'May', column: 18 },
		{ label: 'Jun', column: 22 },
		{ label: 'Jul', column: 27 },
		{ label: 'Aug', column: 31 },
		{ label: 'Sep', column: 35 },
		{ label: 'Oct', column: 40 },
		{ label: 'Nov', column: 44 },
		{ label: 'Dec', column: 48 }
	];
	const lastYearIndex = Math.max(snapshot.years.length - 1, 0);
	const initialWeek = Math.min(
		52,
		Math.max(0, Math.floor((generatedAt.getTime() - Date.UTC(lastYear ?? 0, 0, 1)) / WEEK_MS))
	);
	const hoverPosition = new Spring(
		{ x: 12, y: 12 },
		{ stiffness: 0.13, damping: 0.72, precision: 0.25 }
	);

	let activityGrid: HTMLDivElement | undefined = $state();
	let activeWeek: ActiveWeek | undefined = $state();
	let pinned = $state(false);
	let keyboardIndex = $state(lastYearIndex * 53 + initialWeek);
	const detailData = $derived(activeWeek?.bins.map((segments, slot) => ({ segments, slot })) ?? []);
	const detailPeak = $derived(Math.max(1, ...detailData.map(({ segments }) => segments)));
	const activeRange = $derived(activeWeek ? weekRangeLabel(activeWeek.year, activeWeek.week) : '');
	const activePeak = $derived.by(() => {
		const selected = activeWeek;
		if (!selected || selected.count === 0) return '';

		let peakIndex = 0;
		for (let index = 1; index < selected.bins.length; index += 1) {
			if (selected.bins[index] > selected.bins[peakIndex]) peakIndex = index;
		}
		const date = new Date(
			weekStart(selected.year, selected.week).getTime() + peakIndex * 3 * 60 * 60 * 1000
		);
		const hour = date.getUTCHours();
		return `peak ${date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })} ${hourLabel(hour)}–${hourLabel(hour + 3)} · ${selected.bins[peakIndex].toLocaleString('en-US')}`;
	});

	function weekStart(year: number, week: number): Date {
		return new Date(Date.UTC(year, 0, 1) + week * WEEK_MS);
	}

	function hourLabel(hour: number): string {
		const normalized = hour % 24;
		return `${normalized % 12 || 12}${normalized < 12 ? 'a' : 'p'}`;
	}

	function weekRangeLabel(year: number, week: number): string {
		const start = weekStart(year, week);
		const end = new Date(Math.min(start.getTime() + 6 * DAY_MS, Date.UTC(year, 11, 31)));
		return `${dateFormatter.format(start)}–${dateFormatter.format(end)}`;
	}

	function activityColor(count: number): string {
		if (count === 0) return 'var(--color-subtle)';
		const strength = Math.round(20 + Math.sqrt(count / peakWeek) * 80);
		return `color-mix(in oklch, var(--color-chart-2) ${strength}%, var(--color-surface))`;
	}

	function cellLabel(year: number, week: number, count: number): string {
		const segments = count === 1 ? 'segment' : 'segments';
		return `${weekRangeLabel(year, week)}: ${count.toLocaleString('en-US')} ${segments}`;
	}

	function expandBins(sparse: LibrivoxActivityBin[] | undefined): number[] {
		const bins = Array<number>(LIBRIVOX_WINDOWS_PER_WEEK).fill(0);
		for (const [index, count] of sparse ?? []) bins[index] = count;
		return bins;
	}

	function selectWeek(row: LibrivoxActivityYear, week: number, count: number): ActiveWeek {
		return {
			bins: expandBins(row.windows?.[week]),
			count,
			hasBreakdown: row.windows !== undefined,
			week,
			year: row.year
		};
	}

	function sameWeek(a: ActiveWeek | undefined, b: ActiveWeek): boolean {
		return a?.year === b.year && a.week === b.week;
	}

	function setTooltipPosition(x: number, y: number, instant = false): void {
		if (typeof window === 'undefined') return;
		const next = {
			x: Math.max(12, Math.min(x + 14, window.innerWidth - TOOLTIP_WIDTH - 12)),
			y: Math.max(12, Math.min(y + 14, window.innerHeight - TOOLTIP_HEIGHT - 12))
		};
		void hoverPosition.set(next, { instant: instant || prefersReducedMotion.current });
	}

	function setTooltipNearCell(element: HTMLElement): void {
		if (typeof window === 'undefined') return;
		const rect = element.getBoundingClientRect();
		const x =
			rect.right + 14 + TOOLTIP_WIDTH < window.innerWidth
				? rect.right
				: rect.left - TOOLTIP_WIDTH - 28;
		setTooltipPosition(x, rect.top - 42, true);
	}

	function handlePointerEnter(
		event: PointerEvent,
		row: LibrivoxActivityYear,
		week: number,
		count: number
	): void {
		if (pinned || event.pointerType === 'touch') return;
		const wasActive = activeWeek !== undefined;
		activeWeek = selectWeek(row, week, count);
		setTooltipPosition(event.clientX, event.clientY, !wasActive);
	}

	function handlePointerMove(event: PointerEvent): void {
		if (!pinned && event.pointerType !== 'touch') {
			setTooltipPosition(event.clientX, event.clientY);
		}
	}

	function handleCellClick(
		event: MouseEvent,
		row: LibrivoxActivityYear,
		week: number,
		count: number
	): void {
		const selected = selectWeek(row, week, count);
		if (pinned && sameWeek(activeWeek, selected)) {
			pinned = false;
			activeWeek = undefined;
			return;
		}

		activeWeek = selected;
		pinned = true;
		setTooltipNearCell(event.currentTarget as HTMLElement);
	}

	function handleCellFocus(
		event: FocusEvent,
		row: LibrivoxActivityYear,
		week: number,
		count: number,
		index: number
	): void {
		keyboardIndex = index;
		activeWeek = selectWeek(row, week, count);
		setTooltipNearCell(event.currentTarget as HTMLElement);
	}

	function focusCell(index: number): void {
		const cell = activityGrid?.querySelector<HTMLButtonElement>(`[data-cell-index="${index}"]`);
		if (!cell || cell.disabled) return;
		keyboardIndex = index;
		cell.focus();
	}

	function handleCellKeydown(event: KeyboardEvent, index: number): void {
		if (event.key === 'Escape') {
			pinned = false;
			activeWeek = undefined;
			return;
		}

		const rowStart = Math.floor(index / 53) * 53;
		const candidates: Record<string, number> = {
			ArrowDown: index + 53,
			ArrowLeft: index - 1,
			ArrowRight: index + 1,
			ArrowUp: index - 53,
			End: rowStart + 52,
			Home: rowStart
		};
		const candidate = candidates[event.key];
		if (candidate === undefined) return;
		event.preventDefault();

		const maxIndex = snapshot.years.length * 53 - 1;
		const direction = event.key === 'End' || candidate < index ? -1 : 1;
		for (
			let next = Math.max(0, Math.min(candidate, maxIndex));
			next >= 0 && next <= maxIndex;
			next += direction
		) {
			const cell = activityGrid?.querySelector<HTMLButtonElement>(`[data-cell-index="${next}"]`);
			if (cell && !cell.disabled) {
				focusCell(next);
				break;
			}
		}
	}
</script>

<figure class="not-prose my-12">
	<div class="w-full">
		<div class="mb-3 grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 sm:gap-3">
			<span aria-hidden="true"></span>
			<div
				class="grid h-3 gap-[1px] font-mono text-[0.55rem] leading-none text-muted sm:gap-1"
				style:grid-template-columns="repeat(53, minmax(0, 1fr))"
			>
				{#each monthMarkers as marker (marker.label)}
					<span style:grid-column={`${marker.column} / span 4`}>{marker.label}</span>
				{/each}
			</div>
		</div>

		<div
			bind:this={activityGrid}
			class="space-y-1.5"
			role="group"
			aria-label={`Weekly LibriVox publication activity from ${firstYear} through ${lastYear}`}
			onpointerleave={() => {
				if (!pinned) activeWeek = undefined;
			}}
		>
			{#each snapshot.years as row, rowIndex (row.year)}
				<div class="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 sm:gap-3">
					<span class="font-mono text-[0.58rem] leading-none text-muted tabular-nums">
						{row.year}
					</span>
					<div
						class="grid min-w-0 gap-[1px] sm:gap-1"
						style:grid-template-columns="repeat(53, minmax(0, 1fr))"
					>
						{#each row.weeks as count, week (week)}
							{@const future = weekStart(row.year, week) > generatedAt}
							{@const index = rowIndex * 53 + week}
							<button
								type="button"
								class="block aspect-square w-full appearance-none rounded-[2px] border-0 p-0 focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:pointer-events-none"
								class:opacity-0={future}
								class:ring-1={activeWeek?.year === row.year && activeWeek.week === week}
								class:ring-text={activeWeek?.year === row.year && activeWeek.week === week}
								style:background-color={activityColor(count)}
								data-cell-index={index}
								disabled={future}
								tabindex={keyboardIndex === index ? 0 : -1}
								aria-label={cellLabel(row.year, week, count)}
								title={future ? undefined : cellLabel(row.year, week, count)}
								onpointerenter={(event) => handlePointerEnter(event, row, week, count)}
								onpointermove={handlePointerMove}
								onclick={(event) => handleCellClick(event, row, week, count)}
								onfocus={(event) => handleCellFocus(event, row, week, count, index)}
								onblur={() => {
									if (!pinned) activeWeek = undefined;
								}}
								onkeydown={(event) => handleCellKeydown(event, index)}
							></button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	{#if activeWeek}
		<div
			class="pointer-events-none fixed top-0 left-0 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-subtle bg-bg/95 p-5 shadow-xl backdrop-blur-sm"
			style:transform={`translate3d(${hoverPosition.current.x}px, ${hoverPosition.current.y}px, 0)`}
			aria-hidden="true"
		>
			<p class="font-sans text-xs text-muted">{activeRange} · UTC</p>
			<p class="mt-1 font-sans text-sm text-muted">
				<span class="font-mono text-2xl font-semibold tracking-tight text-text tabular-nums">
					{activeWeek.count.toLocaleString('en-US')}
				</span>
				{activeWeek.count === 1 ? 'segment' : 'segments'}
			</p>

			{#if activeWeek.count === 0}
				<div class="mt-4 flex h-20 items-center justify-center font-mono text-xs text-muted">
					quiet
				</div>
			{:else if activeWeek.hasBreakdown}
				<Chart.Container config={detailConfig} class="mt-4 h-20 w-full">
					<LineChart
						data={detailData}
						x="slot"
						yDomain={[0, detailPeak]}
						series={[
							{
								key: 'segments',
								label: detailConfig.segments.label,
								value: 'segments',
								color: detailConfig.segments.color
							}
						]}
						axis={false}
						grid={false}
						rule={false}
						highlight={false}
						tooltipContext={false}
						pointerEvents={false}
						padding={{ top: 4, right: 2, bottom: 2, left: 2 }}
						motion={prefersReducedMotion.current
							? 'none'
							: { type: 'spring', stiffness: 0.14, damping: 0.76 }}
						props={{
							spline: {
								curve: curveMonotoneX,
								fill: 'none',
								strokeWidth: 1.75,
								'stroke-linecap': 'round',
								'stroke-linejoin': 'round'
							}
						}}
					/>
				</Chart.Container>
				<p class="mt-3 font-mono text-[0.6rem] text-muted">{activePeak}</p>
			{:else}
				<div class="mt-4 flex h-20 items-center justify-center font-mono text-xs text-muted">
					3-hour detail unavailable
				</div>
			{/if}
		</div>
	{/if}

	<p class="sr-only" aria-live="polite">
		{activeWeek
			? `${cellLabel(activeWeek.year, activeWeek.week, activeWeek.count)}. Three-hour UTC breakdown ${activeWeek.hasBreakdown ? 'shown' : 'unavailable'}.`
			: ''}
	</p>

	<ChartA11yTable
		headers={['Year', 'Segments']}
		rows={yearTotals}
		caption="Mirrored LibriVox audio segments by Internet Archive publication year"
	/>

</figure>
