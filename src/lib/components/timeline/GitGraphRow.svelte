<script lang="ts">
	import type { GraphRow } from '$lib/timeline/layout';
	import {
		entryLabel,
		entrySubtitle,
		entryLogo,
		entryTags,
		entryDateStart,
		entryDateEnd
	} from '$lib/types/timeline';
	import {
		laneX,
		graphWidth,
		ROW_HEIGHT,
		CURVE_HEIGHT,
		DOT_RADIUS,
		COMMIT_DOT_RADIUS,
		LINE_WIDTH,
		SPACER_HEIGHT
	} from '$lib/timeline/constants';
	import { ChevronDown } from '@lucide/svelte';

	interface Props {
		row: GraphRow;
		maxLane: number;
		ontoggle: (slug: string) => void;
		expanded?: boolean;
	}

	let { row, maxLane, ontoggle, expanded = false }: Props = $props();

	const svgWidth = $derived(graphWidth(maxLane + 1));

	function toDateStr(d: Date): string {
		return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	}

	const DOT_OFFSET = ROW_HEIGHT / 2;

	function branchOutPath(baseLane: number, branchLane: number, height: number): string {
		const x1 = laneX(baseLane);
		const x2 = laneX(branchLane);
		const startY = -DOT_OFFSET;
		const mid = (startY + height) / 2;
		return `M ${x1} ${startY} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${height}`;
	}

	function forkPath(baseLane: number, branchLane: number, height: number): string {
		const x1 = laneX(branchLane);
		const x2 = laneX(baseLane);
		const endY = height + DOT_OFFSET;
		const mid = endY / 2;
		return `M ${x1} 0 C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${endY}`;
	}
</script>

{#snippet laneLines(activeLanes, skipLane, skipLaneAbove)}
	{#each [...activeLanes] as [lane, info] (lane)}
		{#if lane !== skipLane}
			{#if info.ongoing}
				<div
					class="absolute bottom-0"
					style:left="{laneX(lane) - 1}px"
					style:width="{LINE_WIDTH}px"
					style:top={skipLaneAbove !== undefined && lane === skipLaneAbove ? '50%' : '0'}
					style:background="repeating-linear-gradient(to bottom, {info.color} 0px, {info.color} 4px, transparent
					4px, transparent 7px)"
				></div>
			{:else}
				<div
					class="absolute bottom-0"
					style:left="{laneX(lane) - 1}px"
					style:width="{LINE_WIDTH}px"
					style:top={skipLaneAbove !== undefined && lane === skipLaneAbove ? '50%' : '0'}
					style:background={info.color}
				></div>
			{/if}
		{/if}
	{/each}
{/snippet}

{#snippet dot(lane, radius, color, expand)}
	<div
		class="absolute rounded-full"
		class:page-dot={!expand}
		class:expand-dot={expand}
		style:left="{laneX(lane) - radius}px"
		style:top="50%"
		style:width="{radius * 2}px"
		style:height="{radius * 2}px"
		style:background={color}
		style:transform="translateY(-50%)"
	></div>
{/snippet}

{#if row.type === 'merge'}
	{@const entry = row.entry}
	{@const label = entryLabel(entry)}
	{@const subtitle = entrySubtitle(entry)}
	{@const logo = entryLogo(entry)}
	{@const dateStart = entryDateStart(entry)}
	{@const dateEnd = entryDateEnd(entry)}
	{@const dateStartStr = toDateStr(dateStart)}
	{@const dateEndStr = dateEnd ? toDateStr(dateEnd) : 'Present'}

	<button
		class="merge-row group flex w-full cursor-pointer items-center text-left"
		onclick={() => ontoggle(entry.data.slug)}
		aria-expanded={expanded}
		style:--row-index={row.rowIndex}
	>
		<div class="relative shrink-0" style:width="{svgWidth}px" style:min-height="{ROW_HEIGHT}px">
			{@render laneLines(row.activeLanes, row.branchLane, row.isFirst ? row.baseLane : undefined)}
			{@render dot(row.baseLane, DOT_RADIUS, row.color, false)}
		</div>
		<div class="flex min-w-0 flex-1 items-center gap-3 py-2">
			{#if logo}
				<img
					src="/assets/{logo}"
					alt="{label} logo"
					class="size-5 shrink-0 rounded-sm object-contain"
				/>
			{/if}
			<span class="truncate font-sans text-sm font-semibold text-text">{label}</span>
			{#if subtitle}
				<span class="hidden truncate font-mono text-xs text-muted sm:inline">{subtitle}</span>
			{/if}
			<span class="hidden shrink-0 font-mono text-xs text-muted md:inline">
				{dateStartStr} – {dateEndStr}
			</span>
			<ChevronDown
				size={14}
				class="ml-auto shrink-0 text-muted transition-transform duration-300 {expanded
					? 'rotate-180'
					: ''}"
			/>
		</div>
	</button>
{:else if row.type === 'branch-out'}
	<div class="flex">
		<div class="relative shrink-0" style:width="{svgWidth}px" style:height="{CURVE_HEIGHT}px">
			<svg
				width={svgWidth}
				height={CURVE_HEIGHT}
				class="absolute inset-0 block"
				style:overflow="visible"
				aria-hidden="true"
			>
				{#each [...row.activeLanes] as [lane, info] (lane)}
					{#if lane !== row.branchLane}
						<line
							x1={laneX(lane)}
							y1="0"
							x2={laneX(lane)}
							y2={CURVE_HEIGHT}
							stroke={info.color}
							stroke-width={LINE_WIDTH}
							stroke-dasharray={info.ongoing ? '4 3' : 'none'}
						/>
					{/if}
				{/each}
				<path
					class="branch-draw"
					d={branchOutPath(row.baseLane, row.branchLane, CURVE_HEIGHT)}
					fill="none"
					stroke={row.color}
					stroke-width={LINE_WIDTH}
				/>
			</svg>
		</div>
	</div>
{:else if row.type === 'metadata'}
	{@const entry = row.entry}
	{@const subtitle = entrySubtitle(entry)}
	{@const tags = entryTags(entry)}

	<div class="flex">
		<div class="relative shrink-0" style:width="{svgWidth}px">
			{@render laneLines(row.activeLanes, undefined, undefined)}
		</div>
		<div class="metadata-content flex min-h-7 flex-wrap items-center gap-2 py-1 pr-4">
			{#if subtitle}
				<span class="font-sans text-sm font-medium text-text">{subtitle}</span>
			{/if}
			{#each tags as tag (tag)}
				<span
					class="inline-block rounded-full border border-subtle px-2 py-0.5 font-mono text-xs text-muted"
				>
					{tag}
				</span>
			{/each}
		</div>
	</div>
{:else if row.type === 'commit'}
	<div class="commit-row flex" style:--commit-delay="{row.commitIndex * 60 + 80}ms">
		<div class="relative shrink-0" style:width="{svgWidth}px" style:min-height="{ROW_HEIGHT}px">
			{#if row.ongoing && row.isFirst}
				{@render laneLines(row.activeLanes, row.branchLane, undefined)}
				<!-- dashed line from top to dot -->
				<div
					class="absolute top-0"
					style:left="{laneX(row.branchLane) - 1}px"
					style:width="{LINE_WIDTH}px"
					style:height="50%"
					style:background="repeating-linear-gradient(to bottom, {row.color} 0px, {row.color} 4px, transparent
					4px, transparent 7px)"
				></div>
				<!-- solid line from dot to bottom -->
				<div
					class="absolute bottom-0"
					style:left="{laneX(row.branchLane) - 1}px"
					style:width="{LINE_WIDTH}px"
					style:top="50%"
					style:background={row.color}
				></div>
			{:else}
				{@render laneLines(row.activeLanes, undefined, undefined)}
			{/if}
			{@render dot(row.branchLane, COMMIT_DOT_RADIUS, row.color, true)}
		</div>
		<div class="flex min-h-7 items-baseline gap-2 py-1 pr-4">
			<span class="shrink-0 font-mono text-xs text-muted">{row.commitHash}</span>
			<span class="text-sm leading-snug text-text/80">{row.commitMessage}</span>
		</div>
	</div>
{:else if row.type === 'fork'}
	<div class="flex">
		<div class="relative shrink-0" style:width="{svgWidth}px" style:height="{CURVE_HEIGHT}px">
			<svg
				width={svgWidth}
				height={CURVE_HEIGHT}
				class="absolute inset-0 block"
				style:overflow="visible"
				aria-hidden="true"
			>
				{#each [...row.activeLanes] as [lane, info] (lane)}
					{#if lane !== row.branchLane}
						<line
							x1={laneX(lane)}
							y1="0"
							x2={laneX(lane)}
							y2={CURVE_HEIGHT}
							stroke={info.color}
							stroke-width={LINE_WIDTH}
							stroke-dasharray={info.ongoing ? '4 3' : 'none'}
						/>
					{/if}
				{/each}
				<path
					class="branch-draw"
					d={forkPath(row.baseLane, row.branchLane, CURVE_HEIGHT)}
					fill="none"
					stroke={row.color}
					stroke-width={LINE_WIDTH}
				/>
				<circle
					class="fork-dot"
					cx={laneX(row.baseLane)}
					cy={CURVE_HEIGHT + DOT_OFFSET}
					r={DOT_RADIUS}
					fill={row.color}
				/>
			</svg>
		</div>
	</div>
{:else if row.type === 'spacer'}
	<div class="flex">
		<div class="relative shrink-0" style:width="{svgWidth}px" style:height="{SPACER_HEIGHT}px">
			{@render laneLines(row.activeLanes, undefined, undefined)}
		</div>
	</div>
{:else if row.type === 'initial'}
	<div class="initial-row flex items-center" style:--row-index={row.rowIndex}>
		<div class="relative shrink-0" style:width="{svgWidth}px" style:min-height="{ROW_HEIGHT}px">
			<div
				class="absolute top-0"
				style:left="{laneX(0) - 1}px"
				style:width="{LINE_WIDTH}px"
				style:height="50%"
				style:background="var(--color-muted)"
			></div>
			{@render dot(0, 3, 'var(--color-muted)', false)}
		</div>
		<div class="flex min-w-0 flex-1 items-center gap-3 py-2">
			<span class="shrink-0 font-mono text-xs text-muted">{row.hash}</span>
			<span class="font-mono text-xs text-muted">initial commit</span>
		</div>
	</div>
{/if}

<style>
	/* === Page Load Animations === */
	.merge-row {
		animation: fadeIn 400ms ease-out both;
		animation-delay: calc(var(--row-index) * 60ms);
	}

	.initial-row {
		animation: fadeIn 400ms ease-out both;
		animation-delay: calc(var(--row-index) * 60ms);
	}

	.page-dot {
		scale: 0;
		animation: dotPopIn 300ms ease-out forwards;
		animation-delay: calc(var(--row-index) * 60ms + 150ms);
	}

	/* === Expand Animations === */

	/* SVG curve stroke draw */
	.branch-draw {
		stroke-dasharray: 500;
		stroke-dashoffset: 500;
		animation: strokeDraw 500ms ease-out forwards 50ms;
	}

	/* Metadata content fade */
	.metadata-content {
		opacity: 0;
		animation: fadeIn 300ms ease-out forwards 80ms;
	}

	/* Commit row slide-in */
	.commit-row {
		opacity: 0;
		transform: translateX(-4px);
		animation: commitFadeIn 250ms ease-out forwards;
		animation-delay: var(--commit-delay);
	}

	/* Commit dot pop-in */
	.expand-dot {
		scale: 0;
		animation: dotPopIn 250ms ease-out forwards;
		animation-delay: calc(var(--commit-delay) + 30ms);
	}

	/* Fork dot pop-in */
	.fork-dot {
		scale: 0;
		animation: dotPopIn 300ms ease-out forwards 250ms;
	}

	/* === Keyframes === */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes strokeDraw {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes dotPopIn {
		to {
			scale: 1;
		}
	}

	@keyframes commitFadeIn {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* === Reduced Motion === */
	@media (prefers-reduced-motion: reduce) {
		.merge-row,
		.initial-row,
		.metadata-content,
		.commit-row {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.page-dot,
		.expand-dot,
		.fork-dot {
			animation: none;
			scale: 1;
		}

		.branch-draw {
			animation: none;
			stroke-dashoffset: 0;
		}
	}
</style>
