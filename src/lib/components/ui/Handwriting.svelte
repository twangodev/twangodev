<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		phrases: string[];
		holdDuration?: number;
		writeSpeed?: number;
		eraseSpeed?: number;
		class?: string;
	}

	let {
		phrases,
		holdDuration = 2800,
		writeSpeed = 1,
		eraseSpeed = 2.5,
		class: className = ''
	}: Props = $props();

	let phraseIndex = $state(0);
	let visible = $state(false);

	function typewriter(node: HTMLElement, { speed = 1 }: { speed?: number }) {
		const text = node.textContent ?? '';
		const duration = text.length / (speed * 0.01);

		return {
			duration,
			tick: (t: number) => {
				const i = Math.floor(text.length * t);
				node.textContent = text.slice(0, i);
			}
		};
	}

	function eraser(node: HTMLElement, { speed = 1 }: { speed?: number }) {
		const text = node.textContent ?? '';
		const duration = text.length / (speed * 0.01);

		return {
			duration,
			tick: (t: number) => {
				const i = Math.floor(text.length * t);
				node.textContent = text.slice(0, i);
			}
		};
	}

	function onIntroEnd() {
		setTimeout(() => {
			visible = false;
		}, holdDuration);
	}

	function onOutroEnd() {
		phraseIndex = (phraseIndex + 1) % phrases.length;
		visible = true;
	}

	onMount(() => {
		visible = true;
	});
</script>

{#if visible}
	<span
		class="pointer-events-none inline font-hand select-none {className}"
		in:typewriter={{ speed: writeSpeed }}
		out:eraser={{ speed: eraseSpeed }}
		onintroend={onIntroEnd}
		onoutroend={onOutroEnd}
	>
		{phrases[phraseIndex]}
	</span>
{/if}
