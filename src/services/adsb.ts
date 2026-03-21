import type { AircraftEntity, ConflictZone } from '../types';

// ── Module-scope trail store ─────────────────────────────────────────────────
const trailStore = new Map<string, [number, number, number][]>();
const MAX_TRAIL_POINTS = 20;

// ── Military callsign prefixes ───────────────────────────────────────────────
const MILITARY_PREFIXES = [
  'RCH', 'CNV', 'DUKE', 'REACH', 'RRR', 'USAF', 'ARMY', 'NAVY',
  'COBRA', 'JAKE', 'DARK', 'EVIL', 'GHOST', 'HAVOC', 'IRON', 'LANCE',
  'MAMBA', 'RAVEN', 'SAVAGE', 'TALON', 'VIPER', 'WAR',
];

// Countries whose aircraft are broadly treated as military when their callsign
// also matches a military-style pattern (numeric-only ICAO style, etc.).
const MILITARY_NATIONS = new Set([
  'United States', 'Russia', 'China', 'United Kingdom', 'France',
  'Germany', 'Israel', 'Iran', 'North Korea', 'Saudi Arabia',
  'Turkey', 'India', 'Pakistan',
]);

function isMilitaryAircraft(
  callsign: string,
  country: string,
  squawk: string | null | undefined,
): boolean {
  const cs = callsign.toUpperCase();

  // Explicit military callsign prefix
  if (MILITARY_PREFIXES.some((pfx) => cs.startsWith(pfx))) return true;

  // US aircraft squawking emergency / NORAD codes
  if (
    country === 'United States' &&
    squawk != null &&
    (squawk === '7700' || squawk === '7600')
  ) {
    return true;
  }

  // Military nation + callsign that looks like a military designator
  // (all-uppercase letters followed by digits, e.g. "DUKE01", "RCH210")
  if (MILITARY_NATIONS.has(country) && /^[A-Z]{2,6}\d{1,4}$/.test(cs)) {
    return true;
  }

  return false;
}

// ── OpenSky raw-state parser ─────────────────────────────────────────────────
function parseState(raw: (string | number | boolean | null)[]): AircraftEntity | null {
  const lat = raw[6] as number | null;
  const lng = raw[5] as number | null;

  // Drop aircraft without a valid position
  if (lat == null || lng == null) return null;

  const icao24 = (raw[0] as string) ?? '';
  const rawCallsign = raw[1] as string | null;
  const callsign = rawCallsign?.trim() || icao24;
  const country = (raw[2] as string) ?? '';
  const altitude = (raw[7] as number | null) ?? (raw[13] as number | null) ?? 0;
  const velocity = (raw[9] as number | null) ?? 0;
  const heading = (raw[10] as number | null) ?? 0;
  const verticalRate = (raw[11] as number | null) ?? 0;
  const onGround = (raw[8] as boolean) ?? false;
  const squawk = raw[14] as string | null | undefined;
  const lastContact = ((raw[4] as number) ?? 0) * 1000; // epoch ms

  // ── Trail update ──────────────────────────────────────────────────────────
  const existing = trailStore.get(icao24) ?? [];
  const updated: [number, number, number][] = ([
    ...existing,
    [lat, lng, altitude] as [number, number, number],
  ] as [number, number, number][]).slice(-MAX_TRAIL_POINTS);
  trailStore.set(icao24, updated);

  return {
    icao24,
    callsign,
    country,
    lat,
    lng,
    altitude,
    velocity,
    heading,
    verticalRate,
    onGround,
    isMilitary: isMilitaryAircraft(callsign, country, squawk),
    squawk: squawk ?? undefined,
    trail: updated,
    lastContact,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch current aircraft states from the backend proxy (which forwards to
 * the OpenSky Network API) and return parsed AircraftEntity objects.
 * Aircraft without a valid lat/lng are silently dropped.
 */
export async function fetchAircraft(): Promise<AircraftEntity[]> {
  const response = await fetch('/api/adsb/states');

  if (!response.ok) {
    throw new Error(`ADS-B fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { time: number; states: (string | number | boolean | null)[][] | null };

  if (!data.states || !Array.isArray(data.states)) return [];

  const aircraft: AircraftEntity[] = [];

  for (const raw of data.states) {
    const entity = parseState(raw);
    if (entity) aircraft.push(entity);
  }

  // Prune trails for ICAO24 addresses no longer in the feed
  const activeIds = new Set(aircraft.map((a) => a.icao24));
  for (const id of trailStore.keys()) {
    if (!activeIds.has(id)) trailStore.delete(id);
  }

  return aircraft;
}

/**
 * Return aircraft whose position falls within the given bounding box.
 */
export function getAircraftInBbox(
  aircraft: AircraftEntity[],
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): AircraftEntity[] {
  return aircraft.filter(
    (a) =>
      a.lat >= minLat &&
      a.lat <= maxLat &&
      a.lng >= minLng &&
      a.lng <= maxLng,
  );
}

/**
 * Return only aircraft flagged as military.
 */
export function getMilitaryAircraft(aircraft: AircraftEntity[]): AircraftEntity[] {
  return aircraft.filter((a) => a.isMilitary);
}

/**
 * Return aircraft located within any of the provided conflict zones.
 * Zones are tested via a simple bounding-box derived from the GeoJSON
 * coordinates array (works for Polygon / MultiPolygon).
 */
export function getAircraftNearConflicts(
  aircraft: AircraftEntity[],
  conflictZones: ConflictZone[],
): AircraftEntity[] {
  if (!conflictZones.length || !aircraft.length) return [];

  // Build a flat list of [minLat, maxLat, minLng, maxLng] bounding boxes
  const boxes = conflictZones
    .map((zone) => {
      const coords = flattenCoords(zone.geoJSON?.geometry?.coordinates);
      if (!coords.length) return null;

      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;

      for (const [lng, lat] of coords) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }

      // Expand box by ~50 km (≈ 0.45°) so nearby aircraft are included
      const BUFFER = 0.45;
      return [minLat - BUFFER, maxLat + BUFFER, minLng - BUFFER, maxLng + BUFFER] as const;
    })
    .filter((b): b is readonly [number, number, number, number] => b !== null);

  if (!boxes.length) return [];

  return aircraft.filter((a) =>
    boxes.some(
      ([minLat, maxLat, minLng, maxLng]) =>
        a.lat >= minLat && a.lat <= maxLat && a.lng >= minLng && a.lng <= maxLng,
    ),
  );
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Recursively flatten a GeoJSON coordinates tree into [lng, lat] pairs. */
function flattenCoords(coords: unknown): [number, number][] {
  if (!Array.isArray(coords)) return [];

  // [lng, lat] leaf pair
  if (
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  ) {
    return [[coords[0], coords[1]]];
  }

  return (coords as unknown[]).flatMap((c) => flattenCoords(c));
}
