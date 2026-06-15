export interface BioDetail {
	label: string;
	value: string;
	annotation?: string;
}

export interface BioOverride {
	heading?: string;
	description?: string;
	details?: BioDetail[];
	handwriting?: string[];
}

class BioState {
	override = $state<BioOverride | null>(null);

	set(override: BioOverride): void {
		this.override = override;
	}

	clear(): void {
		this.override = null;
	}
}

export const bio = new BioState();
