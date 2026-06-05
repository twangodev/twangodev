import { site } from '$lib/config';
import { getAllPosts } from '$lib/writing';
import { getAllExperiences } from '$lib/experience';
import { getAllProjects } from '$lib/projects';
import type { RequestHandler } from './$types';

export const prerender = true;

const u = (path: string) => `${site.url}${path}`;

function monthYear(date: string): string {
	return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// https://llmstxt.org — a curated, LLM-friendly index of the site. Generated
// from the same sources as the sitemap/feeds so it never drifts. Posts link to
// their clean `.md` twins.
export const GET: RequestHandler = () => {
	const sections: string[] = [];

	sections.push(
		`# ${site.name}`,
		`> ${site.description}`,
		[
			`- [Website](${site.url}): home page`,
			`- [Full writing corpus](${u('/llms-full.txt')}): every post as one Markdown file`,
			`- [RSS feed](${u('/rss.xml')}): writing updates`
		].join('\n')
	);

	const posts = getAllPosts();
	if (posts.length > 0) {
		sections.push(
			'## Writing',
			posts
				.map((post) => `- [${post.title}](${u(`/writing/${post.slug}.md`)}): ${post.description}`)
				.join('\n')
		);
	}

	const experiences = getAllExperiences();
	if (experiences.length > 0) {
		sections.push(
			'## Experience',
			experiences
				.map((exp) => {
					const range = `${monthYear(exp.dateStart)} – ${exp.dateEnd ? monthYear(exp.dateEnd) : 'Present'}`;
					const link = exp.url ?? u('/experience');
					const tags = exp.tags.length > 0 ? ` · ${exp.tags.join(', ')}` : '';
					return `- [${exp.role} at ${exp.company}](${link}): ${range}${tags}`;
				})
				.join('\n')
		);
	}

	const projects = getAllProjects();
	if (projects.length > 0) {
		sections.push(
			'## Projects',
			projects.map((p) => `- [${p.name}](${p.url ?? u('/')})`).join('\n')
		);
	}

	sections.push(
		'## Pages',
		[
			`- [Writing](${u('/writing')}): all posts, with category, series, and tag indexes`,
			`- [Experience](${u('/experience')}): work history timeline`,
			`- [Flights](${u('/flights')}): flight map`,
			`- [Security](${u('/security')}): PGP key and security policy`
		].join('\n')
	);

	return new Response(sections.join('\n\n') + '\n', {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
