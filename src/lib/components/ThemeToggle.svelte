<script lang="ts">
	import { toggleMode, mode } from 'mode-watcher';
	import { Sun, Moon } from '@lucide/svelte';
	import LightModeChallenge from './LightModeChallenge.svelte';

	const Icon = $derived(mode.current === 'light' ? Moon : Sun);
	const label = $derived(mode.current === 'light' ? 'Switch to dark mode' : 'Switch to light mode');

	let showChallenge = $state(false);
	const CHALLENGE_KEY = 'light-mode-challenge-completed';

	function handleClick() {
		if (mode.current === 'dark') {
			if (typeof localStorage !== 'undefined' && localStorage.getItem(CHALLENGE_KEY)) {
				toggleMode();
			} else {
				showChallenge = true;
			}
		} else {
			toggleMode();
		}
	}
</script>

<button
	onclick={handleClick}
	title={label}
	aria-label={label}
	class="cursor-pointer transition-colors hover:text-text"
>
	<Icon size={14} strokeWidth={1.5} />
</button>

<LightModeChallenge
	bind:open={showChallenge}
	onconfirm={() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(CHALLENGE_KEY, 'true');
		}
		toggleMode();
		// Delay close to let mode-watcher's requestAnimationFrame-based
		// DOM update complete before the dialog transition starts
		setTimeout(() => {
			showChallenge = false;
		}, 50);
	}}
/>
