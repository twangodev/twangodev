<script lang="ts">
	import { Download, Dot, Eye, EyeClosed } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import { DetailList, DetailItem } from '$lib/components/ui';
	import { scramble } from '$lib/actions/scramble';
	import { site } from '$lib/config';
	import type { KeyInfo } from '$lib/gpg/types';

	interface Props {
		keys: KeyInfo[];
	}

	let { keys }: Props = $props();

	const siteDomain = new URL(site.url).hostname;

	function sortUserIds(userIds: string[]): string[] {
		return [...userIds].sort((a, b) => {
			const aScore = a.includes(`@${siteDomain}`) ? 0 : 1;
			const bScore = b.includes(`@${siteDomain}`) ? 0 : 1;
			return aScore - bScore;
		});
	}

	let ownedKeys = $derived(keys.filter((k) => k.owned));
	let activeTrustedKeys = $derived(
		keys.filter((k) => !k.owned && (k.expires === 'Never' || new Date(k.expires) > new Date()))
	);
	let expiredTrustedKeys = $derived(
		keys.filter((k) => !k.owned && k.expires !== 'Never' && new Date(k.expires) <= new Date())
	);
	let showExpired = $state(false);
	let expandedUids: Record<number, boolean> = $state({});

	let hovered: Record<number, boolean> = $state({});

	function formatFingerprint(fp: string): string {
		return fp.match(/.{1,4}/g)?.join(' ') ?? fp;
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function downloadKey(armored: string, keyId: string) {
		const blob = new Blob([armored], { type: 'application/pgp-keys' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${keyId}.asc`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-6 lg:grid-cols-2">
		{#each ownedKeys as key, i}
			{@const sorted = sortUserIds(key.userIds)}
			<div class="flex flex-col gap-3">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="flex flex-col gap-1"
					onmouseenter={() => (hovered[i] = true)}
					onmouseleave={() => (hovered[i] = false)}
				>
					<div class="flex items-center gap-2">
						<span
							class="font-mono text-sm text-text"
							use:scramble={{
								text: hovered[i] ? sorted[0] : sorted[0].replace(/[a-zA-Z0-9]/g, '*'),
								speed: 15,
								scramble: 1
							}}
						></span>
						<button
							onclick={() => downloadKey(key.armored, key.keyId)}
							class="text-muted transition-colors hover:text-accent"
							title="Download key"
						>
							<Download size={12} />
						</button>
						{#if sorted.length > 1}
							<button
								onclick={() => (expandedUids[i] = !expandedUids[i])}
								class="font-mono text-xs text-muted transition-colors hover:text-accent"
							>
								+{sorted.length - 1}
							</button>
						{/if}
					</div>
					{#if expandedUids[i]}
						{#each sorted.slice(1) as uid}
							<div class="flex items-center gap-2">
								<span
									class="font-mono text-sm text-text"
									use:scramble={{
										text: hovered[i] ? uid : uid.replace(/[a-zA-Z0-9]/g, '*'),
										speed: 15,
										scramble: 1
									}}
								></span>
							</div>
						{/each}
					{/if}
				</div>
				<DetailList>
					<DetailItem label="fingerprint">
						<span class="font-mono text-sm">{formatFingerprint(key.fingerprint)}</span>
					</DetailItem>
					<DetailItem label="key id">
						<span class="font-mono text-sm">{key.keyId}</span>
					</DetailItem>
					<DetailItem label="algorithm">
						<span class="font-mono text-sm">{key.algorithm}</span>
					</DetailItem>
					<DetailItem label="created">
						<span class="font-mono text-sm">{formatDate(key.created)}</span>
					</DetailItem>
					<DetailItem label="expires">
						<span class="font-mono text-sm"
							>{key.expires === 'Never' ? 'Never' : formatDate(new Date(key.expires))}</span
						>
					</DetailItem>
					<DetailItem label="subkeys">
						<span class="font-mono text-sm">{key.subkeys.length}</span>
					</DetailItem>
				</DetailList>
				{#if key.subkeys.length > 0}
					<div class="flex flex-col gap-2 border-l border-subtle pl-4">
						{#each key.subkeys as sub}
							<div class="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-xs text-muted">
								<span>{sub.keyId}</span>
								<span>{sub.algorithm}</span>
								<span>{formatDate(sub.created)}</span>
								{#if sub.usage.length > 0}
									<span>{sub.usage.join(', ')}</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if activeTrustedKeys.length > 0 || expiredTrustedKeys.length > 0}
		<div class="flex flex-col gap-2">
			<span class="font-mono text-xs text-muted">Trusted Keys</span>
			{#each activeTrustedKeys as key}
				<p class="font-mono text-xs text-muted">
					<span class="text-text">{key.userIds[0]}</span> · {key.keyId} · {key.algorithm} · {key.expires ===
					'Never'
						? 'No expiry'
						: `Expires ${formatDate(new Date(key.expires))}`}
				</p>
			{/each}
			{#if showExpired}
				{#each expiredTrustedKeys as key}
					<p class="font-mono text-xs text-muted opacity-50">
						{key.userIds[0]} · {key.keyId} · {key.algorithm} · Expired {formatDate(
							new Date(key.expires)
						)}
					</p>
				{/each}
			{/if}
		</div>
	{/if}

	<div class="flex items-center gap-4">
		<a
			href="/keys.gpg"
			download="keys.gpg"
			class="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-accent"
		>
			<Download size={12} />
			Download all keys
		</a>
		{#if expiredTrustedKeys.length > 0}
			<Dot size={12} class="text-muted" />
			<button
				onclick={() => (showExpired = !showExpired)}
				class="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-accent"
			>
				<span class="relative inline-flex" style="width: 12px; height: 12px;">
					{#key showExpired}
						<span
							class="absolute inset-0 inline-flex items-center justify-center"
							transition:fade={{ duration: 150 }}
						>
							{#if showExpired}
								<Eye size={12} />
							{:else}
								<EyeClosed size={12} />
							{/if}
						</span>
					{/key}
				</span>
				{showExpired ? 'Hide' : 'Show'}
				{expiredTrustedKeys.length} expired {expiredTrustedKeys.length === 1 ? 'key' : 'keys'}
			</button>
		{/if}
	</div>
</div>
