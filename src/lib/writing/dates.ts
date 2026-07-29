function toDateOnly(value: string | undefined): string | undefined {
	if (!value) return undefined;

	const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
	if (!match) return undefined;

	const [, year, month, day] = match;
	const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
	const parsed = new Date(timestamp);
	if (
		parsed.getUTCFullYear() !== Number(year) ||
		parsed.getUTCMonth() !== Number(month) - 1 ||
		parsed.getUTCDate() !== Number(day)
	) {
		return undefined;
	}

	return `${year}-${month}-${day}`;
}

export function resolvePostUpdatedDate(
	published: string,
	gitUpdated?: string,
	frontmatterUpdated?: string
): string | undefined {
	const publishedDate = toDateOnly(published);
	const updatedDate = toDateOnly(gitUpdated) ?? toDateOnly(frontmatterUpdated);

	if (!publishedDate || !updatedDate || updatedDate <= publishedDate) return undefined;
	return updatedDate;
}

export function formatPostDate(value: string, month: 'long' | 'short' = 'long'): string {
	const date = toDateOnly(value);
	if (!date) return value;

	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month,
		day: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${date}T00:00:00Z`));
}
