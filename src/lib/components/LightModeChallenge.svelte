<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import {
		DialogRoot,
		DialogOverlay,
		DialogContent,
		DialogTitle,
		DialogClose,
		Checkbox,
		Stack,
		Row,
		Text
	} from '$lib/components/ui';

	interface Props {
		open: boolean;
		onconfirm: () => void;
	}

	let { open = $bindable(), onconfirm }: Props = $props();

	let step = $state(1);
	let selected = new SvelteSet<string>();
	let typedPhrase = $state('');
	let shaking = $state(false);

	const TARGET_PHRASE = 'i love light mode';

	const reasons = [
		'i enjoy staring at the sun',
		'i hate my retinas',
		"i'm a psychopath",
		'i just want to watch the world burn'
	];

	const allSelected = $derived(selected.size === reasons.length);
	const phraseMatch = $derived(typedPhrase.trim().toLowerCase() === TARGET_PHRASE);

	function reset() {
		step = 1;
		selected.clear();
		typedPhrase = '';
		shaking = false;
	}

	function toggle(reason: string) {
		if (selected.has(reason)) {
			selected.delete(reason);
		} else {
			selected.add(reason);
		}
	}

	function handleNext() {
		if (!allSelected) return;
		step = 2;
	}

	function handleSubmit() {
		if (!phraseMatch) {
			shaking = true;
			setTimeout(() => (shaking = false), 500);
			return;
		}
		onconfirm();
	}
</script>

<DialogRoot
	{open}
	onOpenChange={(value) => {
		if (!value) reset();
	}}
>
	<DialogOverlay />
	<DialogContent class="font-mono text-sm tracking-wide">
		{#if step === 1}
			<Stack gap="lg">
				<DialogTitle class="text-base">why do you want light mode?</DialogTitle>
				<Stack gap="sm">
					<Text as="span" variant="muted" size="xs">[select all]</Text>
					<Stack gap="xs">
						{#each reasons as reason (reason)}
							<Checkbox checked={selected.has(reason)} onchange={() => toggle(reason)}>
								<Text as="span" variant="muted" size="sm">{reason}</Text>
							</Checkbox>
						{/each}
					</Stack>
				</Stack>
				<hr class="border-subtle" />
				<Row justify="between" align="center">
					<DialogClose>nevermind</DialogClose>
					<button
						onclick={handleNext}
						disabled={!allSelected}
						class="cursor-pointer text-sm text-text transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
					>
						next &gt;
					</button>
				</Row>
			</Stack>
		{:else if step === 2}
			<Stack gap="lg">
				<DialogTitle class="sr-only">verify</DialogTitle>
				<Text variant="body" size="sm">interesting.</Text>
				<Stack gap="xs">
					<Text as="span" variant="muted" size="xs">[verify] type "{TARGET_PHRASE}"</Text>
					<input
						type="text"
						bind:value={typedPhrase}
						placeholder={TARGET_PHRASE}
						class="w-full rounded border border-subtle bg-surface px-3 py-2 font-mono text-sm text-text placeholder:text-muted/40 focus:border-accent focus:outline-none {shaking
							? 'shake'
							: ''}"
						onkeydown={(e) => {
							if (e.key === 'Enter') handleSubmit();
						}}
					/>
				</Stack>
				<hr class="border-subtle" />
				<Row justify="between" align="center">
					<DialogClose>nevermind</DialogClose>
					<button
						onclick={handleSubmit}
						disabled={!phraseMatch}
						class="cursor-pointer text-sm text-text transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
					>
						submit &gt;
					</button>
				</Row>
			</Stack>
		{/if}
	</DialogContent>
</DialogRoot>

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-6px);
		}
		40% {
			transform: translateX(6px);
		}
		60% {
			transform: translateX(-4px);
		}
		80% {
			transform: translateX(4px);
		}
	}

	.shake {
		animation: shake 0.4s ease-in-out;
	}
</style>
