<script lang="ts">
	import type { ExperienceMetadata } from '$lib/types/experience';
	import { ChevronDown } from '@lucide/svelte';
	import CommitRow from './CommitRow.svelte';

	interface Props {
		experience: ExperienceMetadata;
		color: string;
		hash: string;
		index: number;
		expanded: boolean;
		ontoggle: () => void;
		isLast: boolean;
	}

	let { experience, color, hash, index, expanded, ontoggle, isLast }: Props = $props();

	const MAIN_X = 12;
	const BRANCH_X = 36;
	const COMMIT_R = 5;
	const BRANCH_COMMIT_SPACING = 28;
	const EXPANDED_SVG_W = 48;

	function toDate(val: string | Date): Date {
		return val instanceof Date ? val : new Date(val);
	}

	const dateStartStr = $derived(
		toDate(experience.dateStart).toLocaleDateString('en-US', {
			month: 'short',
			year: 'numeric'
		})
	);

	const dateEndStr = $derived(
		experience.dateEnd
			? toDate(experience.dateEnd).toLocaleDateString('en-US', {
					month: 'short',
					year: 'numeric'
				})
			: 'Present'
	);

	const ongoing = $derived(!experience.dateEnd);

	const expandedHeight = $derived(
		experience.commits.length * BRANCH_COMMIT_SPACING + (ongoing ? 28 : 56)
	);

	function branchCommitHashes(): string[] {
		return experience.commits.map(() => Math.random().toString(16).slice(2, 9));
	}

	const commitHashes = branchCommitHashes();
</script>

<div class="experience-entry" style:--stagger-delay="{index * 100}ms">
	<!-- Main row (clickable) -->
	<button
		class="group flex w-full cursor-pointer text-left"
		onclick={ontoggle}
		aria-expanded={expanded}
	>
		<CommitRow {hash} {color} showLineAbove={index > 0} showLineBelow={!isLast || expanded} {index}>
			{#if experience.logo}
				<img
					src="/assets/{experience.logo}"
					alt="{experience.company} logo"
					class="size-5 shrink-0 rounded-sm object-contain"
				/>
			{/if}
			<span class="truncate font-sans text-sm font-semibold text-text">
				{experience.company}
			</span>
			<span class="hidden truncate font-mono text-xs text-muted sm:inline">
				{experience.role}
			</span>
			<span class="hidden shrink-0 font-mono text-xs text-muted md:inline">
				{dateStartStr} – {dateEndStr}
			</span>
			<ChevronDown
				size={14}
				class="ml-auto shrink-0 text-muted transition-transform duration-300 {expanded
					? 'rotate-180'
					: ''}"
			/>
		</CommitRow>
	</button>

	<!-- Expanded feature branch -->
	<div class="expand-wrapper grid" style:grid-template-rows={expanded ? '1fr' : '0fr'}>
		<div class="overflow-hidden">
			<div class="expand-content flex items-start gap-0" class:expanded>
				<!-- SVG for expanded branch -->
				<div class="relative shrink-0" style:width="{EXPANDED_SVG_W}px">
					<svg width={EXPANDED_SVG_W} height={expandedHeight} class="block" aria-hidden="true">
						<defs>
							<linearGradient
								id="branch-out-{index}"
								gradientUnits="userSpaceOnUse"
								x1={MAIN_X}
								y1="0"
								x2={BRANCH_X}
								y2="28"
							>
								<stop offset="0%" stop-color={color} stop-opacity="0" />
								<stop offset="25%" stop-color={color} stop-opacity="1" />
								<stop offset="100%" stop-color={color} stop-opacity="1" />
							</linearGradient>
							{#if !ongoing}
								<linearGradient
									id="branch-in-{index}"
									gradientUnits="userSpaceOnUse"
									x1={BRANCH_X}
									y1={expandedHeight - 28}
									x2={MAIN_X}
									y2={expandedHeight}
								>
									<stop offset="0%" stop-color={color} stop-opacity="1" />
									<stop offset="75%" stop-color={color} stop-opacity="1" />
									<stop offset="100%" stop-color={color} stop-opacity="0" />
								</linearGradient>
							{/if}
						</defs>
						<!-- Main line continues -->
						<line
							x1={MAIN_X}
							y1="0"
							x2={MAIN_X}
							y2={expandedHeight}
							stroke="var(--color-muted)"
							stroke-width="2"
						/>
						<!-- Branch-out from main to feature lane -->
						<path
							d="M {MAIN_X} 0 C {MAIN_X} 14, {BRANCH_X} 14, {BRANCH_X} 28"
							fill="none"
							stroke="url(#branch-out-{index})"
							stroke-width="2"
							class="branch-draw"
						/>
						<!-- Feature branch vertical -->
						<line
							x1={BRANCH_X}
							y1="28"
							x2={BRANCH_X}
							y2={ongoing ? expandedHeight : expandedHeight - 28}
							stroke={color}
							stroke-width="2"
							class="branch-draw"
						/>
						<!-- Commit dots on feature branch -->
						{#each experience.commits as _, ci (ci)}
							<circle
								cx={BRANCH_X}
								cy={28 + ci * BRANCH_COMMIT_SPACING + BRANCH_COMMIT_SPACING / 2}
								r={COMMIT_R - 1}
								fill={color}
								class="branch-dot"
								style:--branch-dot-delay="{ci * 60 + 150}ms"
							/>
						{/each}
						<!-- Merge-back from feature to main (only for completed experiences) -->
						{#if !ongoing}
							<path
								d="M {BRANCH_X} {expandedHeight - 28} C {BRANCH_X} {expandedHeight -
									14}, {MAIN_X} {expandedHeight - 14}, {MAIN_X} {expandedHeight}"
								fill="none"
								stroke="url(#branch-in-{index})"
								stroke-width="2"
								class="branch-draw"
							/>
						{/if}
					</svg>
				</div>

				<!-- Expanded content -->
				<div class="flex flex-col gap-0 pr-4">
					<!-- Role/tags header - aligns with branch-out region -->
					<div class="flex flex-wrap items-center gap-2" style:height="{BRANCH_COMMIT_SPACING}px">
						<span class="font-sans text-sm font-medium text-text">{experience.role}</span>
						{#each experience.tags as tag (tag)}
							<span
								class="inline-block rounded-full border border-subtle px-2 py-0.5 font-mono text-xs text-muted"
							>
								{tag}
							</span>
						{/each}
					</div>
					<!-- Commit lines - each matches BRANCH_COMMIT_SPACING height -->
					<div class="flex flex-col">
						{#each experience.commits as commit, ci (ci)}
							<div
								class="commit-line flex items-baseline gap-2"
								style:height="{BRANCH_COMMIT_SPACING}px"
								style:--commit-delay="{ci * 60 + 100}ms"
							>
								<span class="shrink-0 font-mono text-xs text-muted">{commitHashes[ci]}</span>
								<span class="text-sm leading-snug text-text/80">{commit}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.experience-entry {
		animation: fadeIn 400ms ease-out both;
		animation-delay: var(--stagger-delay);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.expand-wrapper {
		transition: grid-template-rows 300ms ease-out;
	}

	.expand-content {
		opacity: 0;
		transition: opacity 250ms ease-out;
	}

	.expand-content.expanded {
		opacity: 1;
		transition: opacity 300ms ease-out 100ms;
	}

	.expand-content.expanded .branch-draw {
		animation: strokeDraw 400ms ease-out forwards 100ms;
		stroke-dasharray: 500;
		stroke-dashoffset: 500;
	}

	.expand-content:not(.expanded) .branch-draw {
		stroke-dasharray: none;
		stroke-dashoffset: 0;
	}

	.expand-content.expanded .branch-dot {
		transform-origin: center;
		transform: scale(0);
		animation: popIn 250ms ease-out forwards;
		animation-delay: var(--branch-dot-delay);
	}

	.expand-content:not(.expanded) .branch-dot {
		transform: scale(1);
	}

	.expand-content.expanded .commit-line {
		opacity: 0;
		transform: translateX(-4px);
		animation: commitFadeIn 250ms ease-out forwards;
		animation-delay: var(--commit-delay);
	}

	.expand-content:not(.expanded) .commit-line {
		opacity: 1;
		transform: none;
	}

	@keyframes strokeDraw {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes popIn {
		to {
			transform: scale(1);
		}
	}

	@keyframes commitFadeIn {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.experience-entry {
			animation: none;
			opacity: 1;
		}
		.expand-wrapper {
			transition: none;
		}
		.expand-content {
			transition: none;
			opacity: 1;
		}
		.expand-content.expanded .branch-draw {
			animation: none;
			stroke-dashoffset: 0;
		}
		.expand-content.expanded .branch-dot {
			animation: none;
			transform: scale(1);
		}
		.expand-content.expanded .commit-line {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
