/**
 * geoMath.ts — Geo/math utilities for world-4d-war-track
 */

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE = (Math.PI * EARTH_RADIUS_KM) / 180;

// ---------------------------------------------------------------------------
// Distance & coordinate conversion
// ---------------------------------------------------------------------------

/** Haversine distance between two lat/lng points in km */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Convert km to degrees (approximate, using mean Earth radius) */
export function kmToDeg(km: number): number {
  return km / KM_PER_DEGREE;
}

// ---------------------------------------------------------------------------
// Bounding box helpers (internal — used by pointNearConflictZone)
// ---------------------------------------------------------------------------

/** Check if a point is inside a bounding box [minLat, maxLat, minLng, maxLng] */
function pointInBbox(
  lat: number,
  lng: number,
  bbox: [number, number, number, number]
): boolean {
  const [minLat, maxLat, minLng, maxLng] = bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Get bounding box of a GeoJSON polygon (or multi-polygon) feature.
 * Returns [minLat, maxLat, minLng, maxLng] or null if geometry is unrecognised.
 */
function getGeoBbox(geoJSON: {
  geometry: { coordinates: unknown; type: string };
}): [number, number, number, number] | null {
  const { type, coordinates } = geoJSON.geometry;

  // Flatten coordinate rings down to [lng, lat] pairs
  let pairs: number[][] = [];

  if (type === 'Polygon') {
    const rings = coordinates as number[][][];
    for (const ring of rings) pairs = pairs.concat(ring);
  } else if (type === 'MultiPolygon') {
    const polys = coordinates as number[][][][];
    for (const poly of polys) for (const ring of poly) pairs = pairs.concat(ring);
  } else {
    return null;
  }

  if (pairs.length === 0) return null;

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  for (const [lng, lat] of pairs) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLat, maxLat, minLng, maxLng];
}

/**
 * Check if a point is roughly inside a GeoJSON polygon zone.
 * Uses a simple bbox check (with optional buffer) for performance.
 */
export function pointNearConflictZone(
  lat: number,
  lng: number,
  zone: { geoJSON: { geometry: { coordinates: unknown; type: string } } },
  bufferKm = 0
): boolean {
  const bbox = getGeoBbox(zone.geoJSON);
  if (!bbox) return false;

  const bufDeg = bufferKm > 0 ? kmToDeg(bufferKm) : 0;
  const expanded: [number, number, number, number] = [
    bbox[0] - bufDeg,
    bbox[1] + bufDeg,
    bbox[2] - bufDeg,
    bbox[3] + bufDeg,
  ];

  return pointInBbox(lat, lng, expanded);
}

// ---------------------------------------------------------------------------
// Orbit classification
// ---------------------------------------------------------------------------

/** Returns orbit class string for a given altitude in km */
export function getOrbitClass(altKm: number): string {
  if (altKm < 2000) return 'LEO';
  if (altKm < 35786) return 'MEO';
  if (altKm <= 35900) return 'GEO';
  return 'HEO';
}

// ---------------------------------------------------------------------------
// Formatting — heading
// ---------------------------------------------------------------------------

/** Convert heading degrees to compass direction. e.g. 45 → "NE", 180 → "S" */
export function headingToCompass(heading: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(((heading % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}
