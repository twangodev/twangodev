export interface BioDetail {
	label: string;
	value: string;
	annotation?: string;
}

export interface BioRouteHeading {
	from: string;
	to: string;
}

export interface BioOverride {
	heading?: string;
	headingRoute?: BioRouteHeading;
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
