import type { PostMetadata } from '$lib/types/writing';
import type { Component } from 'svelte';

interface PostModule {
	default: Component;
	metadata: Omit<PostMetadata, 'slug'>;
}

const modules = import.meta.glob<PostModule>('/src/content/writing/*.svx', { eager: true });

function slugFromPath(path: string): string {
	return path.replace('/src/content/writing/', '').replace('.svx', '');
}

export function getAllPosts(): PostMetadata[] {
	return Object.entries(modules)
		.map(([path, mod]) => ({
			...mod.metadata,
			slug: slugFromPath(path)
		}))
		.filter((post) => post.published)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(
	slug: string
): { metadata: PostMetadata; component: Component } | undefined {
	const entry = Object.entries(modules).find(([path]) => slugFromPath(path) === slug);
	if (!entry) return undefined;
	const [path, mod] = entry;
	if (!mod.metadata.published) return undefined;
	return {
		metadata: { ...mod.metadata, slug: slugFromPath(path) },
		component: mod.default
	};
}

export function getPostsByTag(tag: string): PostMetadata[] {
	return getAllPosts().filter((post) => post.tags.includes(tag));
}

export function getPostsByCategory(category: string): PostMetadata[] {
	return getAllPosts().filter((post) => post.category === category);
}

export function getPostsBySeries(seriesName: string): PostMetadata[] {
	return getAllPosts()
		.filter((post) => post.series?.name === seriesName)
		.sort((a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0));
}

export function getAllTags(): { name: string; count: number }[] {
	const tagMap = new Map<string, number>();
	for (const post of getAllPosts()) {
		for (const tag of post.tags) {
			tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
		}
	}
	return Array.from(tagMap, ([name, count]) => ({ name, count })).sort((a, b) =>
		a.name.localeCompare(b.name)
	);
}

export function getAllCategories(): { name: string; count: number }[] {
	const catMap = new Map<string, number>();
	for (const post of getAllPosts()) {
		catMap.set(post.category, (catMap.get(post.category) ?? 0) + 1);
	}
	return Array.from(catMap, ([name, count]) => ({ name, count })).sort((a, b) =>
		a.name.localeCompare(b.name)
	);
}

export function getAllSeries(): { name: string; count: number }[] {
	const seriesMap = new Map<string, number>();
	for (const post of getAllPosts()) {
		if (post.series) {
			seriesMap.set(post.series.name, (seriesMap.get(post.series.name) ?? 0) + 1);
		}
	}
	return Array.from(seriesMap, ([name, count]) => ({ name, count })).sort((a, b) =>
		a.name.localeCompare(b.name)
	);
}
