export interface AgentTextContext {
	props: Record<string, string | boolean>;
	content: string;
	footnote(body: string): string;
}

export type AgentText = (ctx: AgentTextContext) => string;
