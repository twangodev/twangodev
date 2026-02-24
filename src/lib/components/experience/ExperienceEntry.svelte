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
	const COMMIT_R = 4;
	const EXPANDED_W = 48;
	const CURVE_H = 28;

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
			<div class="expand-content flex flex-col" class:expanded>
				<!-- Merge-back curve at top (only for completed experiences) -->
				{#if !ongoing}
					<div class="flex" style:height="{CURVE_H}px">
						<div class="relative shrink-0" style:width="{EXPANDED_W}px">
							<div class="absolute top-0 bottom-0" style:left="{MAIN_X - 1}px; width: 2px; background: var(--color-muted)"></div>
							<svg width={EXPANDED_W} height={CURVE_H} class="absolute top-0 left-0 block" aria-hidden="true">
								<defs>
									<linearGradient id="branch-in-{index}" gradientUnits="userSpaceOnUse" x1={BRANCH_X} y1={CURVE_H} x2={MAIN_X} y2="0">
										<stop offset="0%" stop-color={color} stop-opacity="1" />
										<stop offset="75%" stop-color={color} stop-opacity="1" />
										<stop offset="100%" stop-color={color} stop-opacity="0" />
									</linearGradient>
								</defs>
								<path
									d="M {BRANCH_X} {CURVE_H} C {BRANCH_X} {CURVE_H / 2}, {MAIN_X} {CURVE_H / 2}, {MAIN_X} 0"
									fill="none"
									stroke="url(#branch-in-{index})"
									stroke-width="2"
									class="branch-draw"
								/>
							</svg>
						</div>
					</div>
				{/if}

				<!-- Role/tags row -->
				<div class="flex">
					<div class="relative shrink-0" style:width="{EXPANDED_W}px">
						<div class="absolute top-0 bottom-0" style:left="{MAIN_X - 1}px; width: 2px; background: var(--color-muted)"></div>
						{#if !ongoing}
							<div class="absolute top-0 bottom-0" style:left="{BRANCH_X - 1}px; width: 2px; background: {color}"></div>
						{/if}
					</div>
					<div class="flex min-h-7 flex-wrap items-center gap-2 pr-4">
						<span class="font-sans text-sm font-medium text-text">{experience.role}</span>
						{#each experience.tags as tag (tag)}
							<span class="inline-block rounded-full border border-subtle px-2 py-0.5 font-mono text-xs text-muted">
								{tag}
							</span>
						{/each}
					</div>
				</div>

				<!-- Commit rows -->
				{#each experience.commits as commit, ci (ci)}
					<div class="commit-line flex" style:--commit-delay="{ci * 60 + 100}ms">
						<div class="relative shrink-0" style:width="{EXPANDED_W}px">
							<div class="absolute top-0 bottom-0" style:left="{MAIN_X - 1}px; width: 2px; background: var(--color-muted)"></div>
							<div class="absolute bottom-0" style:left="{BRANCH_X - 1}px; width: 2px; top: {ongoing && ci === 0 ? '50%' : '0'}; background: {color}"></div>
							<div
								class="branch-dot absolute top-1/2 rounded-full"
								style:left="{BRANCH_X - COMMIT_R}px; width: {COMMIT_R * 2}px; height: {COMMIT_R * 2}px; background: {color}; transform: translateY(-50%)"
								style:--branch-dot-delay="{ci * 60 + 150}ms"
							></div>
						</div>
						<div class="flex min-h-7 items-baseline gap-2 py-1 pr-4">
							<span class="shrink-0 font-mono text-xs text-muted">{commitHashes[ci]}</span>
							<span class="text-sm leading-snug text-text/80">{commit}</span>
						</div>
					</div>
				{/each}

				<!-- Branch-out curve at bottom -->
				<div class="flex" style:height="{CURVE_H}px">
					<div class="relative shrink-0" style:width="{EXPANDED_W}px">
						<div class="absolute top-0 bottom-0" style:left="{MAIN_X - 1}px; width: 2px; background: var(--color-muted)"></div>
						<svg width={EXPANDED_W} height={CURVE_H} class="absolute top-0 left-0 block" aria-hidden="true">
							<defs>
								<linearGradient id="branch-out-{index}" gradientUnits="userSpaceOnUse" x1={MAIN_X} y1={CURVE_H} x2={BRANCH_X} y2="0">
									<stop offset="0%" stop-color={color} stop-opacity="0" />
									<stop offset="25%" stop-color={color} stop-opacity="1" />
									<stop offset="100%" stop-color={color} stop-opacity="1" />
								</linearGradient>
							</defs>
							<path
								d="M {MAIN_X} {CURVE_H} C {MAIN_X} {CURVE_H / 2}, {BRANCH_X} {CURVE_H / 2}, {BRANCH_X} 0"
								fill="none"
								stroke="url(#branch-out-{index})"
								stroke-width="2"
								class="branch-draw"
							/>
						</svg>
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
		scale: 0;
		animation: popIn 250ms ease-out forwards;
		animation-delay: var(--branch-dot-delay);
	}

	.expand-content:not(.expanded) .branch-dot {
		scale: 1;
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
			scale: 1;
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
			scale: 1;
		}
		.expand-content.expanded .commit-line {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>