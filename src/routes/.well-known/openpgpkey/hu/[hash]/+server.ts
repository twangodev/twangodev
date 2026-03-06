import * as openpgp from 'openpgp';
import { fetchArmoredKeys } from '$lib/gpg/key';
import { wkdHash } from '$lib/gpg/wkd';
import type { EntryGenerator } from './$types';

async function getOwnedKeysByHash(): Promise<Map<string, Uint8Array>> {
	const sources = await fetchArmoredKeys();
	const map = new Map<string, Uint8Array>();

	for (const { armored, owned } of sources) {
		if (!owned) continue;
		const keys = await openpgp.readKeys({ armoredKeys: armored });
		for (const key of keys) {
			for (const user of key.users) {
				const email = user.userID?.email;
				if (!email) continue;
				const localPart = email.split('@')[0];
				const hash = wkdHash(localPart);
				map.set(hash, key.write() as Uint8Array);
			}
		}
	}

	return map;
}

export const entries: EntryGenerator = async () => {
	const map = await getOwnedKeysByHash();
	return [...map.keys()].map((hash) => ({ hash }));
};

export const prerender = true;

export const GET = async ({ params }) => {
	const map = await getOwnedKeysByHash();
	const binary = map.get(params.hash);

	if (!binary) {
		return new Response('Not found', { status: 404 });
	}

	return new Response(binary, {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
