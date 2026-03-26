import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  SatelliteEntity,
  AircraftEntity,
  ShipEntity,
  GeoJSONFeature,
  ConflictEvent,
  ConflictZone,
  GpsJamCell,
  Alert,
  LayerVisibility,
  SelectedEntity,
} from '../types';

// Re-export types so existing imports from the store still work
export type {
  SatelliteEntity,
  AircraftEntity,
  ShipEntity,
  GeoJSONFeature,
  ConflictEvent,
  ConflictZone,
  GpsJamCell,
  Alert,
  LayerVisibility,
  SelectedEntity,
};

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

  // Performance
  performanceMode: 'high' | 'low';

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
  setTimeOffset: (offset: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  setLoading: (key: keyof AppState['isLoading'], val: boolean) => void;
  setError: (key: keyof AppState['errors'], err: string | null) => void;
  setLastRefresh: (key: keyof AppState['lastRefresh']) => void;
  setPerformanceMode: (mode: 'high' | 'low') => void;
}

// === DEFAULT VALUES ===

const DEFAULT_LAYERS: LayerVisibility = {
  satellites: true,
  satelliteOrbits: true,
  satelliteFootprints: false,
  satelliteConnections: false,
  aircraft: true,
  aircraftTrails: true,
  ships: true,
  shipTrails: false,
  warZones: true,
  conflictEvents: false,
  frontLines: true,
  gpsJam: false,
  droneActivity: false,
  seaCables: false,
  nuclearSites: false,
  militaryBases: false,
  sanctionsZones: false,
  chokepoints: false,
  refugeeFlows: false,
  airspaceClosures: false,
  weaponRanges: false,
  cyberThreats: false,
  piracyZones: false,
  carrierGroups: false,
  threatRings: false,
  armsFlows: false,
  tradeRoutes: false,
  energyInfra: false,
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
      performanceMode: 'high',
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

      setPerformanceMode: (mode) =>
        set({ performanceMode: mode }, false, 'setPerformanceMode'),

    }),
    { name: 'world-4d-war-track' }
  )
);
