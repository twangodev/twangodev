<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';

	interface Stage {
		label: string;
		sub: string;
		where?: 'host' | 'client';
	}

	interface Hop {
		label: string;
		rpc?: boolean;
	}

	const local: { stages: Stage[]; hops: Hop[] } = {
		stages: [
			{ label: 'media file', sub: 'audio or video on disk' },
			{
				label: 'loopback server',
				sub: '127.0.0.1:PORT/$token · CORS · Accept-Ranges · 206'
			},
			{ label: 'JCEF <video>', sub: 'in-process Chromium · seeks like the web' }
		],
		hops: [{ label: 'FileByteSource' }, { label: 'HTTP Range request' }]
	};

	const remote: { stages: Stage[]; hops: Hop[] } = {
		stages: [
			{ label: 'media file', sub: 'on the remote host', where: 'host' },
			{
				label: 'MediaAccessor · @Rpc',
				sub: 'readRange · streamFileBytes · Flow<ByteArray>',
				where: 'host'
			},
			{
				label: 'loopback server',
				sub: '127.0.0.1:PORT/$token · CORS · 206',
				where: 'client'
			},
			{ label: 'JCEF <video>', sub: 'in-process Chromium, on the client', where: 'client' }
		],
		hops: [
			{ label: 'seek + read' },
			{ label: 'bytes over the RD wire', rpc: true },
			{ label: 'HTTP Range request' }
		]
	};

	const paths = { local, remote } as const;

	export const agentText: AgentText = () =>
		[
			"Jetplay's media byte path, in two deployment modes (repo https://github.com/twangodev/jetplay):",
			'',
			'**Local** (desktop IDE, JCEF runs in-process on the same machine as the file):',
			'media file → FileByteSource → loopback server on 127.0.0.1 (CORS + HTTP Range + 206 Partial Content) → JCEF <video>.',
			'The loopback server exists because the null-origin JCEF page cannot fetch file://, and file:// has no Range support, so the player cannot seek.',
			'',
			'**Remote Dev** (JetBrains Client + remote host; JCEF runs client-side, the file lives on the host):',
			'media file (host) → MediaAccessor @Rpc, readRange / streamFileBytes / Flow<ByteArray> → [RPC boundary] → loopback server (client) → JCEF <video> (client).',
			'The client runs its own loopback server; every byte range it serves is fetched from the host over RPC.'
		].join('\n');
</script>

<script lang="ts">
	let mode = $state<'local' | 'remote'>('local');
	const path = $derived(paths[mode]);
</script>

<figure class="not-prose my-8">
	<div
		role="group"
		aria-label="Deployment mode"
		class="mb-6 inline-flex rounded-sm border border-subtle p-0.5 font-mono text-xs"
	>
		<button
			type="button"
			aria-pressed={mode === 'local'}
			onclick={() => (mode = 'local')}
			class="rounded-[2px] px-3 py-1 tracking-tight transition-colors {mode === 'local'
				? 'bg-surface text-text'
				: 'text-muted hover:text-text'}"
		>
			Local IDE
		</button>
		<button
			type="button"
			aria-pressed={mode === 'remote'}
			onclick={() => (mode = 'remote')}
			class="rounded-[2px] px-3 py-1 tracking-tight transition-colors {mode === 'remote'
				? 'bg-surface text-text'
				: 'text-muted hover:text-text'}"
		>
			Remote Dev
		</button>
	</div>

	<div class="mx-auto grid max-w-md" style="grid-template-columns: auto minmax(0, 1fr);">
		{#each path.stages as stage, i (mode + stage.label)}
			{#if mode === 'remote' && (i === 0 || stage.where !== path.stages[i - 1].where)}
				<div
					style="grid-row: {2 * i + 1}; grid-column: 1;"
					class="self-center pr-3 font-mono text-[0.65rem] font-semibold tracking-[0.18em] text-muted uppercase"
				>
					{stage.where}
				</div>
			{/if}

			<div
				style="grid-row: {2 * i + 1}; grid-column: 2;"
				class="rounded-sm border border-subtle bg-surface/40 px-4 py-3"
			>
				<div class="font-mono text-xs leading-none font-semibold tracking-tight text-text">
					{stage.label}
				</div>
				<div class="mt-1.5 font-mono text-xs leading-tight tracking-wide text-muted">
					{stage.sub}
				</div>
			</div>

			{#if i < path.hops.length}
				{@const hop = path.hops[i]}
				<div
					style="grid-row: {2 * i + 2}; grid-column: 2;"
					class="relative flex h-14 w-full items-center justify-center"
					aria-hidden="true"
				>
					<svg
						class="absolute inset-0 h-full w-full {hop.rpc ? 'text-accent' : 'text-muted/60'}"
						viewBox="0 0 2 100"
						preserveAspectRatio="none"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					>
						<line
							class="flow"
							x1="1"
							y1="0"
							x2="1"
							y2="100"
							vector-effect="non-scaling-stroke"
							stroke-dasharray="4 5"
						/>
					</svg>
					<span
						class="relative rounded-sm bg-surface px-2 py-0.5 text-center font-mono text-[0.7rem] leading-tight tracking-wide text-balance {hop.rpc
							? 'text-accent'
							: 'text-muted'}"
					>
						{hop.label}
					</span>
				</div>
			{/if}
		{/each}
	</div>

	<figcaption class="mt-5 text-sm leading-relaxed text-muted">
		How a byte range gets from the file to the <code>&lt;video&gt;</code> tag.
		<strong>Local</strong>: a loopback server hands seekable bytes to the in-process browser.
		<strong>Remote Dev</strong>: the browser's on the client and the file's on the host, so the client's
		loopback server pulls each range from the host over <code>@Rpc</code>.
	</figcaption>
</figure>

<style>
	.flow {
		animation: flow 1.1s linear infinite;
	}

	@keyframes flow {
		to {
			stroke-dashoffset: -9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flow {
			animation: none;
		}
	}
</style>
