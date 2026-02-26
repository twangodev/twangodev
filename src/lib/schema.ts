import type { WithContext, WebSite, Person, BlogPosting, BreadcrumbList } from 'schema-dts';
import { site } from '$lib/config';
import type { PostMetadata } from '$lib/types/writing';

export function websiteSchema(): WithContext<WebSite> {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: site.name,
		url: site.url
	};
}

export function personSchema(): WithContext<Person> {
	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: site.author.name,
		url: site.author.url,
		sameAs: [site.author.github, site.author.linkedin, site.author.x]
	};
}

export function articleSchema(post: PostMetadata): WithContext<BlogPosting> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.description,
		datePublished: post.date,
		...(post.updated && { dateModified: post.updated }),
		author: {
			'@type': 'Person',
			name: site.author.name,
			url: site.author.url
		},
		url: `${site.url}/writing/${post.slug}`,
		keywords: post.tags.join(', ')
	};
}

export function breadcrumbSchema(
	items: { name: string; url: string }[]
): WithContext<BreadcrumbList> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, i) => ({
			'@type': 'ListItem' as const,
			position: i + 1,
			name: item.name,
			item: `${site.url}${item.url}`
		}))
	};
}
