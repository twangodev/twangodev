<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { Row, Logo } from './ui';
</script>

<header>
	<Row align="center" justify="between" class="font-mono text-sm tracking-wide">
		<Logo size="sm" href="/" />
		<ThemeToggle />
	</Row>
</header>
