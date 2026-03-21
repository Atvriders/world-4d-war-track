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

// ── Simulated Satellites (fallback when CelesTrak is unavailable) ────────────

function generateSimulatedSatellites(): SatelliteEntity[] {
  const now = Date.now();

  const sats: Omit<SatelliteEntity, 'footprintRadius' | 'lastUpdated' | 'groundTrack' | 'tle1' | 'tle2' | 'isActive'>[] = [
    // ISS
    { id: '25544', name: 'ISS (ZARYA)', lat: 12.4, lng: -47.2, alt: 408, velocity: 7.66, heading: 45, category: 'iss', country: 'International' },

    // GPS satellites
    { id: '28874', name: 'GPS BIIR-2 (PRN 13)', lat: 38.1, lng: -95.3, alt: 20200, velocity: 3.87, heading: 0, category: 'navigation', country: 'USA' },
    { id: '32260', name: 'GPS BIIR-3 (PRN 28)', lat: -15.7, lng: 42.8, alt: 20200, velocity: 3.87, heading: 180, category: 'navigation', country: 'USA' },
    { id: '40534', name: 'GPS BIIF-9 (PRN 03)', lat: 52.3, lng: 130.1, alt: 20200, velocity: 3.87, heading: 90, category: 'navigation', country: 'USA' },
    { id: '41019', name: 'GPS BIIF-11 (PRN 10)', lat: -28.4, lng: -160.5, alt: 20200, velocity: 3.87, heading: 270, category: 'navigation', country: 'USA' },

    // Military / spy satellites
    { id: '37348', name: 'USA-224 (KH-11)', lat: 34.2, lng: -118.5, alt: 340, velocity: 7.70, heading: 200, category: 'spy', country: 'USA' },
    { id: '40258', name: 'USA-245 (LACROSSE 5)', lat: -22.8, lng: 65.3, alt: 450, velocity: 7.58, heading: 15, category: 'spy', country: 'USA' },
    { id: '43941', name: 'USA-290 (MENTOR 7)', lat: 55.1, lng: -30.7, alt: 310, velocity: 7.72, heading: 330, category: 'military', country: 'USA' },

    // Starlink satellites
    { id: '53549', name: 'STARLINK-4178', lat: 40.5, lng: -74.0, alt: 550, velocity: 7.59, heading: 50, category: 'starlink', country: 'USA' },
    { id: '53550', name: 'STARLINK-4205', lat: -10.2, lng: 120.3, alt: 550, velocity: 7.59, heading: 130, category: 'starlink', country: 'USA' },
    { id: '54712', name: 'STARLINK-4890', lat: 28.7, lng: -15.8, alt: 550, velocity: 7.59, heading: 310, category: 'starlink', country: 'USA' },
    { id: '55001', name: 'STARLINK-5100', lat: -45.3, lng: 170.6, alt: 550, velocity: 7.59, heading: 220, category: 'starlink', country: 'USA' },

    // Weather satellites
    { id: '43013', name: 'NOAA-20 (JPSS-1)', lat: 62.1, lng: -140.2, alt: 824, velocity: 7.45, heading: 170, category: 'weather', country: 'USA' },
    { id: '41866', name: 'GOES-16', lat: 0.03, lng: -75.2, alt: 35786, velocity: 3.07, heading: 90, category: 'weather', country: 'USA' },

    // GLONASS satellites
    { id: '41554', name: 'GLONASS-M 751', lat: 18.5, lng: 88.4, alt: 19100, velocity: 3.95, heading: 45, category: 'navigation', country: 'Russia' },
    { id: '43508', name: 'GLONASS-M 758', lat: -35.2, lng: -22.6, alt: 19100, velocity: 3.95, heading: 225, category: 'navigation', country: 'Russia' },

    // Galileo satellites
    { id: '43564', name: 'GALILEO 23 (2E1)', lat: 25.8, lng: 10.5, alt: 23222, velocity: 3.66, heading: 60, category: 'navigation', country: 'EU' },
    { id: '43567', name: 'GALILEO 24 (2E4)', lat: -40.1, lng: -110.3, alt: 23222, velocity: 3.66, heading: 240, category: 'navigation', country: 'EU' },

    // GEO communications satellite
    { id: '37826', name: 'INTELSAT 17', lat: 0.01, lng: 66.0, alt: 35786, velocity: 3.07, heading: 90, category: 'commercial', country: 'International' },
  ];

  return sats.map(s => ({
    ...s,
    tle1: '',
    tle2: '',
    groundTrack: [] as [number, number][],
    footprintRadius: getFootprintRadius(s.alt),
    isActive: true,
    lastUpdated: now,
  }));
}

// ── Fetch All Satellites ──────────────────────────────────────────────────────

export async function fetchAllSatellites(): Promise<SatelliteEntity[]> {
  try {
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

    // If all groups failed and we got nothing, fall back to simulated
    if (combined.length === 0) {
      console.warn('[Satellites] All CelesTrak groups returned empty, using simulated data');
      return generateSimulatedSatellites();
    }

    return combined;
  } catch (err) {
    console.warn('[Satellites] CelesTrak unavailable, using simulated data:', (err as Error).message);
    return generateSimulatedSatellites();
  }
}
