// === SATELLITE ===
export interface SatelliteEntity {
  id: string;           // NORAD catalog number as string
  name: string;
  category: 'military' | 'navigation' | 'commercial' | 'weather' | 'starlink' | 'spy' | 'reconnaissance' | 'iss' | 'other';
  country: string;
  lat: number;
  lng: number;
  alt: number;          // km above Earth surface
  velocity: number;     // km/s
  heading: number;      // degrees 0-360
  tle1: string;
  tle2: string;
  footprintRadius: number; // km ground coverage radius
  isActive: boolean;
  groundTrack: [number, number][]; // upcoming [lat, lng] ground track points
  lastUpdated: number;  // epoch ms
}

// === AIRCRAFT ===
export interface AircraftEntity {
  icao24: string;
  callsign: string;
  country: string;
  lat: number;
  lng: number;
  altitude: number;     // meters
  velocity: number;     // m/s
  heading: number;
  verticalRate: number;
  onGround: boolean;
  isMilitary: boolean;
  squawk?: string;
  trail: [number, number, number][]; // [lat, lng, alt] - last N positions
  lastContact: number;  // epoch ms
}

// === SHIP ===
export interface ShipEntity {
  mmsi: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  speed: number;        // knots
  heading: number;
  course: number;
  type: 'cargo' | 'tanker' | 'military' | 'warship' | 'passenger' | 'fishing' | 'tug' | 'research' | 'other';
  length?: number;
  flag: string;
  destination?: string;
  trail: [number, number][];
  lastContact: number;
}

// === CONFLICT / WAR ZONE ===
export interface ConflictEvent {
  id: string;
  date: string;
  type: 'airstrike' | 'ground-battle' | 'artillery' | 'naval' | 'drone' | 'missile' | 'explosion' | 'other';
  lat: number;
  lng: number;
  description: string;
  fatalities: number;
  source: string;
}

export interface ConflictZone {
  id: string;
  name: string;
  countries: string[];  // ISO country codes
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
  geoJSON: GeoJSONFeature;         // polygon/multipolygon of affected area
  frontlineGeoJSON?: GeoJSONFeature; // front line as LineString
  events: ConflictEvent[];
  description: string;
  color: string;        // hex color for this conflict
}

// === GPS JAMMING ===
export interface GpsJamCell {
  lat: number;
  lng: number;
  level: number;        // 0-1 interference intensity
  radius: number;       // affected radius in km
  date: string;
  confirmed: boolean;
  type: 'spoofing' | 'jamming' | 'unknown';
  source?: string;
}

// === ALERT ===
export interface Alert {
  id: string;
  type: 'gps-jam' | 'military-aircraft' | 'warship' | 'conflict-event' | 'satellite-pass' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  lat?: number;
  lng?: number;
  entityId?: string;
  timestamp: string;
  dismissed: boolean;
}

// === LAYER VISIBILITY ===
export interface LayerVisibility {
  satellites: boolean;
  satelliteOrbits: boolean;
  satelliteFootprints: boolean;
  satelliteConnections: boolean;
  aircraft: boolean;
  aircraftTrails: boolean;
  ships: boolean;
  shipTrails: boolean;
  warZones: boolean;
  conflictEvents: boolean;
  frontLines: boolean;
  gpsJam: boolean;
  atmosphere: boolean;
}

// === APP STATE (for Zustand) ===
export interface AppState {
  satellites: SatelliteEntity[];
  aircraft: AircraftEntity[];
  ships: ShipEntity[];
  conflictZones: ConflictZone[];
  gpsJamCells: GpsJamCell[];
  alerts: Alert[];
  selectedEntity: SelectedEntity | null;
  layers: LayerVisibility;
  timeOffset: number;           // minutes from now (for satellite prediction)
  isPlaying: boolean;
  playSpeed: number;            // multiplier
  lastRefresh: {
    satellites: number;
    aircraft: number;
    ships: number;
    gpsJam: number;
  };
  isLoading: {
    satellites: boolean;
    aircraft: boolean;
    ships: boolean;
    gpsJam: boolean;
  };
  errors: {
    satellites: string | null;
    aircraft: string | null;
    ships: string | null;
    gpsJam: string | null;
  };
  globeSettings: {
    atmosphereColor: string;
    showGraticules: boolean;
    showTerminator: boolean; // day/night terminator
    imageryStyle: 'satellite' | 'dark' | 'terrain';
  };
}

export interface SelectedEntity {
  type: 'satellite' | 'aircraft' | 'ship' | 'conflict' | 'event';
  id: string;
  data: SatelliteEntity | AircraftEntity | ShipEntity | ConflictZone | ConflictEvent;
}

// === GEOJSON ===
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString' | 'Point';
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
}

// === TLE DATA ===
export interface TleGroup {
  name: string;
  url: string;
  category: SatelliteEntity['category'];
  country: string;
}

// === API RESPONSES ===
export interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  time_position: number | null;
  last_contact: number;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  sensors: number[] | null;
  geo_altitude: number | null;
  squawk: string | null;
  spi: boolean;
  position_source: number;
}

export interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | null)[][];
}
