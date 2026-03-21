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

/** Convert degrees to km */
export function degToKm(deg: number): number {
  return deg * KM_PER_DEGREE;
}

// ---------------------------------------------------------------------------
// Bounding box helpers
// ---------------------------------------------------------------------------

/** Check if a point is inside a bounding box [minLat, maxLat, minLng, maxLng] */
export function pointInBbox(
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
export function getGeoBbox(geoJSON: {
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
// Formatting — altitude, speed, heading, time
// ---------------------------------------------------------------------------

/** Format altitude in meters for display. e.g. 10000 → "10,000 m (32,808 ft)" */
export function formatAltitude(meters: number): string {
  const ft = Math.round(meters * 3.28084);
  return `${Math.round(meters).toLocaleString()} m (${ft.toLocaleString()} ft)`;
}

/**
 * Format satellite altitude in km for display.
 * e.g. 400 → "400 km (LEO)"
 */
export function formatSatAltitude(km: number): string {
  const orbitClass = getOrbitClass(km);
  return `${km.toLocaleString()} km (${orbitClass})`;
}

/** Format speed in m/s for display. e.g. 250 → "250 m/s (486 kts)" */
export function formatSpeed(ms: number): string {
  const kts = Math.round(ms * 1.94384);
  return `${Math.round(ms).toLocaleString()} m/s (${kts.toLocaleString()} kts)`;
}

/** Format satellite velocity in km/s. e.g. 7.66 → "7.66 km/s (27,576 km/h)" */
export function formatSatVelocity(kms: number): string {
  const kmh = Math.round(kms * 3600);
  return `${kms.toFixed(2)} km/s (${kmh.toLocaleString()} km/h)`;
}

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

/** Format elapsed time since epoch ms. e.g. "2 min ago", "5 sec ago", "1 hr ago" */
export function timeAgo(epochMs: number): string {
  const diffMs = Date.now() - epochMs;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr} hr ago`;
}

/** Convert epoch ms to readable UTC time string. e.g. "14:32:07 UTC" */
export function formatUtcTime(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/** Clamp a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// ---------------------------------------------------------------------------
// Great circle path
// ---------------------------------------------------------------------------

/**
 * Calculate a great circle path between two points.
 * Returns an array of [lat, lng] tuples with `steps` intermediate points.
 */
export function greatCirclePath(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  steps = 50
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const λ1 = toRad(lng1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lng2);

  // Angular distance
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
      )
    );

  const path: [number, number][] = [];
  const n = Math.max(steps, 2);

  for (let i = 0; i <= n; i++) {
    const f = i / n;

    if (d < 1e-10) {
      // Points are essentially the same
      path.push([lat1, lng1]);
      continue;
    }

    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λ = Math.atan2(y, x);

    path.push([toDeg(φ), toDeg(λ)]);
  }

  return path;
}

// ---------------------------------------------------------------------------
// Satellite elevation angle
// ---------------------------------------------------------------------------

/**
 * Calculate the elevation angle (degrees above horizon) from a ground point
 * to a satellite given its sub-satellite lat/lng and altitude in km.
 */
export function elevationAngle(
  groundLat: number,
  groundLng: number,
  satLat: number,
  satLng: number,
  satAltKm: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;

  // Central angle between ground point and sub-satellite point
  const dLat = toRad(satLat - groundLat);
  const dLng = toRad(satLng - groundLng);
  const φ1 = toRad(groundLat);
  const φ2 = toRad(satLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLng / 2) ** 2;
  const centralAngle = 2 * Math.asin(Math.sqrt(a)); // radians

  const Re = EARTH_RADIUS_KM;
  const Rs = Re + satAltKm;

  // Elevation angle formula
  // el = atan((cos(centralAngle) - Re/Rs) / sin(centralAngle))
  if (centralAngle < 1e-10) return 90;

  return (
    Math.atan2(Math.cos(centralAngle) - Re / Rs, Math.sin(centralAngle)) *
    (180 / Math.PI)
  );
}
