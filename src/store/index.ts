import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// === INLINE INTERFACES ===

export interface SatelliteEntity {
  id: string;
  name: string;
  category: 'military' | 'navigation' | 'commercial' | 'weather' | 'starlink' | 'spy' | 'reconnaissance' | 'iss' | 'other';
  country: string;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  heading: number;
  tle1: string;
  tle2: string;
  footprintRadius: number;
  isActive: boolean;
  groundTrack: [number, number][];
  lastUpdated: number;
}

export interface AircraftEntity {
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
  squawk?: string;
  trail: [number, number, number][];
  lastContact: number;
}

export interface ShipEntity {
  mmsi: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  course: number;
  type: 'cargo' | 'tanker' | 'military' | 'warship' | 'passenger' | 'fishing' | 'tug' | 'research' | 'other';
  length?: number;
  flag: string;
  destination?: string;
  trail: [number, number][];
  lastContact: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString' | 'Point';
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
}

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
  geoJSON: GeoJSONFeature;
  frontlineGeoJSON?: GeoJSONFeature;
  events: ConflictEvent[];
  description: string;
  color: string;
}

export interface GpsJamCell {
  lat: number;
  lng: number;
  level: number;
  radius: number;
  date: string;
  confirmed: boolean;
  type: 'spoofing' | 'jamming' | 'unknown';
  source?: string;
}

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

export interface SelectedEntity {
  type: 'satellite' | 'aircraft' | 'ship' | 'conflict' | 'event';
  id: string;
  data: SatelliteEntity | AircraftEntity | ShipEntity | ConflictZone | ConflictEvent;
}

// === APP STATE ===

export interface AppState {
  // Data slices
  satellites: SatelliteEntity[];
  aircraft: AircraftEntity[];
  ships: ShipEntity[];
  conflictZones: ConflictZone[];
  gpsJamCells: GpsJamCell[];
  alerts: Alert[];

  // UI state
  selectedEntity: SelectedEntity | null;
  layers: LayerVisibility;

  // Playback / time
  timeOffset: number;
  isPlaying: boolean;
  playSpeed: number;

  // Fetch metadata
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

  // Globe appearance
  globeSettings: {
    atmosphereColor: string;
    showGraticules: boolean;
    showTerminator: boolean;
    imageryStyle: 'satellite' | 'dark' | 'terrain';
  };

  // Actions
  setSatellites: (sats: SatelliteEntity[]) => void;
  setAircraft: (aircraft: AircraftEntity[]) => void;
  setShips: (ships: ShipEntity[]) => void;
  setConflictZones: (zones: ConflictZone[]) => void;
  setGpsJamCells: (cells: GpsJamCell[]) => void;
  addAlert: (alert: Alert) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  setSelectedEntity: (entity: SelectedEntity | null) => void;
  toggleLayer: (key: keyof LayerVisibility) => void;
  setLayerVisibility: (key: keyof LayerVisibility, visible: boolean) => void;
  setTimeOffset: (offset: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  setLoading: (key: keyof AppState['isLoading'], val: boolean) => void;
  setError: (key: keyof AppState['errors'], err: string | null) => void;
  setLastRefresh: (key: keyof AppState['lastRefresh']) => void;
  updateGlobeSettings: (settings: Partial<AppState['globeSettings']>) => void;
}

// === DEFAULT VALUES ===

const DEFAULT_LAYERS: LayerVisibility = {
  satellites: true,
  satelliteOrbits: false,
  satelliteFootprints: false,
  satelliteConnections: true,
  aircraft: true,
  aircraftTrails: true,
  ships: true,
  shipTrails: false,
  warZones: true,
  conflictEvents: true,
  frontLines: true,
  gpsJam: true,
  atmosphere: true,
};

const DEFAULT_GLOBE_SETTINGS: AppState['globeSettings'] = {
  atmosphereColor: '#1a3a5c',
  showGraticules: false,
  showTerminator: true,
  imageryStyle: 'satellite',
};

// === STORE ===

export const useStore = create<AppState>()(
  devtools(
    (set) => ({
      // Initial state
      satellites: [],
      aircraft: [],
      ships: [],
      conflictZones: [],
      gpsJamCells: [],
      alerts: [],
      selectedEntity: null,
      layers: DEFAULT_LAYERS,
      timeOffset: 0,
      isPlaying: false,
      playSpeed: 1,
      lastRefresh: {
        satellites: 0,
        aircraft: 0,
        ships: 0,
        gpsJam: 0,
      },
      isLoading: {
        satellites: false,
        aircraft: false,
        ships: false,
        gpsJam: false,
      },
      errors: {
        satellites: null,
        aircraft: null,
        ships: null,
        gpsJam: null,
      },
      globeSettings: DEFAULT_GLOBE_SETTINGS,

      // Actions
      setSatellites: (sats) =>
        set({ satellites: sats }, false, 'setSatellites'),

      setAircraft: (aircraft) =>
        set({ aircraft }, false, 'setAircraft'),

      setShips: (ships) =>
        set({ ships }, false, 'setShips'),

      setConflictZones: (zones) =>
        set({ conflictZones: zones }, false, 'setConflictZones'),

      setGpsJamCells: (cells) =>
        set({ gpsJamCells: cells }, false, 'setGpsJamCells'),

      addAlert: (alert) =>
        set(
          (state) => ({ alerts: [{ ...alert }, ...state.alerts].slice(0, 100) }),
          false,
          'addAlert'
        ),

      dismissAlert: (id) =>
        set(
          (state) => ({
            alerts: state.alerts.map((a) =>
              a.id === id ? { ...a, dismissed: true } : a
            ),
          }),
          false,
          'dismissAlert'
        ),

      clearAlerts: () =>
        set({ alerts: [] }, false, 'clearAlerts'),

      setSelectedEntity: (entity) =>
        set({ selectedEntity: entity }, false, 'setSelectedEntity'),

      toggleLayer: (key) =>
        set(
          (state) => ({
            layers: { ...state.layers, [key]: !state.layers[key] },
          }),
          false,
          'toggleLayer'
        ),

      setLayerVisibility: (key, visible) =>
        set(
          (state) => ({
            layers: { ...state.layers, [key]: visible },
          }),
          false,
          'setLayerVisibility'
        ),

      setTimeOffset: (offset) =>
        set({ timeOffset: offset }, false, 'setTimeOffset'),

      setIsPlaying: (playing) =>
        set({ isPlaying: playing }, false, 'setIsPlaying'),

      setPlaySpeed: (speed) =>
        set({ playSpeed: speed }, false, 'setPlaySpeed'),

      setLoading: (key, val) =>
        set(
          (state) => ({
            isLoading: { ...state.isLoading, [key]: val },
          }),
          false,
          'setLoading'
        ),

      setError: (key, err) =>
        set(
          (state) => ({
            errors: { ...state.errors, [key]: err },
          }),
          false,
          'setError'
        ),

      setLastRefresh: (key) =>
        set(
          (state) => ({
            lastRefresh: { ...state.lastRefresh, [key]: Date.now() },
          }),
          false,
          'setLastRefresh'
        ),

      updateGlobeSettings: (settings) =>
        set(
          (state) => ({
            globeSettings: { ...state.globeSettings, ...settings },
          }),
          false,
          'updateGlobeSettings'
        ),
    }),
    { name: 'world-4d-war-track' }
  )
);
