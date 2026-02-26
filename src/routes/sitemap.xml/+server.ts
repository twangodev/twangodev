import { site } from '$lib/config';
import { getAllPosts, getAllTags, getAllCategories, getAllSeries } from '$lib/writing';

export const prerender = true;

export const GET = () => {
	const posts = getAllPosts();
	const tags = getAllTags();
	const categories = getAllCategories();
	const series = getAllSeries();

	const staticPages = ['/', '/writing', '/experience', '/flights', '/security'];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map((page) => `  <url><loc>${site.url}${page}</loc></url>`).join('\n')}
${posts
	.map(
		(post) =>
			`  <url><loc>${site.url}/writing/${encodeURIComponent(post.slug)}</loc><lastmod>${post.updated ?? post.date}</lastmod></url>`
	)
	.join('\n')}
${tags.map((tag) => `  <url><loc>${site.url}/writing/tags/${encodeURIComponent(tag.name)}</loc></url>`).join('\n')}
${categories.map((cat) => `  <url><loc>${site.url}/writing/categories/${encodeURIComponent(cat.name)}</loc></url>`).join('\n')}
${series.map((s) => `  <url><loc>${site.url}/writing/series/${encodeURIComponent(s.name)}</loc></url>`).join('\n')}
</urlset>`;

	return new Response(xml.trim(), {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
