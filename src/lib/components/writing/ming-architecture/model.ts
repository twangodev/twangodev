import type { GridView } from './navigation';
export const variants = {
	tiny: {
		label: 'Tiny',
		layers: 24,
		dense: 1,
		experts: 128,
		attentionGroup: 4,
		retained: [5, 10, 15, 18, 20, 21, 22]
	},
	flash: {
		label: 'Flash',
		layers: 42,
		dense: 2,
		experts: 512,
		attentionGroup: 6,
		retained: [] as number[]
	}
};
export type Variant = keyof typeof variants;
export type Precision = 'nvfp4' | 'bf16' | 'source';
export const precisionLabels: Record<Precision, string> = {
	nvfp4: 'NVFP4 experts',
	bf16: 'BF16 experts',
	source: 'Original precision'
};
export function precision(variant: Variant, layer: number): Precision {
	const model = variants[variant];
	if (layer < model.dense) return 'source';
	return model.retained.includes(layer) ? 'bf16' : 'nvfp4';
}

export interface SceneProps {
	view: GridView;
	dark: boolean;
	reducedMotion: boolean;
	visible: boolean;
	onopen: (id: string) => void;
	onpreview: (id: string | null) => void;
	onready: () => void;
}
