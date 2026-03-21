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
  // Guard against malformed or truncated state arrays
  if (!Array.isArray(raw) || raw.length < 15) return null;

  const lat = raw[6] as number | null;
  const lng = raw[5] as number | null;

  // Drop aircraft without a valid position
  if (lat == null || lng == null) return null;

  const icao24 = (raw[0] as string) ?? '';
  if (!icao24) return null;

  const rawCallsign = raw[1] as string | null;
  const callsign = rawCallsign?.trim() || icao24;
  const country = (raw[2] as string) ?? '';
  let altitude = Number(raw[7]) || Number(raw[13]) || 0;
  if (isNaN(altitude)) altitude = 0;
  let velocity = Number(raw[9]) || 0;
  if (isNaN(velocity)) velocity = 0;
  let heading = Number(raw[10]) || 0;
  if (isNaN(heading)) heading = 0;
  let verticalRate = Number(raw[11]) || 0;
  if (isNaN(verticalRate)) verticalRate = 0;
  const onGround = raw[8] === true;
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

// ── Simulated fallback data ──────────────────────────────────────────────────

/** Small helper for jittered positions so aircraft aren't stacked exactly. */
function jitter(base: number, range: number): number {
  return base + (Math.random() * 2 - 1) * range;
}

interface RawSimAircraft {
  icao24: string;
  callsign: string;
  country: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
  isMilitary: boolean;
  squawk?: string | null;
}

function buildSimAircraft(raw: RawSimAircraft): AircraftEntity {
  const trail: [number, number, number][] = [[raw.lat, raw.lng, raw.altitude]];
  trailStore.set(raw.icao24, trail);
  return {
    icao24: raw.icao24,
    callsign: raw.callsign,
    country: raw.country,
    lat: raw.lat,
    lng: raw.lng,
    altitude: raw.altitude,
    velocity: raw.velocity,
    heading: raw.heading,
    verticalRate: raw.verticalRate,
    onGround: raw.onGround,
    isMilitary: raw.isMilitary,
    squawk: raw.squawk ?? undefined,
    trail,
    lastContact: Date.now() - Math.floor(Math.random() * 60_000),
  };
}

/**
 * Generate ~30 realistic simulated aircraft near global conflict zones.
 * Used as a fallback when the OpenSky API / proxy is unavailable.
 */
export function generateSimulatedAircraft(): AircraftEntity[] {
  const aircraft: RawSimAircraft[] = [

    // ── MILITARY — Ukraine / Black Sea (RCH callsigns, USAF) ──────────
    { icao24: 'ae1001', callsign: 'RCH401', country: 'United States', lat: jitter(49.5, 0.5), lng: jitter(24.0, 1.0), altitude: 10668, velocity: 230, heading: 90, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },
    { icao24: 'ae1002', callsign: 'RCH892', country: 'United States', lat: jitter(50.2, 0.3), lng: jitter(22.5, 0.8), altitude: 11278, velocity: 240, heading: 105, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },
    { icao24: 'ae1003', callsign: 'RCH210', country: 'United States', lat: jitter(48.8, 0.4), lng: jitter(25.5, 0.6), altitude: 9144, velocity: 210, heading: 75, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },
    { icao24: 'ae1004', callsign: 'REACH55', country: 'United States', lat: jitter(51.0, 0.3), lng: jitter(20.0, 1.0), altitude: 12192, velocity: 250, heading: 95, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },
    { icao24: 'ae1005', callsign: 'RCH117', country: 'United States', lat: jitter(47.5, 0.5), lng: jitter(27.0, 0.5), altitude: 10363, velocity: 225, heading: 80, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },

    // ── MILITARY — Middle East (DUKE callsigns, tanker aircraft) ──────
    { icao24: 'ae2001', callsign: 'DUKE21', country: 'United States', lat: jitter(32.5, 0.5), lng: jitter(42.0, 1.0), altitude: 8534, velocity: 190, heading: 270, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },
    { icao24: 'ae2002', callsign: 'DUKE34', country: 'United States', lat: jitter(30.0, 0.4), lng: jitter(44.5, 0.8), altitude: 9144, velocity: 200, heading: 255, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },
    { icao24: 'ae2003', callsign: 'DUKE07', country: 'United States', lat: jitter(28.5, 0.3), lng: jitter(47.0, 0.6), altitude: 7620, velocity: 185, heading: 290, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },

    // ── MILITARY — Red Sea (NAVY callsigns) ───────────────────────────
    { icao24: 'ae3001', callsign: 'NAVY01', country: 'United States', lat: jitter(14.5, 0.5), lng: jitter(42.5, 0.5), altitude: 6096, velocity: 170, heading: 180, verticalRate: -2, onGround: false, isMilitary: true, squawk: null },
    { icao24: 'ae3002', callsign: 'NAVY44', country: 'United States', lat: jitter(13.8, 0.4), lng: jitter(43.2, 0.4), altitude: 5486, velocity: 160, heading: 195, verticalRate: 0, onGround: false, isMilitary: true, squawk: null },

    // ── CIVILIAN — Airliners on major routes ──────────────────────────
    { icao24: '3c6745', callsign: 'DLH438', country: 'Germany', lat: jitter(50.5, 0.5), lng: jitter(8.5, 1.0), altitude: 11582, velocity: 245, heading: 240, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '3c6746', callsign: 'DLH712', country: 'Germany', lat: jitter(47.0, 0.3), lng: jitter(15.0, 0.8), altitude: 12192, velocity: 250, heading: 120, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '896401', callsign: 'UAE512', country: 'United Arab Emirates', lat: jitter(26.0, 0.5), lng: jitter(50.5, 1.0), altitude: 11887, velocity: 255, heading: 310, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '896402', callsign: 'UAE205', country: 'United Arab Emirates', lat: jitter(35.0, 0.4), lng: jitter(40.0, 1.0), altitude: 12496, velocity: 260, heading: 300, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '4ca001', callsign: 'RYR112', country: 'Ireland', lat: jitter(48.5, 0.5), lng: jitter(2.5, 1.0), altitude: 11278, velocity: 235, heading: 200, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '406a01', callsign: 'BAW178', country: 'United Kingdom', lat: jitter(52.0, 0.3), lng: jitter(-1.0, 0.5), altitude: 10972, velocity: 240, heading: 260, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '780b01', callsign: 'CPA271', country: 'China', lat: jitter(42.0, 1.0), lng: jitter(75.0, 2.0), altitude: 12496, velocity: 260, heading: 50, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: 'a12345', callsign: 'DAL189', country: 'United States', lat: jitter(53.0, 0.5), lng: jitter(-20.0, 2.0), altitude: 11582, velocity: 250, heading: 80, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: 'a12346', callsign: 'AAL47', country: 'United States', lat: jitter(40.0, 0.5), lng: jitter(-50.0, 2.0), altitude: 11887, velocity: 252, heading: 70, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '471f01', callsign: 'THY33', country: 'Turkey', lat: jitter(39.5, 0.3), lng: jitter(32.0, 1.0), altitude: 11278, velocity: 238, heading: 135, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },

    // ── CARGO — FedEx, UPS, and freight callsigns ─────────────────────
    { icao24: 'a54001', callsign: 'FDX901', country: 'United States', lat: jitter(49.0, 0.5), lng: jitter(5.0, 1.0), altitude: 10668, velocity: 230, heading: 250, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: 'a54002', callsign: 'FDX625', country: 'United States', lat: jitter(25.5, 0.3), lng: jitter(55.0, 0.8), altitude: 11582, velocity: 242, heading: 305, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: 'a54003', callsign: 'UPS314', country: 'United States', lat: jitter(51.5, 0.4), lng: jitter(7.0, 0.8), altitude: 10363, velocity: 228, heading: 210, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: 'a54004', callsign: 'UPS877', country: 'United States', lat: jitter(33.0, 0.5), lng: jitter(45.0, 1.0), altitude: 11278, velocity: 240, heading: 275, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '4010a1', callsign: 'CLX792', country: 'Luxembourg', lat: jitter(47.5, 0.3), lng: jitter(10.0, 0.5), altitude: 10972, velocity: 235, heading: 165, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },

    // ── MISCELLANEOUS — various locations ─────────────────────────────
    { icao24: '300101', callsign: 'AFR681', country: 'France', lat: jitter(45.5, 0.5), lng: jitter(3.0, 1.0), altitude: 11887, velocity: 248, heading: 185, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '440101', callsign: 'KAL023', country: 'South Korea', lat: jitter(55.0, 1.0), lng: jitter(80.0, 3.0), altitude: 12496, velocity: 260, heading: 60, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '710101', callsign: 'ARG1135', country: 'Argentina', lat: jitter(-34.0, 0.5), lng: jitter(-58.0, 1.0), altitude: 5486, velocity: 150, heading: 340, verticalRate: 5, onGround: false, isMilitary: false, squawk: null },
    { icao24: 'e40101', callsign: 'SAA205', country: 'South Africa', lat: jitter(-1.0, 1.0), lng: jitter(36.0, 1.0), altitude: 11582, velocity: 245, heading: 175, verticalRate: 0, onGround: false, isMilitary: false, squawk: null },
    { icao24: '3e1234', callsign: 'GAF689', country: 'Germany', lat: jitter(52.5, 0.3), lng: jitter(13.5, 0.5), altitude: 3048, velocity: 120, heading: 270, verticalRate: -4, onGround: false, isMilitary: true, squawk: '7700' },
  ];

  return aircraft.map(buildSimAircraft);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch current aircraft states from the backend proxy (which forwards to
 * the OpenSky Network API) and return parsed AircraftEntity objects.
 * Aircraft without a valid lat/lng are silently dropped.
 */
export async function fetchAircraft(): Promise<AircraftEntity[]> {
  try {
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
  } catch (err) {
    console.warn('[ADS-B] Proxy unavailable, using simulated data:', (err as Error).message);
    return generateSimulatedAircraft();
  }
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
