import * as openpgp from 'openpgp';
import type { KeyInfo, SubkeyInfo } from './types';

const GPG_KEY_URL = 'https://github.com/twangodev.gpg';

export async function fetchArmoredKey(): Promise<string> {
	const response = await fetch(GPG_KEY_URL);
	if (!response.ok) throw new Error(`Failed to fetch GPG key: ${response.statusText}`);
	return await response.text();
}

const ALGORITHM_NAMES: Record<string, string> = {
	rsaEncryptSign: 'RSA',
	rsaEncrypt: 'RSA (Encrypt)',
	rsaSign: 'RSA (Sign)',
	elgamal: 'ElGamal',
	dsa: 'DSA',
	ecdh: 'ECDH',
	ecdsa: 'ECDSA',
	eddsa: 'EdDSA',
	aedh: 'AEDH',
	aedsa: 'AEDSA'
};

function formatAlgorithm(info: openpgp.AlgorithmInfo): string {
	const name = ALGORITHM_NAMES[info.algorithm] ?? info.algorithm;
	const bits = 'bits' in info ? ` ${info.bits}` : '';
	return `${name}${bits}`;
}

async function extractKeyInfo(key: openpgp.PublicKey): Promise<KeyInfo> {
	const primaryKey = key.keyPacket;
	const fingerprint = key.getFingerprint().toUpperCase();
	const keyId = key.getKeyID().toHex().toUpperCase();
	const algorithm = formatAlgorithm(primaryKey.getAlgorithmInfo());
	const created = primaryKey.created;
	const userId = key.users[0]?.userID?.userID ?? '';
	const armored = key.armor();

	const expiration = await key.getExpirationTime();
	const expires = expiration === Infinity ? 'Never' : new Date(expiration as Date).toISOString();

	const subkeys: SubkeyInfo[] = key.subkeys.map((sub) => ({
		keyId: sub.getKeyID().toHex().toUpperCase(),
		algorithm: formatAlgorithm(sub.keyPacket.getAlgorithmInfo()),
		created: sub.keyPacket.created
	}));

	return { fingerprint, keyId, algorithm, created, expires, userId, armored, subkeys };
}

export async function getAllKeyInfo(armoredKeys: string): Promise<KeyInfo[]> {
	const keys = await openpgp.readKeys({ armoredKeys });
	return Promise.all(keys.map(extractKeyInfo));
}
