export interface ExperienceMetadata {
	company: string;
	role: string;
	dateStart: string;
	dateEnd?: string;
	logo?: string;
	url?: string;
	tags: string[];
	published: boolean;
	color?: string;
	commits: string[];
	slug: string;
}
