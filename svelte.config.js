import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
			layout: {
				writing: join(__dirname, 'src/lib/components/writing/PostLayout.svelte'),
				experience: join(__dirname, 'src/lib/components/experience/ExperienceLayout.svelte')
			}
		})
	],
	extensions: ['.svelte', '.svx']
};

export default config;
