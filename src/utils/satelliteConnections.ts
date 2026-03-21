/**
 * satelliteConnections.ts — Satellite-to-ground arc connection utilities
 *
 * Calculates which satellites are "overhead" or connected to specific ground
 * points (conflict zones, GPS jamming hotspots) and produces arc/ring data
 * suitable for globe arc-layer renderers.
 *
 * All types are defined inline; no external project imports are required.
 */

// ---------------------------------------------------------------------------
// Inline type mirrors (kept in sync with src/types/index.ts)
// ---------------------------------------------------------------------------

interface SatelliteEntity {
  id: string;
  name: string;
  category:
    | 'military'
    | 'navigation'
    | 'commercial'
    | 'weather'
    | 'starlink'
    | 'spy'
    | 'reconnaissance'
    | 'iss'
    | 'other';
  country: string;
  lat: number;
  lng: number;
  alt: number;            // km above Earth surface
  velocity: number;       // km/s
  heading: number;        // degrees 0-360
  tle1: string;
  tle2: string;
  footprintRadius: number; // km ground coverage radius
  isActive: boolean;
  groundTrack: [number, number][];
  lastUpdated: number;    // epoch ms
}

interface ConflictZone {
  id: string;
  name: string;
  countries: string[];
  startDate: string;
  status: 'active' | 'ceasefire' | 'escalating' | 'de-escalating';
  intensity: 'low' | 'medium' | 'high' | 'critical';
  parties: string[];
  casualties: {
    total?: number;
    military?: number;
    civilian?: number;
    displaced?: number;
  };
  geoJSON: {
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: unknown;
    };
    properties?: Record<string, unknown>;
  };
  frontlineGeoJSON?: {
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: unknown;
    };
    properties?: Record<string, unknown>;
  };
  events: unknown[];
  description: string;
  color: string;
}

interface GpsJamCell {
  lat: number;
  lng: number;
  level: number;   // 0-1 interference intensity
  radius: number;  // affected radius in km
  date: string;
  confirmed: boolean;
  type: 'spoofing' | 'jamming' | 'unknown';
  source?: string;
}

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ArcConnection {
  startLat: number;
  startLng: number;
  startAlt: number;   // satellite altitude in globe units (alt / 6371)
  endLat: number;
  endLng: number;
  endAlt: number;     // 0 for ground
  color: string;
  label: string;
  type: 'surveillance' | 'navigation' | 'communications' | 'weather' | 'gps-jam';
}

export interface FootprintRing {
  lat: number;
  lng: number;
  maxR: number;   // radius in degrees
  color: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

/** km → degrees (approximate, mean Earth radius) */
function kmToDeg(km: number): number {
  return (km / (Math.PI * EARTH_RADIUS_KM)) * 180;
}

/** Haversine distance between two lat/lng points in km */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// Footprint ring color by category
// ---------------------------------------------------------------------------

const FOOTPRINT_COLORS: Record<string, string> = {
  military:       'rgba(255, 68,  68,  0.25)',
  spy:            'rgba(255, 100,  0,  0.20)',
  reconnaissance: 'rgba(255, 140,  0,  0.20)',
  navigation:     'rgba(80,  200, 255, 0.20)',
  weather:        'rgba(100, 220, 100, 0.20)',
  starlink:       'rgba(160, 160, 255, 0.15)',
  iss:            'rgba(255, 220,  80, 0.25)',
  commercial:     'rgba(200, 200, 200, 0.15)',
  other:          'rgba(160, 160, 160, 0.12)',
};

function footprintColorForCategory(category: string): string {
  return FOOTPRINT_COLORS[category] ?? FOOTPRINT_COLORS['other'];
}

// ---------------------------------------------------------------------------
// Internal helper: getConflictCenter
// ---------------------------------------------------------------------------

/**
 * Returns the geographic center [lat, lng] of a ConflictZone's GeoJSON
 * geometry.
 *
 * - Polygon  → average of outer-ring [lng, lat] vertices
 * - MultiPolygon → average of outer-ring vertices of the first polygon
 * - Fallback → [0, 0]
 */
function getConflictCenter(zone: ConflictZone): [number, number] {
  const geometry = zone.geoJSON?.geometry;
  if (!geometry) return [0, 0];

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][];
    const outerRing = rings[0];
    if (!outerRing || outerRing.length === 0) return [0, 0];

    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of outerRing) {
      sumLng += lng;
      sumLat += lat;
    }
    return [sumLat / outerRing.length, sumLng / outerRing.length];
  }

  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as number[][][][];
    const firstPoly = polys[0];
    if (!firstPoly || firstPoly.length === 0) return [0, 0];

    const outerRing = firstPoly[0];
    if (!outerRing || outerRing.length === 0) return [0, 0];

    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of outerRing) {
      sumLng += lng;
      sumLat += lat;
    }
    return [sumLat / outerRing.length, sumLng / outerRing.length];
  }

  return [0, 0];
}

// ---------------------------------------------------------------------------
// Internal helper: isSatelliteOverhead
// ---------------------------------------------------------------------------

/**
 * Returns true when the satellite's elevation angle above the horizon as seen
 * from groundLat/groundLng is at least minElevationDeg (default 10°).
 *
 * Uses the standard geometric elevation-angle formula:
 *   el = atan((cos(γ) − Re/Rs) / sin(γ))
 * where γ is the central angle between the sub-satellite point and the
 * observer.
 */
function isSatelliteOverhead(
  satLat: number,
  satLng: number,
  satAltKm: number,
  groundLat: number,
  groundLng: number,
  minElevationDeg = 10
): boolean {
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(satLat - groundLat);
  const dLng = toRad(satLng - groundLng);
  const φ1 = toRad(groundLat);
  const φ2 = toRad(satLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLng / 2) ** 2;
  const centralAngle = 2 * Math.asin(Math.sqrt(a)); // radians

  // Edge case: satellite is directly overhead
  if (centralAngle < 1e-10) return true;

  const Re = EARTH_RADIUS_KM;
  const Rs = Re + satAltKm;

  const elevationRad = Math.atan2(
    Math.cos(centralAngle) - Re / Rs,
    Math.sin(centralAngle)
  );
  const elevationDeg = elevationRad * (180 / Math.PI);

  return elevationDeg >= minElevationDeg;
}

// ---------------------------------------------------------------------------
// Exported: getMilitarySatelliteConnections
// ---------------------------------------------------------------------------

/**
 * For each military / spy / reconnaissance satellite, find the nearest active
 * conflict zone whose center lies within the satellite's footprint (or at least
 * passes the elevation-angle threshold).  Returns at most `maxConnections` arc
 * objects.
 */
export function getMilitarySatelliteConnections(
  satellites: SatelliteEntity[],
  conflictZones: ConflictZone[],
  maxConnections = 20
): ArcConnection[] {
  const MILITARY_CATEGORIES = new Set<string>(['military', 'spy', 'reconnaissance']);

  const eligible = satellites.filter(
    (s) => s.isActive && MILITARY_CATEGORIES.has(s.category)
  );

  const arcs: ArcConnection[] = [];

  for (const sat of eligible) {
    if (arcs.length >= maxConnections) break;

    let bestZone: ConflictZone | null = null;
    let bestDist = Infinity;

    for (const zone of conflictZones) {
      const [cLat, cLng] = getConflictCenter(zone);
      if (cLat === 0 && cLng === 0) continue;

      const dist = haversineKm(sat.lat, sat.lng, cLat, cLng);

      // Primary check: zone center within satellite footprint radius
      const withinFootprint = dist <= sat.footprintRadius;
      // Secondary check: elevation angle (meaningful for high-alt satellites
      // whose footprint might be computed differently)
      const overhead = isSatelliteOverhead(sat.lat, sat.lng, sat.alt, cLat, cLng);

      if ((withinFootprint || overhead) && dist < bestDist) {
        bestDist = dist;
        bestZone = zone;
      }
    }

    if (!bestZone) continue;

    const [endLat, endLng] = getConflictCenter(bestZone);
    const arcColor =
      sat.category === 'military'
        ? 'rgba(255, 68, 68, 0.5)'
        : 'rgba(255, 100, 0, 0.4)'; // spy / reconnaissance

    arcs.push({
      startLat: sat.lat,
      startLng: sat.lng,
      startAlt: sat.alt / EARTH_RADIUS_KM,
      endLat,
      endLng,
      endAlt: 0,
      color: arcColor,
      label: `${sat.name} → ${bestZone.name}`,
      type: 'surveillance',
    });
  }

  return arcs;
}

// ---------------------------------------------------------------------------
// Exported: getSatelliteFootprints
// ---------------------------------------------------------------------------

/**
 * Returns a FootprintRing for each active satellite (optionally filtered to
 * the given categories).  The ring radius is converted from km to degrees so
 * it can be used directly by globe ring-layer renderers.
 */
export function getSatelliteFootprints(
  satellites: SatelliteEntity[],
  categories?: string[]
): FootprintRing[] {
  const categorySet = categories ? new Set(categories) : null;

  return satellites
    .filter((s) => {
      if (!s.isActive) return false;
      if (categorySet && !categorySet.has(s.category)) return false;
      return true;
    })
    .map((s) => ({
      lat: s.lat,
      lng: s.lng,
      maxR: kmToDeg(s.footprintRadius),
      color: footprintColorForCategory(s.category),
      label: `${s.name} footprint (${Math.round(s.footprintRadius).toLocaleString()} km)`,
    }));
}

// ---------------------------------------------------------------------------
// Exported: getGpsJamConnections
// ---------------------------------------------------------------------------

/**
 * For each GPS / navigation satellite, find any GPS jamming cell that lies
 * within the satellite's footprint and has a meaningful interference level
 * (> 0.3).  Returns an arc from the satellite down to the jamming cell center.
 *
 * Satellites from ALL navigation constellations (GPS, GLONASS, Galileo,
 * BeiDou) are included since they are all affected by jamming.
 */
export function getGpsJamConnections(
  satellites: SatelliteEntity[],
  gpsJamCells: GpsJamCell[]
): ArcConnection[] {
  const navSats = satellites.filter(
    (s) => s.isActive && s.category === 'navigation'
  );

  const arcs: ArcConnection[] = [];

  for (const sat of navSats) {
    for (const cell of gpsJamCells) {
      // Only connect to confirmed / significant interference sources
      if (cell.level < 0.3) continue;

      const dist = haversineKm(sat.lat, sat.lng, cell.lat, cell.lng);
      const withinFootprint = dist <= sat.footprintRadius;
      const overhead = isSatelliteOverhead(
        sat.lat,
        sat.lng,
        sat.alt,
        cell.lat,
        cell.lng
      );

      if (!withinFootprint && !overhead) continue;

      // Colour intensity scales with jam level: brighter = stronger interference
      const alpha = (0.2 + cell.level * 0.5).toFixed(2);
      const color = `rgba(255, 220, 0, ${alpha})`;

      const typeLabel = cell.type === 'spoofing' ? 'Spoofing' : 'Jamming';
      arcs.push({
        startLat: sat.lat,
        startLng: sat.lng,
        startAlt: sat.alt / EARTH_RADIUS_KM,
        endLat: cell.lat,
        endLng: cell.lng,
        endAlt: 0,
        color,
        label: `${sat.name} → GPS ${typeLabel} (${Math.round(cell.level * 100)}%)`,
        type: 'gps-jam',
      });
    }
  }

  return arcs;
}
