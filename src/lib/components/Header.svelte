<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { Row, Logo, Link, LinkGroup } from './ui';
</script>

{#snippet flights()}
	<Link href="/flights" class="text-muted">flights</Link>
{/snippet}

<header>
	<Row align="center" justify="between" class="font-mono text-sm tracking-wide">
		<Logo size="sm" href="/" />
		<Row align="center" class="gap-8">
			<LinkGroup items={[flights]} />
			<ThemeToggle />
		</Row>
	</Row>
</header>
