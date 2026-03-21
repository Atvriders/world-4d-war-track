// AIS Marine Vessel Tracking Service
// Attempts to fetch from backend proxy; falls back to realistic simulated data.

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

// === SIMULATED DATA ===

interface RawSimShip {
  mmsi: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  length?: number;
  destination?: string;
}

function buildShip(raw: RawSimShip): ShipEntity {
  const trail = updateTrail(raw.mmsi, raw.lat, raw.lng);
  const type = detectShipType(raw.name, raw.mmsi, raw.country);
  return {
    ...raw,
    course: raw.heading,
    type,
    trail,
    lastContact: Date.now() - Math.floor(Math.random() * 300_000),
  };
}

// Small helper for jittered positions so ships aren't stacked
function jitter(base: number, range: number): number {
  return base + (Math.random() * 2 - 1) * range;
}

export function generateSimulatedShips(): ShipEntity[] {
  const ships: RawSimShip[] = [

    // ── ENGLISH CHANNEL ──────────────────────────────────────────────────
    { mmsi: '244780000', name: 'MSC BEATRICE', country: 'Netherlands', flag: 'NL', lat: 51.12, lng: 1.45, speed: 16.2, heading: 240, length: 366, destination: 'ROTTERDAM' },
    { mmsi: '215678001', name: 'CMA CGM MARCO POLO', country: 'France', flag: 'FR', lat: 50.55, lng: 0.30, speed: 18.0, heading: 260, length: 396, destination: 'LE HAVRE' },
    { mmsi: '311045000', name: 'MAERSK EVORA', country: 'Bahamas', flag: 'BS', lat: 51.30, lng: 2.10, speed: 15.5, heading: 65, length: 347, destination: 'FELIXSTOWE' },
    { mmsi: '636019001', name: 'EVER GIVEN', country: 'Panama', flag: 'PA', lat: 50.80, lng: -0.20, speed: 17.1, heading: 270, length: 400, destination: 'ROTTERDAM' },
    { mmsi: '229876543', name: 'NORDIC REEFER', country: 'Malta', flag: 'MT', lat: 51.05, lng: 1.88, speed: 12.3, heading: 70, length: 190 },
    { mmsi: '247320004', name: 'ATLANTIC CARGO I', country: 'Italy', flag: 'IT', lat: 50.62, lng: 0.95, speed: 14.8, heading: 255, length: 225, destination: 'ANTWERP' },

    // ── STRAIT OF MALACCA ────────────────────────────────────────────────
    { mmsi: '563012300', name: 'PACIFIC CARRIER', country: 'Singapore', flag: 'SG', lat: 2.50, lng: 101.80, speed: 13.5, heading: 310, length: 290, destination: 'SINGAPORE' },
    { mmsi: '566345001', name: 'COSCO SHIPPING ROSE', country: 'Singapore', flag: 'SG', lat: 3.20, lng: 101.30, speed: 14.0, heading: 315, length: 360, destination: 'SHANGHAI' },
    { mmsi: '525003000', name: 'BUMI PERSADA', country: 'Indonesia', flag: 'ID', lat: 1.80, lng: 102.50, speed: 11.5, heading: 295, length: 180 },
    { mmsi: '548234000', name: 'MING ZHOU 83', country: 'Philippines', flag: 'PH', lat: 4.10, lng: 100.90, speed: 10.0, heading: 140, length: 145 },
    { mmsi: '563741000', name: 'EASTERN HORIZON CONTAINER', country: 'Singapore', flag: 'SG', lat: 2.90, lng: 101.55, speed: 15.2, heading: 320, length: 330, destination: 'PORT KLANG' },
    { mmsi: '477123456', name: 'ORIENT BRIDGE LNG', country: 'Hong Kong', flag: 'HK', lat: 1.50, lng: 103.20, speed: 16.8, heading: 290, length: 295, destination: 'TOKYO' },

    // ── SUEZ CANAL / RED SEA NORTH ───────────────────────────────────────
    { mmsi: '636091200', name: 'MSC VIRGINIA', country: 'Panama', flag: 'PA', lat: 30.10, lng: 32.55, speed: 8.5, heading: 165, length: 366, destination: 'JEDDAH' },
    { mmsi: '255815600', name: 'EVER LEGEND', country: 'Portugal', flag: 'PT', lat: 29.50, lng: 32.60, speed: 9.0, heading: 170, length: 400, destination: 'SINGAPORE' },
    { mmsi: '229100002', name: 'NORTHERN STAR CARGO', country: 'Malta', flag: 'MT', lat: 28.80, lng: 32.65, speed: 10.2, heading: 165, length: 240, destination: 'ADEN' },
    { mmsi: '356120005', name: 'HAPAG LLOYD VALPARAISO', country: 'Panama', flag: 'PA', lat: 31.20, lng: 32.40, speed: 7.5, heading: 160, length: 355, destination: 'COLOMBO' },

    // ── RED SEA / HOUTHI CONFLICT ZONE (~43-50 lng, 12-15 lat) ───────────
    { mmsi: '636900110', name: 'GALAXY LEADER', country: 'Panama', flag: 'PA', lat: 13.80, lng: 43.50, speed: 0.5, heading: 0, length: 183, destination: 'SEIZED' },
    { mmsi: '229300055', name: 'CENTRAL PARK TANKER', country: 'Malta', flag: 'MT', lat: 14.20, lng: 44.10, speed: 3.0, heading: 145, length: 190, destination: 'DJIBOUTI' },
    { mmsi: '477900300', name: 'ORIENT RUBY', country: 'Hong Kong', flag: 'HK', lat: 12.90, lng: 45.30, speed: 14.5, heading: 140, length: 230, destination: 'MUMBAI' },
    { mmsi: '563910004', name: 'SWIFT NAVIGATOR', country: 'Singapore', flag: 'SG', lat: 14.50, lng: 46.80, speed: 16.2, heading: 155, length: 220, destination: 'ADEN' },
    { mmsi: '255014000', name: 'MONTE CERVANTES CARGO', country: 'Portugal', flag: 'PT', lat: 13.40, lng: 43.90, speed: 12.8, heading: 310, length: 210, destination: 'SUEZ' },
    { mmsi: '636700234', name: 'RED SEA EXPRESS CONTAINER', country: 'Panama', flag: 'PA', lat: 15.10, lng: 48.20, speed: 11.0, heading: 175, length: 285, destination: 'DJIBOUTI' },

    // ── USS DWIGHT D. EISENHOWER CSG (Red Sea) ────────────────────────────
    { mmsi: '338000001', name: 'USS DWIGHT D EISENHOWER', country: 'United States', flag: 'US', lat: 14.80, lng: 42.50, speed: 18.5, heading: 200, length: 333 },
    { mmsi: '338000002', name: 'USS PHILIPPINE SEA', country: 'United States', flag: 'US', lat: 14.95, lng: 42.35, speed: 18.2, heading: 205, length: 173 },
    { mmsi: '338000003', name: 'USS GRAVELY', country: 'United States', flag: 'US', lat: 14.65, lng: 42.65, speed: 17.8, heading: 195, length: 155 },

    // ── USS GERALD R. FORD CSG (Eastern Mediterranean) ───────────────────
    { mmsi: '338100001', name: 'USS GERALD R FORD', country: 'United States', flag: 'US', lat: 34.20, lng: 33.80, speed: 15.0, heading: 270, length: 337 },
    { mmsi: '338100002', name: 'USS NORMANDY', country: 'United States', flag: 'US', lat: 34.35, lng: 34.00, speed: 14.8, heading: 265, length: 173 },
    { mmsi: '338100003', name: 'USS MASON', country: 'United States', flag: 'US', lat: 34.10, lng: 33.60, speed: 15.2, heading: 280, length: 155 },
    { mmsi: '338100004', name: 'USS THOMAS HUDNER', country: 'United States', flag: 'US', lat: 34.05, lng: 34.10, speed: 14.5, heading: 255, length: 155 },

    // ── HMS QUEEN ELIZABETH (Eastern Mediterranean) ───────────────────────
    { mmsi: '232003567', name: 'HMS QUEEN ELIZABETH', country: 'United Kingdom', flag: 'GB', lat: 35.10, lng: 28.50, speed: 16.0, heading: 90, length: 284 },
    { mmsi: '232004100', name: 'HMS DIAMOND', country: 'United Kingdom', flag: 'GB', lat: 35.20, lng: 28.30, speed: 15.8, heading: 95, length: 152 },
    { mmsi: '232004200', name: 'HMS KENT', country: 'United Kingdom', flag: 'GB', lat: 35.00, lng: 28.70, speed: 16.1, heading: 88, length: 152 },

    // ── BLACK SEA (Ukraine conflict zone) ────────────────────────────────
    { mmsi: '273456001', name: 'RFS MOSKVA REPLACEMENT', country: 'Russia', flag: 'RU', lat: 44.50, lng: 32.80, speed: 12.0, heading: 120, length: 186 },
    { mmsi: '273456002', name: 'RFS VASILY BYKOV', country: 'Russia', flag: 'RU', lat: 45.10, lng: 33.50, speed: 14.5, heading: 270, length: 74 },
    { mmsi: '272100001', name: 'HETMAN SAGAIDACHNY', country: 'Ukraine', flag: 'UA', lat: 46.40, lng: 31.20, speed: 0.0, heading: 0, length: 123 },
    { mmsi: '636700890', name: 'BLACK SEA CARGO EXPRESS', country: 'Panama', flag: 'PA', lat: 43.80, lng: 28.50, speed: 10.5, heading: 45, length: 175, destination: 'CONSTANTA' },
    { mmsi: '209456003', name: 'BOSPHORUS TRADER', country: 'Cyprus', flag: 'CY', lat: 43.20, lng: 29.80, speed: 9.0, heading: 225, length: 165, destination: 'ISTANBUL' },

    // ── STRAIT OF HORMUZ / PERSIAN GULF ──────────────────────────────────
    { mmsi: '311456001', name: 'NATIONAL GAS TANKER', country: 'Bahamas', flag: 'BS', lat: 26.30, lng: 56.50, speed: 11.0, heading: 300, length: 315, destination: 'FUJAIRAH' },
    { mmsi: '477456002', name: 'PACIFIC VLCC CRUDE', country: 'Hong Kong', flag: 'HK', lat: 25.80, lng: 57.20, speed: 13.5, heading: 290, length: 333, destination: 'SINGAPORE' },
    { mmsi: '636456003', name: 'GULF AFRAMAX TANKER', country: 'Panama', flag: 'PA', lat: 26.60, lng: 56.00, speed: 10.8, heading: 310, length: 248, destination: 'ROTTERDAM' },
    { mmsi: '422100001', name: 'IRAN SHAHED', country: 'Iran', flag: 'IR', lat: 26.90, lng: 55.80, speed: 8.5, heading: 180, length: 155 },
    { mmsi: '422100002', name: 'SABALAN IRGCN', country: 'Iran', flag: 'IR', lat: 27.10, lng: 56.10, speed: 12.0, heading: 270, length: 94 },
    { mmsi: '338200001', name: 'USS BATAAN', country: 'United States', flag: 'US', lat: 25.50, lng: 57.80, speed: 14.0, heading: 285, length: 257 },
    { mmsi: '338200002', name: 'USS CARTER HALL', country: 'United States', flag: 'US', lat: 25.40, lng: 58.00, speed: 13.8, heading: 280, length: 186 },
    { mmsi: '566456001', name: 'SINGAPORE SUEZMAX', country: 'Singapore', flag: 'SG', lat: 26.00, lng: 56.80, speed: 12.2, heading: 300, length: 274, destination: 'BASRA' },
    { mmsi: '229456006', name: 'HORMUZ TANKER EXPRESS', country: 'Malta', flag: 'MT', lat: 26.45, lng: 55.50, speed: 9.5, heading: 315, length: 230, destination: 'DUBAI' },

    // ── ARABIAN SEA ───────────────────────────────────────────────────────
    { mmsi: '419456001', name: 'INS VIKRAMADITYA', country: 'India', flag: 'IN', lat: 15.50, lng: 66.80, speed: 16.0, heading: 45, length: 284 },
    { mmsi: '419456002', name: 'INS SHIVALIK', country: 'India', flag: 'IN', lat: 15.70, lng: 67.00, speed: 15.8, heading: 42, length: 143 },
    { mmsi: '636900450', name: 'ARABIAN LNG CARRIER', country: 'Panama', flag: 'PA', lat: 18.20, lng: 60.50, speed: 17.0, heading: 80, length: 295, destination: 'YOKOHAMA' },
    { mmsi: '477900500', name: 'SOUTH ASIA CONTAINER SHIP', country: 'Hong Kong', flag: 'HK', lat: 14.90, lng: 64.30, speed: 14.5, heading: 65, length: 320, destination: 'COLOMBO' },

    // ── SOUTH CHINA SEA ───────────────────────────────────────────────────
    { mmsi: '413456001', name: 'CSCL PACIFIC OCEAN', country: 'China', flag: 'CN', lat: 14.50, lng: 115.20, speed: 15.0, heading: 25, length: 400, destination: 'SHANGHAI' },
    { mmsi: '413456002', name: 'COSCO SHIPPING CONTAINER', country: 'China', flag: 'CN', lat: 12.30, lng: 113.80, speed: 14.2, heading: 30, length: 366, destination: 'GUANGZHOU' },
    { mmsi: '566456007', name: 'SINGAPORE CAPE EXPRESS', country: 'Singapore', flag: 'SG', lat: 10.50, lng: 109.60, speed: 16.5, heading: 310, length: 340, destination: 'SINGAPORE' },
    { mmsi: '525456003', name: 'JAKARTA TRADING CARGO', country: 'Indonesia', flag: 'ID', lat: 8.20, lng: 108.90, speed: 11.0, heading: 200, length: 195, destination: 'JAKARTA' },
    { mmsi: '338300001', name: 'USS RONALD REAGAN', country: 'United States', flag: 'US', lat: 16.80, lng: 120.50, speed: 17.0, heading: 30, length: 333 },
    { mmsi: '338300002', name: 'USS CHANCELLORSVILLE', country: 'United States', flag: 'US', lat: 17.00, lng: 120.30, speed: 16.8, heading: 35, length: 173 },
    { mmsi: '440300001', name: 'ROKS SEJONG THE GREAT', country: 'South Korea', flag: 'KR', lat: 22.50, lng: 118.40, speed: 14.5, heading: 60, length: 166 },

    // ── STRAIT OF GIBRALTAR ───────────────────────────────────────────────
    { mmsi: '224456001', name: 'ALGECIRAS EXPRESS CONTAINER', country: 'Spain', flag: 'ES', lat: 35.95, lng: -5.60, speed: 14.0, heading: 90, length: 300, destination: 'ALGECIRAS' },
    { mmsi: '255456002', name: 'ATLANTIC TANKER I', country: 'Portugal', flag: 'PT', lat: 35.98, lng: -5.80, speed: 12.5, heading: 270, length: 250, destination: 'HOUSTON' },
    { mmsi: '229456008', name: 'MEDITERRANEAN SEA CARGO', country: 'Malta', flag: 'MT', lat: 36.02, lng: -5.40, speed: 15.0, heading: 100, length: 285, destination: 'GENOVA' },
    { mmsi: '232456001', name: 'HMS ENTERPRISE', country: 'United Kingdom', flag: 'GB', lat: 36.10, lng: -5.70, speed: 10.0, heading: 85, length: 90 },

    // ── BOSPHORUS STRAIT ─────────────────────────────────────────────────
    { mmsi: '271456001', name: 'ISTANBUL BULK CARRIER', country: 'Turkey', flag: 'TR', lat: 41.05, lng: 29.05, speed: 8.0, heading: 0, length: 190, destination: 'NOVOROSSIYSK' },
    { mmsi: '271456002', name: 'BOSPHORUS TANKER', country: 'Turkey', flag: 'TR', lat: 41.15, lng: 29.02, speed: 7.5, heading: 180, length: 220, destination: 'ISTANBUL' },
    { mmsi: '273456008', name: 'MARIUPOL GRAIN', country: 'Russia', flag: 'RU', lat: 41.20, lng: 29.08, speed: 6.0, heading: 355, length: 175 },

    // ── NORTH ATLANTIC ────────────────────────────────────────────────────
    { mmsi: '311456010', name: 'MAERSK KENTUCKY', country: 'Bahamas', flag: 'BS', lat: 45.50, lng: -35.20, speed: 20.5, heading: 255, length: 347, destination: 'NEW YORK' },
    { mmsi: '338400001', name: 'USNS COMFORT', country: 'United States', flag: 'US', lat: 38.50, lng: -65.00, speed: 12.0, heading: 180, length: 272 },
    { mmsi: '232456010', name: 'HMS PRINCE OF WALES', country: 'United Kingdom', flag: 'GB', lat: 52.30, lng: -8.50, speed: 14.0, heading: 270, length: 284 },
    { mmsi: '229456015', name: 'ATLANTIC CROSSING CARGO', country: 'Malta', flag: 'MT', lat: 42.30, lng: -20.80, speed: 18.0, heading: 280, length: 310, destination: 'ROTTERDAM' },

    // ── INDIAN OCEAN ──────────────────────────────────────────────────────
    { mmsi: '636900600', name: 'CAPE GOOD HOPE VLCC', country: 'Panama', flag: 'PA', lat: -15.50, lng: 65.20, speed: 14.0, heading: 215, length: 333, destination: 'ROTTERDAM' },
    { mmsi: '477900700', name: 'CHINA OCEAN SHIPPING CARGO', country: 'Hong Kong', flag: 'HK', lat: -5.80, lng: 73.50, speed: 16.5, heading: 55, length: 350, destination: 'SHANGHAI' },
    { mmsi: '229456020', name: 'INDIAN OCEAN LNG TANKER', country: 'Malta', flag: 'MT', lat: -10.20, lng: 68.40, speed: 15.8, heading: 295, length: 295, destination: 'BARCELONA' },
    { mmsi: '311456015', name: 'SOUTHERN CROSS CONTAINER', country: 'Bahamas', flag: 'BS', lat: -8.50, lng: 80.30, speed: 17.2, heading: 100, length: 360, destination: 'COLOMBO' },

    // ── EASTERN MEDITERRANEAN (Israel conflict area) ──────────────────────
    { mmsi: '636900720', name: 'HAIFA EXPRESS CARGO', country: 'Panama', flag: 'PA', lat: 32.80, lng: 34.90, speed: 6.5, heading: 90, length: 210, destination: 'HAIFA' },
    { mmsi: '428456001', name: 'ASHDOD CONTAINER', country: 'Israel', flag: 'IL', lat: 32.05, lng: 34.75, speed: 4.0, heading: 270, length: 185, destination: 'ASHDOD' },
    { mmsi: '516456001', name: 'ASHKELON TANKER', country: 'Australia', flag: 'AU', lat: 31.65, lng: 34.55, speed: 8.5, heading: 200, length: 200, destination: 'BEIRUT' },
    { mmsi: '229456025', name: 'CYPRUS FERRY PASSENGER', country: 'Malta', flag: 'MT', lat: 34.50, lng: 33.10, speed: 18.5, heading: 85, length: 160, destination: 'LIMASSOL' },

    // ── MISCELLANEOUS GLOBAL ──────────────────────────────────────────────
    { mmsi: '538456001', name: 'PACIFIC RESEARCH EXPLORER', country: 'Marshall Islands', flag: 'MH', lat: jitter(-5.0, 3), lng: jitter(160.0, 5), speed: 8.0, heading: 45, length: 120 },
    { mmsi: '566456020', name: 'PORT SINGAPORE TUG', country: 'Singapore', flag: 'SG', lat: 1.28, lng: 103.75, speed: 5.5, heading: 200, length: 32 },
    { mmsi: '311456020', name: 'NASSAU FISHING VESSEL', country: 'Bahamas', flag: 'BS', lat: jitter(24.0, 2), lng: jitter(-76.0, 3), speed: 4.0, heading: 120, length: 45 },
  ];

  return ships.map(buildShip);
}

// === API FETCH ===

export async function fetchShips(): Promise<ShipEntity[]> {
  try {
    const res = await fetch('/api/ais/vessels', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

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
    console.warn('[AIS] Proxy unavailable, using simulated data:', (err as Error).message);
    return generateSimulatedShips();
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
