// AIS Marine Vessel Tracking Service
// Fetches live vessel data from backend proxy; returns empty on failure (retry hook handles reconnection).

import { throwIfRateLimited } from './rateLimitError';

interface ShipEntity {
  mmsi: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  course: number;
  type: 'cargo' | 'tanker' | 'military' | 'warship' | 'passenger' | 'fishing' | 'tug' | 'research' | 'other';
  length?: number;
  destination?: string;
  trail: [number, number][];
  lastContact: number;
}

interface ConflictZone {
  id: string;
  geoJSON: { type: string; geometry: { coordinates: unknown } };
}

// === TRAIL MANAGEMENT ===

const MAX_TRAIL_POINTS = 15;
const shipTrails = new Map<string, [number, number][]>();

function updateTrail(mmsi: string, lat: number, lng: number): [number, number][] {
  const existing = shipTrails.get(mmsi) ?? [];
  const updated: [number, number][] = ([...existing, [lat, lng] as [number, number]] as [number, number][]).slice(-MAX_TRAIL_POINTS);
  shipTrails.set(mmsi, updated);
  return updated;
}

// === TYPE DETECTION ===

function detectShipType(
  name: string,
  mmsi: string,
  country: string,
  vesselTypeCode?: number,
): ShipEntity['type'] {
  if (!name) return 'other';
  const n = name.toUpperCase();

  // Warship detection
  if (mmsi.startsWith('338') && country === 'United States' && n.includes('USS')) return 'warship';
  if (n.startsWith('USS ') || n.startsWith('HMS ') || n.startsWith('FS ') || n.startsWith('INS ')) return 'warship';
  if (n.includes('WARSHIP') || n.includes('DESTROYER') || n.includes('FRIGATE') ||
      n.includes('CARRIER') || n.includes('CORVETTE') || n.includes('SUBMARINE')) return 'warship';

  // Cargo
  if (n.includes('CONTAINER') || n.includes('CARGO') || n.includes('MAERSK') ||
      n.includes('EVER ') || n.includes('MSC ') || n.includes('CMA CGM')) return 'cargo';

  // Tanker
  if (n.includes('TANKER') || n.includes('CRUDE') || n.includes('LNG') ||
      n.includes('VLCC') || n.includes('AFRAMAX') || n.includes('SUEZMAX')) return 'tanker';

  // Passenger
  if (n.includes('CRUISE') || n.includes('FERRY') || n.includes('PASSENGER')) return 'passenger';

  // Fishing
  if (n.includes('FISH') || n.includes('TRAWL')) return 'fishing';

  // Tug
  if (n.includes('TUG') || n.includes('SALVAGE')) return 'tug';

  // Research
  if (n.includes('RESEARCH') || n.includes('SURVEY') || n.includes('EXPLORER')) return 'research';

  // Fall back to AIS vessel type code
  if (vesselTypeCode !== undefined) {
    if (vesselTypeCode >= 70 && vesselTypeCode <= 79) return 'cargo';
    if (vesselTypeCode >= 80 && vesselTypeCode <= 89) return 'tanker';
    if (vesselTypeCode >= 60 && vesselTypeCode <= 69) return 'passenger';
    if (vesselTypeCode >= 35 && vesselTypeCode <= 37) return 'military';
    if (vesselTypeCode >= 30 && vesselTypeCode <= 39) return 'fishing';
    if (vesselTypeCode === 52) return 'tug';
  }

  return 'other';
}

// === API FETCH ===

export async function fetchShips(): Promise<ShipEntity[]> {
  try {
    const res = await fetch('/api/ais/vessels', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    throwIfRateLimited(res, 'AIS');

    if (!res.ok) {
      throw new Error(`AIS proxy returned ${res.status}`);
    }

    const data = await res.json() as unknown[];

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Normalise API response shape — adjust field names to match proxy contract
    return data.reduce<ShipEntity[]>((acc, raw) => {
      const r = raw as Record<string, unknown>;
      const mmsi = String(r['mmsi'] ?? r['MMSI'] ?? '000000000');
      const name = String(r['name'] ?? r['shipname'] ?? r['NAME'] ?? 'UNKNOWN');
      const country = String(r['country'] ?? r['flag_country'] ?? '');
      const flag = String(r['flag'] ?? r['flag_code'] ?? 'XX');
      const lat = Number(r['lat'] ?? r['latitude'] ?? undefined);
      const lng = Number(r['lon'] ?? r['lng'] ?? r['longitude'] ?? undefined);

      // Skip ships with invalid coordinates
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return acc;
      }

      const rawSpeed = Number(r['speed'] ?? r['sog'] ?? 0);
      const rawHeading = Number(r['heading'] ?? r['hdg'] ?? r['cog'] ?? 0);
      const rawCourse = Number(r['course'] ?? r['cog'] ?? rawHeading);
      const speed = isNaN(rawSpeed) ? 0 : rawSpeed;
      const heading = isNaN(rawHeading) ? 0 : rawHeading;
      const course = isNaN(rawCourse) ? 0 : rawCourse;
      const length = r['length'] != null ? Number(r['length']) : undefined;
      const destination = r['destination'] != null ? String(r['destination']) : undefined;
      const vesselTypeCode = r['type_code'] != null ? Number(r['type_code']) : undefined;
      const type = detectShipType(name, mmsi, country, vesselTypeCode);
      const trail = updateTrail(mmsi, lat, lng);

      acc.push({
        mmsi, name, country, flag, lat, lng,
        speed, heading, course, type, trail,
        length, destination,
        lastContact: Date.now(),
      });
      return acc;
    }, []);

  } catch (err) {
    console.warn('[AIS] Offline — will retry. Reason:', (err as Error).message);
    return [];
  }
}

// === UTILITY EXPORTS ===

export function getWarships(ships: ShipEntity[]): ShipEntity[] {
  return ships.filter((s) => s.type === 'warship' || s.type === 'military');
}

export function getShipsNearConflicts(
  ships: ShipEntity[],
  zones: ConflictZone[],
): ShipEntity[] {
  return ships.filter((ship) =>
    zones.some((zone) => isNearZone(ship.lat, ship.lng, zone)),
  );
}

// Simple bounding-box proximity check against a conflict zone's GeoJSON geometry.
// Handles Polygon and MultiPolygon coordinate arrays.
function isNearZone(lat: number, lng: number, zone: ConflictZone): boolean {
  const BUFFER_DEG = 2.0; // ~220 km buffer
  try {
    const coords = zone.geoJSON?.geometry?.coordinates;
    if (!coords) return false;
    const flat = flattenCoords(coords as number[] | unknown[]);
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (let i = 0; i < flat.length - 1; i += 2) {
      const pLng = flat[i];
      const pLat = flat[i + 1];
      if (pLat < minLat) minLat = pLat;
      if (pLat > maxLat) maxLat = pLat;
      if (pLng < minLng) minLng = pLng;
      if (pLng > maxLng) maxLng = pLng;
    }
    return (
      lat >= minLat - BUFFER_DEG &&
      lat <= maxLat + BUFFER_DEG &&
      lng >= minLng - BUFFER_DEG &&
      lng <= maxLng + BUFFER_DEG
    );
  } catch {
    return false;
  }
}

function flattenCoords(coords: number[] | unknown[]): number[] {
  const out: number[] = [];
  function recurse(c: unknown): void {
    if (Array.isArray(c)) {
      if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
        out.push(c[0] as number, c[1] as number);
      } else {
        c.forEach(recurse);
      }
    }
  }
  recurse(coords);
  return out;
}
