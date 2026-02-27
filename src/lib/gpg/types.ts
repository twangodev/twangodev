export interface SubkeyInfo {
	keyId: string;
	algorithm: string;
	created: Date;
	usage: string[];
}

export interface KeyInfo {
	fingerprint: string;
	keyId: string;
	algorithm: string;
	created: Date;
	expires: string;
	userId: string;
	armored: string;
	subkeys: SubkeyInfo[];
}
