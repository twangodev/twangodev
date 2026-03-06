import * as openpgp from 'openpgp';
import type { KeyInfo, SubkeyInfo } from './types';

interface KeySource {
	url: string;
	owned: boolean;
}

const GPG_KEY_SOURCES: KeySource[] = [
	{ url: 'https://github.com/twangodev.gpg', owned: true },
	{ url: 'https://github.com/web-flow.gpg', owned: false }
];

export async function fetchArmoredKeys(): Promise<{ armored: string; owned: boolean }[]> {
	return Promise.all(
		GPG_KEY_SOURCES.map(async ({ url, owned }) => {
			const response = await fetch(url);
			if (!response.ok)
				throw new Error(`Failed to fetch GPG key from ${url}: ${response.statusText}`);
			return { armored: await response.text(), owned };
		})
	);
}

export function combineArmoredKeys(sources: { armored: string }[]): string {
	return sources.map((s) => s.armored).join('\n');
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

const FLAG_LABELS: [number, string][] = [
	[openpgp.enums.keyFlags.certifyKeys, 'Certify'],
	[openpgp.enums.keyFlags.signData, 'Sign'],
	[openpgp.enums.keyFlags.encryptCommunication, 'Encrypt'],
	[openpgp.enums.keyFlags.encryptStorage, 'Encrypt'],
	[openpgp.enums.keyFlags.authentication, 'Authenticate']
];

function parseKeyFlags(flags: number[]): string[] {
	if (!flags.length) return [];
	const f = flags[0];
	return [...new Set(FLAG_LABELS.filter(([bit]) => f & bit).map(([, label]) => label))];
}

function formatAlgorithm(info: openpgp.AlgorithmInfo): string {
	const name = ALGORITHM_NAMES[info.algorithm] ?? info.algorithm;
	const bits = 'bits' in info ? ` ${info.bits}` : '';
	return `${name}${bits}`;
}

async function extractKeyInfo(key: openpgp.PublicKey, owned: boolean): Promise<KeyInfo> {
	const primaryKey = key.keyPacket;
	const fingerprint = key.getFingerprint().toUpperCase();
	const keyId = key.getKeyID().toHex().toUpperCase();
	const algorithm = formatAlgorithm(primaryKey.getAlgorithmInfo());
	const created = primaryKey.created;
	const userIds = key.users.map((u) => u.userID?.userID).filter((id): id is string => !!id);
	const armored = key.armor();

	const expiration = await key.getExpirationTime();
	const expires = expiration === Infinity ? 'Never' : new Date(expiration as Date).toISOString();

	const subkeys: SubkeyInfo[] = key.subkeys.map((sub) => ({
		keyId: sub.getKeyID().toHex().toUpperCase(),
		algorithm: formatAlgorithm(sub.keyPacket.getAlgorithmInfo()),
		created: sub.keyPacket.created,
		usage: parseKeyFlags([...(sub.bindingSignatures[0]?.keyFlags ?? [])])
	}));

	return { fingerprint, keyId, algorithm, created, expires, userIds, armored, subkeys, owned };
}

export async function getAllKeyInfo(
	sources: { armored: string; owned: boolean }[]
): Promise<KeyInfo[]> {
	const results = await Promise.all(
		sources.map(async ({ armored, owned }) => {
			const keys = await openpgp.readKeys({ armoredKeys: armored });
			return Promise.all(keys.map((key) => extractKeyInfo(key, owned)));
		})
	);
	return results.flat();
}
