import { buildFeed } from '$lib/feed';

export const prerender = true;

export const GET = () => new Response(buildFeed().atom1());
