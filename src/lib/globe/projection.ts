export interface ScreenPoint {
	x: number;
	y: number;
	depth: number;
}

/**
 * Project a lat/lng coordinate to screen pixel coordinates,
 * matching cobe's orthographic projection and rotation math.
 *
 * `radius` defaults to 1 (globe surface). Values > 1 project
 * points above the surface (e.g., 1.1 = 10% above).
 *
 * Returns null if the point is occluded by the globe.
 */
export function latLngToScreen(
	lat: number,
	lng: number,
	phi: number,
	theta: number,
	width: number,
	height: number,
	radius: number = 1,
	scale: number = 1
): ScreenPoint | null {
	// Convert to radians (cobe applies a -π offset to longitude)
	const latRad = (lat * Math.PI) / 180;
	const lngRad = (lng * Math.PI) / 180 - Math.PI;

	// Unit sphere direction (cobe's convention)
	const cosLat = Math.cos(latRad);
	const dx = -cosLat * Math.cos(lngRad);
	const dy = Math.sin(latRad);
	const dz = cosLat * Math.sin(lngRad);

	// Scale by radius to get actual 3D position
	const wx = dx * radius;
	const wy = dy * radius;
	const wz = dz * radius;

	// Inverse rotation: J(theta, phi)^T (orthogonal → transpose = inverse)
	const cp = Math.cos(phi),
		sp = Math.sin(phi);
	const ct = Math.cos(theta),
		st = Math.sin(theta);

	const vx = wx * cp + wz * sp;
	const vy = wx * sp * st + wy * ct + wz * (-cp * st);
	const vz = wx * (-sp * ct) + wy * st + wz * (cp * ct);

	// Occlusion check against the unit sphere (orthographic projection).
	// A ray from (vx, vy, +∞) → (vx, vy, vz) is blocked by the globe
	// if it intersects the unit sphere and the surface is in front of the point.
	const projR2 = vx * vx + vy * vy;
	if (projR2 <= 1) {
		// Ray hits the globe — point must be in front of the surface
		const surfaceZ = Math.sqrt(1 - projR2);
		if (vz < surfaceZ) return null;
	}
	// If projR2 > 1, the point projects outside the globe disk — always visible

	// Cobe's globe radius in NDC is 0.8
	const globeRadius = 0.8;
	const size = Math.min(width, height);
	const cx = width / 2;
	const cy = height / 2;

	// Aspect ratio: cobe does a.x *= width/height in the shader
	// In view-space, vx is in aspect-corrected coords, so undo it
	const aspect = width / height;
	const screenX = cx + (vx / aspect) * globeRadius * scale * (size / 2);
	// Y is flipped (WebGL → canvas 2D)
	const screenY = cy - vy * globeRadius * scale * (size / 2);

	// Depth normalized: use the unit-direction lz for fade (0 at limb, 1 at center)
	const lz = dx * (-sp * ct) + dy * st + dz * (cp * ct);
	return { x: screenX, y: screenY, depth: Math.max(0, lz) };
}

/**
 * Spherical linear interpolation (slerp) along the great circle
 * between two lat/lng points. Returns [lat, lng] in degrees.
 */
export function interpolateGreatCircle(
	from: [number, number],
	to: [number, number],
	t: number
): [number, number] {
	const phi1 = (from[0] * Math.PI) / 180,
		lam1 = (from[1] * Math.PI) / 180;
	const phi2 = (to[0] * Math.PI) / 180,
		lam2 = (to[1] * Math.PI) / 180;

	// Angular distance
	const cosd =
		Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(lam2 - lam1);
	const d = Math.acos(Math.min(1, Math.max(-1, cosd)));

	// Degenerate case — points are the same (or antipodal)
	if (d < 1e-6) return [from[0], from[1]];

	const sinD = Math.sin(d);
	const a = Math.sin((1 - t) * d) / sinD;
	const b = Math.sin(t * d) / sinD;

	const x = a * Math.cos(phi1) * Math.cos(lam1) + b * Math.cos(phi2) * Math.cos(lam2);
	const y = a * Math.cos(phi1) * Math.sin(lam1) + b * Math.cos(phi2) * Math.sin(lam2);
	const z = a * Math.sin(phi1) + b * Math.sin(phi2);

	return [
		(Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI,
		(Math.atan2(y, x) * 180) / Math.PI
	];
}

export interface Arc {
	from: [number, number]; // [lat, lng]
	to: [number, number]; // [lat, lng]
}

/**
 * Compute the angular distance (radians) between two lat/lng points.
 */
function angularDistance(from: [number, number], to: [number, number]): number {
	const phi1 = (from[0] * Math.PI) / 180,
		lam1 = (from[1] * Math.PI) / 180;
	const phi2 = (to[0] * Math.PI) / 180,
		lam2 = (to[1] * Math.PI) / 180;
	const cosd =
		Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(lam2 - lam1);
	return Math.acos(Math.min(1, Math.max(-1, cosd)));
}

/**
 * Project a great-circle arc to screen coordinates with parabolic altitude.
 * Points lift off the globe surface, peaking at the midpoint — like a flight path.
 * Returns an array of (ScreenPoint | null), where null means occluded by the globe.
 */
export function projectArc(
	arc: Arc,
	phi: number,
	theta: number,
	width: number,
	height: number,
	steps: number = 60,
	scale: number = 1
): (ScreenPoint | null)[] {
	// Peak altitude scales with arc length — longer flights arc higher
	const dist = angularDistance(arc.from, arc.to);
	const peakAlt = 0.68 * (dist / Math.PI);

	const points: (ScreenPoint | null)[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const [lat, lng] = interpolateGreatCircle(arc.from, arc.to, t);
		// Parabolic altitude: 0 at endpoints, peaks at midpoint
		const altitude = peakAlt * 4 * t * (1 - t);
		points.push(latLngToScreen(lat, lng, phi, theta, width, height, 1 + altitude, scale));
	}
	return points;
}

/** 3D world-space point with pre-computed inverse radius for depth. */
export interface ArcPoint3D {
	wx: number;
	wy: number;
	wz: number;
	invRadius: number;
}

/**
 * Pre-compute rotation-independent 3D Cartesian coordinates for an arc's
 * sample points. Call once per arc at init time; reuse the result every frame.
 */
export function precomputeArcPoints(arc: Arc, steps: number = 60): ArcPoint3D[] {
	const dist = angularDistance(arc.from, arc.to);
	const peakAlt = 0.68 * (dist / Math.PI);

	const points: ArcPoint3D[] = new Array(steps + 1);
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const [lat, lng] = interpolateGreatCircle(arc.from, arc.to, t);
		const altitude = peakAlt * 4 * t * (1 - t);
		const radius = 1 + altitude;

		const latRad = (lat * Math.PI) / 180;
		const lngRad = (lng * Math.PI) / 180 - Math.PI;
		const cosLat = Math.cos(latRad);

		points[i] = {
			wx: -cosLat * Math.cos(lngRad) * radius,
			wy: Math.sin(latRad) * radius,
			wz: cosLat * Math.sin(lngRad) * radius,
			invRadius: 1 / radius
		};
	}
	return points;
}

/**
 * Project pre-computed 3D arc points to screen coordinates using the
 * current rotation. Writes into `buffer` to avoid per-frame allocations.
 */
export function projectPrecomputedArc(
	points3D: ArcPoint3D[],
	cp: number,
	sp: number,
	ct: number,
	st: number,
	width: number,
	height: number,
	buffer: (ScreenPoint | null)[]
): void {
	const globeRadius = 0.8;
	const size = Math.min(width, height);
	const cx = width / 2;
	const cy = height / 2;
	const halfSize = globeRadius * (size / 2);
	const invAspect = height / width;

	for (let i = 0; i < points3D.length; i++) {
		const p = points3D[i];

		const vx = p.wx * cp + p.wz * sp;
		const vy = p.wx * sp * st + p.wy * ct + p.wz * (-cp * st);
		const vz = p.wx * (-sp * ct) + p.wy * st + p.wz * (cp * ct);

		const projR2 = vx * vx + vy * vy;
		if (projR2 <= 1) {
			const surfaceZ = Math.sqrt(1 - projR2);
			if (vz < surfaceZ) {
				buffer[i] = null;
				continue;
			}
		}

		const screenX = cx + vx * invAspect * halfSize;
		const screenY = cy - vy * halfSize;
		const depth = Math.max(0, vz * p.invRadius);

		const existing = buffer[i];
		if (existing !== null && existing !== undefined) {
			existing.x = screenX;
			existing.y = screenY;
			existing.depth = depth;
		} else {
			buffer[i] = { x: screenX, y: screenY, depth };
		}
	}
}
