export const LANE_WIDTH = 24;
export const MAIN_X = 12;
export const ROW_HEIGHT = 36;
export const CURVE_HEIGHT = 28;
export const DOT_RADIUS = 5;
export const COMMIT_DOT_RADIUS = 4;
export const LINE_WIDTH = 2;
export const SPACER_HEIGHT = ROW_HEIGHT;

export function laneX(lane: number): number {
	return MAIN_X + lane * LANE_WIDTH;
}

export function graphWidth(laneCount: number): number {
	return MAIN_X + laneCount * LANE_WIDTH + 8;
}
