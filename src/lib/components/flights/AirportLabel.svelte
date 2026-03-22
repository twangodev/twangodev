<script lang="ts">
	interface Props {
		id: string;
		iata: string;
		city: string;
		name: string;
		count: number;
		z: number;
		importance: number;
		onhover?: (hovered: boolean) => void;
	}

	const { id, iata, city, name, count, z, importance, onhover }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group pointer-events-auto absolute mb-2 w-min rounded-sm bg-surface/80 px-1 py-0.5 font-mono text-text shadow-sm transition-[opacity,padding,border-radius,background-color] duration-200 hover:z-[9999]! hover:w-max hover:max-w-64 hover:rounded-lg hover:bg-surface hover:px-4 hover:py-3 hover:opacity-100! hover:shadow-lg"
	style:position-anchor="--cobe-{id}"
	style:bottom="anchor(top)"
	style:left="anchor(center)"
	style:translate="-50% 0"
	style:opacity="calc(var(--cobe-visible-{id}, 0) * {importance})"
	style="--label-size: {8 + 4 * importance}px"
	style:z-index={z}
	onmouseenter={() => onhover?.(true)}
	onmouseleave={() => onhover?.(false)}
>
	<div
		class="flex items-center gap-2 text-[length:var(--label-size)] whitespace-nowrap transition-[font-size] duration-200 group-hover:text-sm group-hover:font-semibold"
	>
		<span>{iata}</span>
		<span class="hidden size-1 shrink-0 rounded-full bg-muted/40 group-hover:block"></span>
		<p class="line-clamp-2 hidden whitespace-normal text-muted group-hover:line-clamp-2">{name}</p>
	</div>
	<div
		class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-hover:grid-rows-[1fr]"
	>
		<div class="overflow-hidden whitespace-nowrap">
			<div
				class="mt-1.5 flex items-center gap-1.5 border-t border-muted/20 pt-1.5 text-xs text-muted/60"
			>
				<span>{city}</span>
				<span class="size-0.5 shrink-0 rounded-full bg-muted/40"></span>
				<span>{count} {count === 1 ? 'visit' : 'visits'}</span>
			</div>
		</div>
	</div>
</div>
