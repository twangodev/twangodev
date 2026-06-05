<script lang="ts">
	import { getFootnoteRegistry } from './footnotes';

	const notes = getFootnoteRegistry().notes;
</script>

{#if notes.length > 0}
	<section class="footnotes" aria-labelledby="footnotes-heading">
		<h2 id="footnotes-heading">Footnotes</h2>
		<ol>
			{#each notes as note, i (i)}
				<li id={`fn-${i + 1}`}>
					{@render note.content()}
					<a
						class="footnote-backref"
						href={`#fnref-${i + 1}`}
						aria-label={`Back to reference ${i + 1}`}>↩</a
					>
				</li>
			{/each}
		</ol>
	</section>
{/if}
