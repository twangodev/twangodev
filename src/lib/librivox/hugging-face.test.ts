import { describe, expect, it } from 'vitest';
import {
	huggingFaceBookShardUrl,
	huggingFaceBooksTreeUrl,
	huggingFaceDatasetUrl,
	huggingFaceSyncStateUrl,
	parseHuggingFaceDatasetRevision,
	parseHuggingFaceBookShards,
	parseLibrivoxRepositoryStats
} from './hugging-face';

describe('Hugging Face LibriVox source', () => {
	it('points at the mirror book indexes', () => {
		expect(huggingFaceDatasetUrl()).toBe(
			'https://huggingface.co/api/datasets/twangodev/librivox-mirror'
		);
		expect(huggingFaceBooksTreeUrl()).toBe(
			'https://huggingface.co/api/datasets/twangodev/librivox-mirror/tree/main/metadata/books'
		);
		expect(huggingFaceBookShardUrl('metadata/books/002.parquet', 'abc123')).toBe(
			'https://huggingface.co/datasets/twangodev/librivox-mirror/resolve/abc123/metadata/books/002.parquet'
		);
		expect(huggingFaceSyncStateUrl('abc123')).toBe(
			'https://huggingface.co/datasets/twangodev/librivox-mirror/resolve/abc123/state/sync.json'
		);
	});

	it('validates the dataset revision used to pin every shard read', () => {
		expect(
			parseHuggingFaceDatasetRevision({
				sha: 'fc4759bf04378b29f8643e4bc0a73ee0f16071eb',
				lastModified: '2026-09-01T16:19:00.000Z',
				usedStorage: 7_579_909_966_450
			})
		).toEqual({
			sha: 'fc4759bf04378b29f8643e4bc0a73ee0f16071eb',
			lastModified: '2026-09-01T16:19:00.000Z',
			usedStorage: 7_579_909_966_450
		});
		expect(() => parseHuggingFaceDatasetRevision({ sha: 'main' })).toThrow();
	});

	it('derives repository totals from the versioned sync state', () => {
		expect(
			parseLibrivoxRepositoryStats({
				published_books: 21_644,
				published_sections: 491_026,
				audio_seconds_by_language: { English: 100, French: 25 }
			})
		).toEqual({ totalAudioSeconds: 125, totalBooks: 21_644, totalSegments: 491_026 });
		expect(() =>
			parseLibrivoxRepositoryStats({
				published_books: 1,
				published_sections: 1,
				audio_seconds_by_language: { English: -1 }
			})
		).toThrow();
	});

	it('validates and sorts Parquet shard entries', () => {
		expect(
			parseHuggingFaceBookShards([
				{ type: 'file', path: 'metadata/books/010.parquet', size: 200 },
				{ type: 'directory', path: 'metadata/books/nope', size: 10 },
				{ type: 'file', path: 'metadata/sections/001.parquet', size: 300 },
				{ type: 'file', path: 'metadata/books/002.parquet', size: 100 }
			])
		).toEqual([
			{ path: 'metadata/books/002.parquet', size: 100 },
			{ path: 'metadata/books/010.parquet', size: 200 }
		]);
	});

	it('rejects a tree without book shards', () => {
		expect(() => parseHuggingFaceBookShards({})).toThrow();
		expect(() => parseHuggingFaceBookShards([])).toThrow();
	});
});
