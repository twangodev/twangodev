/**
 * The standard interface a writing component implements to expose a clean,
 * agent-readable representation of itself.
 *
 * A component opts in by exporting `agentText` from its `<script module>` block.
 * The markdown pipeline ({@link toMarkdown}) discovers these exports and calls
 * them when it encounters the component's tag; the same output is surfaced as a
 * visually-hidden / aria fallback in the rendered page. Components that don't
 * export `agentText` are gracefully unwrapped to their inner content.
 */
export interface AgentTextContext {
	/** Literal attributes parsed from the component tag (string/boolean only). */
	props: Record<string, string | boolean>;
	/** Inner markdown for paired tags, e.g. the body of `<Fn>…</Fn>`. */
	content: string;
	/**
	 * Register a footnote and get back its inline marker (e.g. `[^1]`). Document
	 * footnote numbering and collection are owned by the pipeline, not the
	 * component — the component only declares "I am a footnote with this body".
	 */
	footnote(body: string): string;
}

export type AgentText = (ctx: AgentTextContext) => string;
