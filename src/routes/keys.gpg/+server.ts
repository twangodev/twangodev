import { fetchArmoredKeys, combineArmoredKeys } from '$lib/gpg/key';

export const prerender = true;

export const GET = async () => {
	const sources = await fetchArmoredKeys();
	const armoredKeys = combineArmoredKeys(sources);

	return new Response(armoredKeys, {
		headers: {
			'Content-Type': 'application/pgp-keys',
			'Content-Disposition': 'attachment; filename="keys.gpg"',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
