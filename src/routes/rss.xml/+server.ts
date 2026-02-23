import { getAllPosts } from '$lib/writing';

export const prerender = true;

export const GET = () => {
	const posts = getAllPosts();
	const siteUrl = 'https://twango.dev';

	const items = posts
		.map(
			(post) => `
		<item>
			<title><![CDATA[${post.title}]]></title>
			<description><![CDATA[${post.description}]]></description>
			<link>${siteUrl}/writing/${post.slug}</link>
			<guid isPermaLink="true">${siteUrl}/writing/${post.slug}</guid>
			<pubDate>${new Date(post.date).toUTCString()}</pubDate>
			${post.tags.map((tag) => `<category>${tag}</category>`).join('\n\t\t\t')}
		</item>`
		)
		.join('');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>twango.dev</title>
		<description>Writing from twango.dev</description>
		<link>${siteUrl}/writing</link>
		<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
		<language>en</language>
		<lastBuildDate>${posts.length > 0 ? new Date(posts[0].date).toUTCString() : new Date().toUTCString()}</lastBuildDate>${items}
	</channel>
</rss>`;

	return new Response(xml.trim(), {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
