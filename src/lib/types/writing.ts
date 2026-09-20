export interface PostSeries {
	name: string;
	order: number;
}

export interface PostDataset {
	name: string;
	description: string;
	sameAs: string;
	creator: { name: string; url: string };
	license: string;
	isAccessibleForFree: boolean;
	encodingFormat: string[];
	isBasedOn: string[];
	includedInDataCatalog: { name: string; url: string };
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
	dataset?: PostDataset;
	slug: string;
}
