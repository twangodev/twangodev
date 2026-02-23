<script module lang="ts">
	declare const __BUILD_TIME__: string;
	declare const __COMMIT_HASH__: string;
</script>

<script lang="ts">
	import { Row, Stack, Logo, Text, Link, LinkGroup, StatusBadge } from './ui';
	import { scramble } from '$lib/actions/scramble';

	const buildDate = new Date(__BUILD_TIME__);
	const formattedStr = buildDate.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const isoStr = __BUILD_TIME__.replace(/\.\d{3}Z$/, 'Z');
	const commitHash = __COMMIT_HASH__;

	const maxLen = Math.max(isoStr.length, formattedStr.length);
	let buildHovered = $state(false);
</script>

{#snippet license()}
	<Link href="https://github.com/twangodev/twangodev/blob/main/LICENSE">AGPL-3.0</Link>
{/snippet}
{#snippet built()}
	<Link
		href={commitHash
			? `https://github.com/twangodev/twangodev/commit/${commitHash}`
			: 'https://github.com/twangodev/twangodev'}
		icon={false}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="inline-flex"
			onmouseenter={() => (buildHovered = true)}
			onmouseleave={() => (buildHovered = false)}
		>
			{#if commitHash}{commitHash} @&nbsp;{/if}<span
				use:scramble={{ text: buildHovered ? formattedStr : isoStr }}
				style="display: inline-block; min-width: {maxLen}ch"
			></span>
		</span>
	</Link>
{/snippet}
{#snippet github()}
	<Link href="https://github.com/twangodev">github</Link>
{/snippet}
{#snippet linkedin()}
	<Link href="https://linkedin.com/in/jamesding365">linkedin</Link>
{/snippet}
{#snippet x()}
	<Link href="https://x.com/twangodev">x</Link>
{/snippet}
{#snippet email()}
	<Link href="mailto:james@twango.dev">email</Link>
{/snippet}
{#snippet status()}
	<Link href="https://status.twango.dev" icon={false} class="inline-flex items-center gap-2">
		<StatusBadge />
		service status
	</Link>
{/snippet}
{#snippet security()}
	<Link href="/security">security</Link>
{/snippet}
{#snippet twangodev()}
	<Text as="span" variant="muted" size="xs">twango.dev</Text>
{/snippet}
{#snippet rss()}
	<Link href="/rss.xml">rss</Link>
{/snippet}

<footer>
	<Row justify="between" align="end" class="font-mono text-xs tracking-wide text-muted">
		<Stack gap="md">
			<Row gap="sm" align="baseline">
				<Logo size="lg" />
				<LinkGroup items={[twangodev, rss]} />
			</Row>
			<LinkGroup items={[license, built]} />
		</Stack>
		<Stack gap="md" align="end">
			<LinkGroup items={[github, linkedin, x, email]} />
			<LinkGroup items={[status, security]} />
		</Stack>
	</Row>
</footer>
