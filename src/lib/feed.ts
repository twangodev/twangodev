import { Feed } from 'feed';
import { site } from '$lib/config';
import { getAllPosts } from '$lib/writing';

const escapeHtml = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildFeed(): Feed {
	const siteUrl = site.url;
	const posts = getAllPosts();
	const author = { name: site.author.name, email: site.author.email, link: siteUrl };

	const feed = new Feed({
		title: 'twango.dev',
		description: 'Writing from twango.dev',
		id: `${siteUrl}/writing`,
		link: `${siteUrl}/writing`,
		language: site.language,
		copyright: `All rights reserved, ${site.author.name}`,
		updated: posts.length > 0 ? new Date(posts[0].date) : new Date(),
		generator: 'feed (SvelteKit)',
		feedLinks: {
			rss: `${siteUrl}/rss.xml`,
			atom: `${siteUrl}/atom.xml`,
			json: `${siteUrl}/feed.json`
		},
		author
	});

	for (const post of posts) {
		const url = `${siteUrl}/writing/${post.slug}`;
		feed.addItem({
			title: post.title,
			id: url,
			link: url,
			date: new Date(post.date),
			published: new Date(post.date),
			description: post.description,
			content: `<p>${escapeHtml(post.description)}</p>\n<p><a href="${url}">Read on twango.dev →</a></p>`,
			author: [author],
			category: [{ name: post.category }, ...post.tags.map((t) => ({ name: t }))]
		});
	}

	return feed;
}
