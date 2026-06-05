// The interface a writing component implements (as a `<script module>` export)
// to expose a clean, agent-readable form of itself to the markdown pipeline.
export interface AgentTextContext {
	props: Record<string, string | boolean>;
	content: string;
	// Register a footnote, get back its marker; the pipeline owns numbering.
	footnote(body: string): string;
}

export type AgentText = (ctx: AgentTextContext) => string;
