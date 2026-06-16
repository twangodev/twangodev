const wholeCompactMilesFormat: Intl.NumberFormatOptions = {
	notation: 'compact',
	compactDisplay: 'short',
	maximumFractionDigits: 0
};

const decimalCompactMilesFormat: Intl.NumberFormatOptions = {
	notation: 'compact',
	compactDisplay: 'short',
	maximumFractionDigits: 1
};

const wholeCompactMilesFormatter = new Intl.NumberFormat('en-US', wholeCompactMilesFormat);
const decimalCompactMilesFormatter = new Intl.NumberFormat('en-US', decimalCompactMilesFormat);

export function compactMilesFormatFor(miles: number): Intl.NumberFormatOptions {
	return Math.abs(miles) >= 1_000_000 ? decimalCompactMilesFormat : wholeCompactMilesFormat;
}

export function formatCompactMiles(miles: number): string {
	const roundedMiles = Math.round(miles);
	const formatter =
		Math.abs(roundedMiles) >= 1_000_000 ? decimalCompactMilesFormatter : wholeCompactMilesFormatter;

	return `${formatter.format(roundedMiles)} miles`;
}
