const sources = import.meta.glob('/src/content/writing/*.svx', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export function getRawPostSource(slug: string): string | undefined {
	const entry = Object.entries(sources).find(([path]) => path.endsWith(`/${slug}.svx`));
	return entry?.[1];
}

export function getAllRawPostSources(): { slug: string; source: string }[] {
	return Object.entries(sources).map(([path, source]) => ({
		slug: path.replace('/src/content/writing/', '').replace('.svx', ''),
		source
	}));
}
