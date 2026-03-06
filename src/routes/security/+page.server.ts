import { fetchArmoredKeys, getAllKeyInfo } from '$lib/gpg/key';

export const load = async () => {
	const sources = await fetchArmoredKeys();
	const keys = await getAllKeyInfo(sources);

	return { keys };
};
