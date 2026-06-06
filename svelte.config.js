import { mdsvex, escapeSvelte } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createHighlighter } from 'shiki';
import remarkMath from 'remark-math';
import rehypeKatexSvelte from 'rehype-katex-svelte';

const __dirname = dirname(fileURLToPath(import.meta.url));

const shikiThemes = { light: 'vitesse-light', dark: 'vitesse-dark' };

let highlighterPromise;
const getHighlighter = () =>
	(highlighterPromise ??= createHighlighter({
		themes: Object.values(shikiThemes),
		langs: ['python', 'bash', 'json']
	}));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		prerender: {
			handleHttpError: 'warn'
		}
	},
	preprocess: [
		mdsvex({
			highlight: {
				highlighter: async (code, lang = 'text') => {
					const highlighter = await getHighlighter();
					const language = highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
					const html = highlighter.codeToHtml(code, { lang: language, themes: shikiThemes });
					return escapeSvelte(html);
				}
			},
			remarkPlugins: [remarkMath],
			rehypePlugins: [rehypeKatexSvelte],
			layout: {
				writing: join(__dirname, 'src/lib/components/writing/PostLayout.svelte'),
				experience: join(__dirname, 'src/lib/components/experience/ExperienceLayout.svelte'),
				project: join(__dirname, 'src/lib/components/timeline/ProjectLayout.svelte')
			}
		})
	],
	extensions: ['.svelte', '.svx']
};

export default config;
