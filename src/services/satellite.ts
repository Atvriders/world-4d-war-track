import * as satellite from 'satellite.js';
import type { SatelliteEntity } from '../types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SatellitePosition {
  lat: number;
  lng: number;
  alt: number;      // km
  velocity: number; // km/s
  heading: number;  // degrees 0-360
}

// ── TLE Group Configs ─────────────────────────────────────────────────────────

interface TleGroupConfig {
  group: string;
  category: SatelliteEntity['category'];
  country: string;
  limit?: number;
}

const TLE_GROUPS: TleGroupConfig[] = [
  { group: 'stations',  category: 'iss',        country: 'International' },
  { group: 'gps',       category: 'navigation',  country: 'USA' },
  { group: 'military',  category: 'military',    country: 'USA' },
  { group: 'weather',   category: 'weather',     country: 'Various' },
  { group: 'starlink',  category: 'starlink',    country: 'USA', limit: 50 },
  { group: 'active',    category: 'other',       country: 'Various', limit: 100 },
];

// ── TLE Parsing ───────────────────────────────────────────────────────────────

export interface ParsedTle {
  name: string;
  tle1: string;
  tle2: string;
}

export function parseTLE(rawText: string): ParsedTle[] {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const results: ParsedTle[] = [];
  let i = 0;

  while (i < lines.length) {
    // A TLE block is: name line, line 1 (starts with '1 '), line 2 (starts with '2 ')
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (
      name && line1 && line2 &&
      line1.startsWith('1 ') &&
      line2.startsWith('2 ') &&
      line1.length >= 69 &&
      line2.length >= 69
    ) {
      results.push({ name, tle1: line1, tle2: line2 });
      i += 3;
    } else {
      i += 1;
    }
  }

  return results;
}

// ── Satellite Propagation ─────────────────────────────────────────────────────

export function propagateSatellite(
  name: string,
  tle1: string,
  tle2: string,
  date: Date = new Date()
): SatellitePosition | null {
  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    if (satrec.error !== 0) return null;
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (
      !positionAndVelocity ||
      typeof positionAndVelocity.position === 'boolean' ||
      typeof positionAndVelocity.velocity === 'boolean'
    ) {
      return null;
    }

    const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
    const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number>;

    const gmst = satellite.gstime(date);
    const positionGd = satellite.eciToGeodetic(positionEci, gmst);

    const lat = satellite.degreesLat(positionGd.latitude);
    const lng = satellite.degreesLong(positionGd.longitude);
    const alt = positionGd.height; // km

    // Velocity magnitude in km/s
    const vx = velocityEci.x;
    const vy = velocityEci.y;
    const vz = velocityEci.z;
    const vel = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // Approximate heading from sequential positions
    const dtMs = 10000; // 10 seconds ahead
    const dateFwd = new Date(date.getTime() + dtMs);
    const pvFwd = satellite.propagate(satrec, dateFwd);

    let heading = 0;
    if (
      pvFwd &&
      typeof pvFwd.position !== 'boolean'
    ) {
      const posFwd = pvFwd.position as satellite.EciVec3<number>;
      const gmstFwd = satellite.gstime(dateFwd);
      const gdFwd = satellite.eciToGeodetic(posFwd, gmstFwd);
      const lat2 = satellite.degreesLat(gdFwd.latitude);
      const lng2 = satellite.degreesLong(gdFwd.longitude);

      const dLat = lat2 - lat;
      const dLng = lng2 - lng;
      heading = (Math.atan2(dLng * Math.cos(lat * Math.PI / 180), dLat) * 180) / Math.PI;
      if (heading < 0) heading += 360;
    }

    return { lat, lng, alt, velocity: vel, heading };
  } catch {
    return null;
  }
}

// ── Ground Track ──────────────────────────────────────────────────────────────

export function getSatelliteGroundTrack(
  tle1: string,
  tle2: string,
  minutesAhead = 90,
  stepMinutes = 2,
  baseTime: number = Date.now()
): [number, number][] {
  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    if (satrec.error !== 0) return [];
    const track: [number, number][] = [];

    for (let m = 0; m <= minutesAhead; m += stepMinutes) {
      const date = new Date(baseTime + m * 60 * 1000);
      const pv = satellite.propagate(satrec, date);

      if (!pv || typeof pv.position === 'boolean') continue;

      const posEci = pv.position as satellite.EciVec3<number>;
      const gmst = satellite.gstime(date);
      const gd = satellite.eciToGeodetic(posEci, gmst);

      track.push([
        satellite.degreesLat(gd.latitude),
        satellite.degreesLong(gd.longitude),
      ]);
    }

    return track;
  } catch {
    return [];
  }
}

// ── Footprint Radius ──────────────────────────────────────────────────────────

export function getFootprintRadius(altKm: number): number {
  const earthRadius = 6371;
  return Math.acos(earthRadius / (earthRadius + altKm)) * earthRadius;
}

// ── Categorization ────────────────────────────────────────────────────────────

export function categorizeSatellite(name: string): SatelliteEntity['category'] {
  const upper = name.toUpperCase();

  if (upper === 'ISS (ZARYA)' || upper === 'ISS') return 'iss';
  if (upper.includes('STARLINK')) return 'starlink';
  if (
    upper.includes('GPS') ||
    upper.includes('GLONASS') ||
    upper.includes('GALILEO') ||
    upper.includes('BEIDOU')
  ) return 'navigation';
  if (
    upper.includes('NOAA') ||
    upper.includes('GOES') ||
    upper.includes('METEOSAT')
  ) return 'weather';
  if (
    upper.includes('USA-') ||
    upper.includes('KH-') ||
    upper.includes('LACROSSE') ||
    upper.includes('MENTOR')
  ) return 'spy';

  return 'other';
}

// ── Extract NORAD ID from TLE line 1 ─────────────────────────────────────────

function extractNoradId(tle1: string): string {
  // Columns 3-7 (1-indexed) = index 2-6 (0-indexed), trimmed
  return tle1.substring(2, 7).trim();
}

// ── Fetch & Process a Single TLE Group ───────────────────────────────────────

export async function fetchAndProcessTleGroup(
  group: string,
  limit?: number,
  defaultCategory: SatelliteEntity['category'] = 'other',
  defaultCountry = 'Various'
): Promise<SatelliteEntity[]> {
  const url = `/api/satellites/tle?group=${group}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch TLE group "${group}": ${response.status} ${response.statusText}`);
  }

  const rawText = await response.text();
  let parsed = parseTLE(rawText);

  if (limit !== undefined) {
    parsed = parsed.slice(0, limit);
  }

  const now = Date.now();
  const entities: SatelliteEntity[] = [];

  for (const { name, tle1, tle2 } of parsed) {
    const pos = propagateSatellite(name, tle1, tle2);
    if (!pos) continue;

    const noradId = extractNoradId(tle1);
    const category = categorizeSatellite(name);
    const footprintRadius = getFootprintRadius(pos.alt);
    const groundTrack = getSatelliteGroundTrack(tle1, tle2);

    entities.push({
      id: noradId,
      name,
      category: category !== 'other' ? category : defaultCategory,
      country: defaultCountry,
      lat: pos.lat,
      lng: pos.lng,
      alt: pos.alt,
      velocity: pos.velocity,
      heading: pos.heading,
      tle1,
      tle2,
      footprintRadius,
      isActive: true,
      groundTrack,
      lastUpdated: now,
    });
  }

  return entities;
}

// ── Fetch All Satellites ──────────────────────────────────────────────────────

export async function fetchAllSatellites(): Promise<SatelliteEntity[]> {
  const groupsToFetch: TleGroupConfig[] = TLE_GROUPS.filter(g =>
    ['stations', 'gps', 'military', 'weather', 'starlink'].includes(g.group)
  );

  const results = await Promise.allSettled(
    groupsToFetch.map(cfg =>
      fetchAndProcessTleGroup(cfg.group, cfg.limit, cfg.category, cfg.country)
    )
  );

  const combined: SatelliteEntity[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const entity of result.value) {
      if (seen.has(entity.id)) continue;
      seen.add(entity.id);
      combined.push(entity);
    }
  }

  return combined;
}
