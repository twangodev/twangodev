export interface PostSeries {
	name: string;
	order: number;
}

export interface PostMetadata {
	title: string;
	description: string;
	date: string;
	updated?: string;
	published: boolean;
	tags: string[];
	category: string;
	series?: PostSeries;
	slug: string;
}
