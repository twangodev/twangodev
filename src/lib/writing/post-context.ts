import { getContext, setContext } from 'svelte';
import type { PostMetadata } from '$lib/types/writing';

const POST_METADATA_KEY = Symbol('post-metadata');

type PostMetadataGetter = () => PostMetadata;

export function setPostMetadataContext(getMetadata: PostMetadataGetter): void {
	setContext(POST_METADATA_KEY, getMetadata);
}

export function getPostMetadataContext(): PostMetadataGetter | undefined {
	return getContext<PostMetadataGetter | undefined>(POST_METADATA_KEY);
}
