<script lang="ts">
	import { toggleMode, mode } from 'mode-watcher';
	import { Sun, Moon } from '@lucide/svelte';

	const Icon = $derived(mode.current === 'light' ? Moon : Sun);
	const label = $derived(mode.current === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
</script>

<button
	onclick={toggleMode}
	title={label}
	aria-label={label}
	class="cursor-pointer transition-colors hover:text-text"
>
	<Icon size={14} strokeWidth={1.5} />
</button>