import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';
import {
	aggregateLibrivoxActivity,
	type LibrivoxActivityItem,
	type LibrivoxActivitySnapshot
} from './activity';

export interface HuggingFaceBookShard {
	path: string;
	size: number;
}

interface HuggingFaceTreeEntry {
	path?: unknown;
	size?: unknown;
	type?: unknown;
}

interface HuggingFaceDatasetRevision {
	lastModified: string;
	sha: string;
	usedStorage: number;
}

export interface LibrivoxRepositoryStats {
	totalAudioSeconds: number;
	totalBooks: number;
	totalSegments: number;
}

const DATASET = 'twangodev/librivox-mirror';
const BOOK_SHARD = /^metadata\/books\/\d+\.parquet$/;
const MAX_PARALLEL_READS = 6;
const REQUEST_TIMEOUT_MS = 30_000;
const REVISION_SHA = /^[a-f0-9]{40}$/;

export function huggingFaceDatasetUrl(): string {
	return `https://huggingface.co/api/datasets/${DATASET}`;
}

export function huggingFaceBooksTreeUrl(revision = 'main'): string {
	return `https://huggingface.co/api/datasets/${DATASET}/tree/${encodeURIComponent(revision)}/metadata/books`;
}

export function huggingFaceBookShardUrl(path: string, revision = 'main'): string {
	return `https://huggingface.co/datasets/${DATASET}/resolve/${encodeURIComponent(revision)}/${path}`;
}

export function huggingFaceSyncStateUrl(revision = 'main'): string {
	return `https://huggingface.co/datasets/${DATASET}/resolve/${encodeURIComponent(revision)}/state/sync.json`;
}

export function parseHuggingFaceDatasetRevision(value: unknown): HuggingFaceDatasetRevision {
	if (!value || typeof value !== 'object') throw new Error('Missing Hugging Face dataset info');
	const { lastModified, sha, usedStorage } = value as {
		lastModified?: unknown;
		sha?: unknown;
		usedStorage?: unknown;
	};
	if (
		typeof sha !== 'string' ||
		!REVISION_SHA.test(sha) ||
		typeof lastModified !== 'string' ||
		!Number.isFinite(Date.parse(lastModified)) ||
		typeof usedStorage !== 'number' ||
		!Number.isSafeInteger(usedStorage) ||
		usedStorage <= 0
	) {
		throw new Error('Invalid Hugging Face dataset revision');
	}
	return { lastModified, sha, usedStorage };
}

export function parseLibrivoxRepositoryStats(value: unknown): LibrivoxRepositoryStats {
	if (!value || typeof value !== 'object') throw new Error('Missing LibriVox sync state');
	const { audio_seconds_by_language, published_books, published_sections } = value as {
		audio_seconds_by_language?: unknown;
		published_books?: unknown;
		published_sections?: unknown;
	};
	if (
		typeof published_books !== 'number' ||
		!Number.isSafeInteger(published_books) ||
		published_books <= 0 ||
		typeof published_sections !== 'number' ||
		!Number.isSafeInteger(published_sections) ||
		published_sections <= 0 ||
		!audio_seconds_by_language ||
		typeof audio_seconds_by_language !== 'object'
	) {
		throw new Error('Invalid LibriVox sync state');
	}

	const durations = Object.values(audio_seconds_by_language);
	if (
		durations.length === 0 ||
		durations.some(
			(seconds) => typeof seconds !== 'number' || !Number.isSafeInteger(seconds) || seconds < 0
		)
	) {
		throw new Error('Invalid LibriVox audio durations');
	}
	const totalAudioSeconds = (durations as number[]).reduce((sum, seconds) => sum + seconds, 0);
	if (!Number.isSafeInteger(totalAudioSeconds) || totalAudioSeconds <= 0) {
		throw new Error('Invalid LibriVox total audio duration');
	}

	return {
		totalAudioSeconds,
		totalBooks: published_books,
		totalSegments: published_sections
	};
}

export function parseHuggingFaceBookShards(value: unknown): HuggingFaceBookShard[] {
	if (!Array.isArray(value)) throw new Error('Missing Hugging Face dataset tree');

	const shards = value
		.flatMap((item): HuggingFaceBookShard[] => {
			if (!item || typeof item !== 'object') return [];
			const { path, size, type } = item as HuggingFaceTreeEntry;
			if (
				type !== 'file' ||
				typeof path !== 'string' ||
				!BOOK_SHARD.test(path) ||
				typeof size !== 'number' ||
				!Number.isSafeInteger(size) ||
				size <= 0
			) {
				return [];
			}
			return [{ path, size }];
		})
		.sort((a, b) => a.path.localeCompare(b.path));

	if (shards.length === 0) throw new Error('No Hugging Face book shards found');
	return shards;
}

function fetchWithTimeout(fetchImpl: typeof fetch): typeof fetch {
	return async (input, init) => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		const signal = init?.signal
			? AbortSignal.any([init.signal, controller.signal])
			: controller.signal;

		try {
			return await fetchImpl(input, { ...init, signal });
		} finally {
			clearTimeout(timeout);
		}
	};
}

async function readActivityItems(
	shard: HuggingFaceBookShard,
	revision: string,
	fetchImpl: typeof fetch
): Promise<LibrivoxActivityItem[]> {
	const file = await asyncBufferFromUrl({
		url: huggingFaceBookShardUrl(shard.path, revision),
		byteLength: shard.size,
		fetch: fetchImpl
	});
	const rows = await parquetReadObjects({
		file,
		columns: ['archive_metadata', 'section_count'],
		compressors
	});
	return rows.map((row) => {
		const metadata = row.archive_metadata;
		return {
			publicDate:
				metadata && typeof metadata === 'object'
					? (metadata as { publicdate?: unknown }).publicdate
					: undefined,
			segmentCount: row.section_count
		};
	});
}

export async function fetchLibrivoxActivity(
	fetchImpl: typeof fetch = fetch,
	generatedAt = new Date()
): Promise<LibrivoxActivitySnapshot> {
	const timedFetch = fetchWithTimeout(fetchImpl);
	const infoResponse = await timedFetch(huggingFaceDatasetUrl());
	if (!infoResponse.ok) throw new Error(`Hugging Face info returned HTTP ${infoResponse.status}`);
	const revision = parseHuggingFaceDatasetRevision(await infoResponse.json());

	const [treeResponse, stateResponse] = await Promise.all([
		timedFetch(huggingFaceBooksTreeUrl(revision.sha)),
		timedFetch(huggingFaceSyncStateUrl(revision.sha))
	]);
	if (!treeResponse.ok) throw new Error(`Hugging Face tree returned HTTP ${treeResponse.status}`);
	if (!stateResponse.ok)
		throw new Error(`Hugging Face state returned HTTP ${stateResponse.status}`);
	const shards = parseHuggingFaceBookShards(await treeResponse.json());
	const stats = parseLibrivoxRepositoryStats(await stateResponse.json());
	const items: LibrivoxActivityItem[] = [];

	for (let index = 0; index < shards.length; index += MAX_PARALLEL_READS) {
		const batch = shards.slice(index, index + MAX_PARALLEL_READS);
		const batchItems = await Promise.all(
			batch.map((shard) => readActivityItems(shard, revision.sha, timedFetch))
		);
		items.push(...batchItems.flat());
	}

	return {
		...aggregateLibrivoxActivity(items, generatedAt),
		...stats,
		storageBytes: revision.usedStorage
	};
}
