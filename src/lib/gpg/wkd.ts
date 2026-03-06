import { createHash } from 'crypto';

const Z_BASE_32 = 'ybndrfg8ejkmcpqxot1uwisza345h769';

function zBase32Encode(data: Uint8Array): string {
	let bits = 0;
	let value = 0;
	let result = '';
	for (const byte of data) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			result += Z_BASE_32[(value >>> bits) & 0x1f];
		}
	}
	if (bits > 0) {
		result += Z_BASE_32[(value << (5 - bits)) & 0x1f];
	}
	return result;
}

export function wkdHash(localPart: string): string {
	const sha1 = createHash('sha1').update(localPart.toLowerCase()).digest();
	return zBase32Encode(new Uint8Array(sha1));
}
