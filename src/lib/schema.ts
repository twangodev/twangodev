import type { WithContext, WebSite, Person, Blog, BlogPosting, BreadcrumbList } from 'schema-dts';
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
		jobTitle: 'Software Engineer',
		affiliation: {
			'@type': 'CollegeOrUniversity',
			name: 'University of Wisconsin–Madison',
			url: 'https://www.wisc.edu'
		},
		knowsAbout: [
			'Computer Science',
			'Machine Learning',
			'Automatic Speech Recognition',
			'Software Engineering',
			'Web Development',
			'Distributed Systems'
		],
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
		mainEntityOfPage: `${site.url}/writing/${post.slug}`,
		articleSection: post.category,
		inLanguage: site.language,
		keywords: post.tags.join(', ')
	};
}

export function blogSchema(posts: PostMetadata[]): WithContext<Blog> {
	return {
		'@context': 'https://schema.org',
		'@type': 'Blog',
		name: `${site.name} — Writing`,
		url: `${site.url}/writing`,
		inLanguage: site.language,
		author: {
			'@type': 'Person',
			name: site.author.name,
			url: site.author.url
		},
		blogPost: posts.map((post) => ({
			'@type': 'BlogPosting',
			headline: post.title,
			description: post.description,
			datePublished: post.date,
			...(post.updated && { dateModified: post.updated }),
			url: `${site.url}/writing/${post.slug}`,
			keywords: post.tags.join(', ')
		}))
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
