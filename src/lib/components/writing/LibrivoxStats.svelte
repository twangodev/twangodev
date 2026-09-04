<script module lang="ts">
	import type { LibrivoxActivitySnapshot } from '$lib/librivox/activity';
	import type { AgentText } from '$lib/writing/agent-text';

	declare const __LIBRIVOX_ACTIVITY__: LibrivoxActivitySnapshot;

	const integer = new Intl.NumberFormat('en-US');
	const decimal = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	const snapshot = __LIBRIVOX_ACTIVITY__;
	const summary = `${integer.format(snapshot.totalBooks)} books, ${integer.format(snapshot.totalSegments)} segments, ${integer.format(Math.floor(snapshot.totalAudioSeconds / 3600))} hours, and ${decimal.format(snapshot.storageBytes / 1_000_000_000_000)} TB`;

	export const agentText: AgentText = () => `**${summary}**`;
</script>

<strong>{summary}</strong>
