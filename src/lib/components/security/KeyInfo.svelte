<script lang="ts">
	import { Download } from '@lucide/svelte';
	import { DetailList, DetailItem } from '$lib/components/ui';
	import { scramble } from '$lib/actions/scramble';
	import type { KeyInfo } from '$lib/gpg/types';

	interface Props {
		keys: KeyInfo[];
	}

	let { keys }: Props = $props();
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

	function downloadAll() {
		const combined = keys.map((k) => k.armored).join('\n');
		downloadKey(combined, 'all-keys');
	}
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-6 lg:grid-cols-2">
		{#each keys as key, i}
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span
						class="font-mono text-sm text-text"
						use:scramble={{
							text: hovered[i] ? key.userId : key.userId.replace(/[a-zA-Z0-9]/g, '*'),
							speed: 15,
							scramble: 1
						}}
						onmouseenter={() => (hovered[i] = true)}
						onmouseleave={() => (hovered[i] = false)}
					></span>
					<button
						onclick={() => downloadKey(key.armored, key.keyId)}
						class="text-muted transition-colors hover:text-accent"
						title="Download key"
					>
						<Download size={12} />
					</button>
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
	<button
		onclick={downloadAll}
		class="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-accent"
	>
		<Download size={12} />
		Download all keys
	</button>
</div>
