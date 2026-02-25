export interface ProjectMetadata {
	name: string;
	description?: string;
	dateStart: string;
	dateEnd?: string;
	url?: string;
	logo?: string;
	tags: string[];
	published: boolean;
	color?: string;
	commits: string[];
	base: string;
	slug: string;
}
