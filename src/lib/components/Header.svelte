<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { Row, Logo, Link, LinkGroup } from './ui';
</script>

{#snippet writing()}
	<Link href="/writing" class="text-muted">writing</Link>
{/snippet}

{#snippet experience()}
	<Link href="/experience" class="text-muted">experience</Link>
{/snippet}

{#snippet flights()}
	<Link href="/flights" class="text-muted">flights</Link>
{/snippet}

<header>
	<Row align="center" justify="between" class="font-mono text-sm tracking-wide">
		<Logo size="sm" href="/" />
		<Row align="center" class="gap-8">
			<LinkGroup items={[writing, experience, flights]} />
			<ThemeToggle />
		</Row>
	</Row>
</header>
