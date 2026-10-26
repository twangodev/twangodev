import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = ({ params, url }) => {
	const path = params.path.split('/').map(encodeURIComponent).join('/');
	redirect(308, `/writing${path ? `/${path}` : ''}${url.search}${url.hash}`);
};
