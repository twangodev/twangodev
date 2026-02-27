import { fetchArmoredKey, getAllKeyInfo } from '$lib/gpg/key';

export const load = async () => {
	const armoredKeys = await fetchArmoredKey();
	const keys = await getAllKeyInfo(armoredKeys);

	return { keys };
};
