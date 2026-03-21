import GlobeGLBase from 'react-globe.gl';
// Cast to any so custom/undocumented props don't cause type errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GlobeGL = GlobeGLBase as any;
import { useRef, useEffect, useCallback, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { formatSatelliteLabel, formatAircraftLabel, formatShipLabel, formatConflictLabel } from '../../utils/labels';
import {
  getMilitarySatelliteConnections,
  getGpsJamConnections,
  getSatelliteFootprints,
  type ArcConnection,
  type FootprintRing,
} from '../../utils/satelliteConnections';

// ─── Inline interfaces (mirrors types/index.ts to avoid circular deps) ────────

interface SatelliteEntity {
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

interface AircraftEntity {
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

interface ShipEntity {
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
    geometry: { type: string; coordinates: unknown };
    properties?: Record<string, unknown>;
  };
  events: unknown[];
  description: string;
  color: string;
}

interface GpsJamCell {
  lat: number;
  lng: number;
  level: number;
  radius: number;
  date: string;
  confirmed: boolean;
  type: 'spoofing' | 'jamming' | 'unknown';
  source?: string;
}

interface LayerVisibility {
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface GlobeProps {
  satellites: SatelliteEntity[];
  aircraft: AircraftEntity[];
  ships: ShipEntity[];
  conflictZones: ConflictZone[];
  gpsJamCells: GpsJamCell[];
  layers: LayerVisibility;
  onEntityClick: (type: string, entity: unknown) => void;
  timeOffset: number;
}

// ─── Ref handle exposed to parent ────────────────────────────────────────────

export interface GlobeRef {
  pointOfView: (coords: { lat: number; lng: number; altitude: number }, ms?: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function satelliteColor(category: SatelliteEntity['category']): string {
  switch (category) {
    case 'military':       return '#ff4444';
    case 'spy':            return '#ff2266';
    case 'reconnaissance': return '#ff6600';
    case 'navigation':     return '#00ddff';
    case 'starlink':       return '#aaaaff';
    case 'weather':        return '#66ffcc';
    case 'iss':            return '#ffffff';
    case 'commercial':     return '#88aaff';
    default:               return '#aaaaaa';
  }
}

function satelliteColorDim(category: SatelliteEntity['category']): string {
  // Returns a translucent track colour
  const base = satelliteColor(category);
  return base + '55'; // append alpha
}

function conflictCapColor(intensity: ConflictZone['intensity']): string {
  switch (intensity) {
    case 'critical': return 'rgba(255,17,17,0.25)';
    case 'high':     return 'rgba(255,102,0,0.2)';
    case 'medium':   return 'rgba(255,170,0,0.15)';
    default:         return 'rgba(200,200,0,0.10)';
  }
}

function conflictSideColor(intensity: ConflictZone['intensity']): string {
  switch (intensity) {
    case 'critical': return 'rgba(255,17,17,0.12)';
    case 'high':     return 'rgba(255,102,0,0.10)';
    case 'medium':   return 'rgba(255,170,0,0.08)';
    default:         return 'rgba(200,200,0,0.06)';
  }
}

function conflictStrokeColor(intensity: ConflictZone['intensity']): string {
  switch (intensity) {
    case 'critical': return '#ff1111';
    case 'high':     return '#ff6600';
    case 'medium':   return '#ffaa00';
    default:         return '#cccc00';
  }
}

function shipColor(type: ShipEntity['type']): string {
  switch (type) {
    case 'warship':
    case 'military': return '#ff3333';
    case 'tanker':   return '#ff8800';
    default:         return '#ffdd00';
  }
}

/** Expand a GpsJamCell into a cloud of lat/lng points distributed in a circle */
function expandJamCell(cell: GpsJamCell): { lat: number; lng: number; weight: number }[] {
  const KM_PER_DEG = 111;
  const n = Math.max(4, Math.round(cell.radius / 40));
  const points: { lat: number; lng: number; weight: number }[] = [
    { lat: cell.lat, lng: cell.lng, weight: cell.level },
  ];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const dLat = (cell.radius / KM_PER_DEG) * Math.cos(angle);
    const dLng =
      (cell.radius / (KM_PER_DEG * Math.cos((cell.lat * Math.PI) / 180))) *
      Math.sin(angle);
    points.push({ lat: cell.lat + dLat, lng: cell.lng + dLng, weight: cell.level * 0.6 });
  }
  return points;
}

function hexBinColor(frac: number): string {
  // gradient from yellow (#ffee00) → orange → red
  const r = 255;
  const g = Math.round(238 * (1 - frac));
  const b = 0;
  return `rgba(${r},${g},${b},0.75)`;
}

// zoneCentroid replaced by getConflictCenter from utils/satelliteConnections

// ─── Path entry union (satellite ground tracks + aircraft trails) ─────────────

type PathEntry =
  | { _kind: 'sat'; sat: SatelliteEntity; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'aircraft'; aircraft: AircraftEntity; coords: { lat: number; lng: number; alt: number }[] };

// ─── Component ────────────────────────────────────────────────────────────────

const Globe = forwardRef<GlobeRef, GlobeProps>(function Globe(
  { satellites, aircraft, ships, conflictZones, gpsJamCells, layers, onEntityClick },
  ref
) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Expose pointOfView to parent via ref
  useImperativeHandle(ref, () => ({
    pointOfView(coords, ms = 1000) {
      globeRef.current?.pointOfView(coords, ms);
    },
  }));

  // Resize observer
  useEffect(() => {
    const onResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-rotate + camera controls
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.3;
      globeRef.current.controls().enableZoom = true;
      globeRef.current.controls().minDistance = 150;
      globeRef.current.controls().maxDistance = 1000;
    }
  }, []);

  // Initial camera position
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 25, lng: 15, altitude: 2.5 }, 0);
    }
  }, []);

  // ── Derived data (memoized) ─────────────────────────────────────────────────

  // War zone polygon data
  const polygonsData = useMemo(
    () => (layers.warZones ? conflictZones : []),
    [layers.warZones, conflictZones]
  );

  // GPS hex bin points
  const hexBinPoints = useMemo(
    () => (layers.gpsJam ? gpsJamCells.flatMap(expandJamCell) : []),
    [layers.gpsJam, gpsJamCells]
  );

  // Satellite points
  const satellitePoints = layers.satellites ? satellites : [];

  // Aircraft points (exclude on-ground)
  const aircraftPoints = layers.aircraft ? aircraft.filter((a) => !a.onGround) : [];

  // Ship points
  const shipPoints = layers.ships ? ships : [];

  // Unified path entries — satellite ground tracks + aircraft trails share one pathsData prop
  const satelliteTrackPaths: PathEntry[] = useMemo(
    () =>
      layers.satelliteOrbits
        ? satellites
            .filter((s) => s.groundTrack && s.groundTrack.length > 1)
            .map((s) => ({
              _kind: 'sat' as const,
              sat: s,
              coords: s.groundTrack.map(([lat, lng]) => ({ lat, lng, alt: 0 })),
            }))
        : [],
    [layers.satelliteOrbits, satellites]
  );

  const aircraftTrailPaths: PathEntry[] = useMemo(
    () =>
      layers.aircraftTrails
        ? aircraft
            .filter((a) => !a.onGround && a.trail && a.trail.length > 1)
            .map((a) => ({
              _kind: 'aircraft' as const,
              aircraft: a,
              coords: a.trail.map(([lat, lng, alt]) => ({ lat, lng, alt: alt / 1_000_000 })),
            }))
        : [],
    [layers.aircraftTrails, aircraft]
  );

  const allPaths: PathEntry[] = useMemo(
    () => [...satelliteTrackPaths, ...aircraftTrailPaths],
    [satelliteTrackPaths, aircraftTrailPaths]
  );

  // Satellite connection arcs: military/spy/recon → nearest conflict zone + nav → GPS jam cells
  const arcsData: ArcConnection[] = useMemo(() => {
    if (!layers.satelliteConnections) return [];
    const milArcs = getMilitarySatelliteConnections(
      satellites as any,
      conflictZones as any,
      20
    );
    const jamArcs = getGpsJamConnections(satellites as any, gpsJamCells as any);
    return [...milArcs, ...jamArcs];
  }, [layers.satelliteConnections, satellites, conflictZones, gpsJamCells]);

  // Satellite footprint rings
  const ringsData: FootprintRing[] = useMemo(
    () =>
      layers.satelliteFootprints
        ? getSatelliteFootprints(satellites as any, ['military', 'spy', 'reconnaissance', 'navigation'])
        : [],
    [layers.satelliteFootprints, satellites]
  );

  // ── Shared Three.js geometries/materials (avoid per-call allocation) ───────
  const sharedGeo = useMemo(() => {
    const THREE = (window as any).THREE;
    if (!THREE) return null;
    return {
      aircraftGeo: new THREE.SphereGeometry(0.2, 4, 4),
      shipGeo: new THREE.SphereGeometry(0.25, 4, 4),
      materialCache: new Map<string, any>(),
      THREE,
    };
  }, []);

  // ── Memoized objectsData ──────────────────────────────────────────────────
  const objectsData = useMemo(
    () => [
      ...(layers.aircraft
        ? aircraftPoints.map((a) => ({ ...a, _type: 'aircraft' as const }))
        : []),
      ...(layers.ships
        ? shipPoints.map((s) => ({ ...s, _type: 'ship' as const }))
        : []),
    ],
    [layers.aircraft, layers.ships, aircraftPoints, shipPoints]
  );

  // ── Click handlers ──────────────────────────────────────────────────────────

  const handleSatelliteClick = useCallback(
    (sat: object) => onEntityClick('satellite', sat),
    [onEntityClick]
  );

  const handleAircraftClick = useCallback(
    (ac: object) => onEntityClick('aircraft', ac),
    [onEntityClick]
  );

  const handleShipClick = useCallback(
    (ship: object) => onEntityClick('ship', ship),
    [onEntityClick]
  );

  const handleZoneClick = useCallback(
    (zone: object) => onEntityClick('conflict', zone),
    [onEntityClick]
  );

  // ── Memoized label / color callbacks ──────────────────────────────────────

  const pointColor = useCallback(
    (d: object) => satelliteColor((d as SatelliteEntity).category),
    []
  );

  const pointLabel = useCallback((d: object) => {
    const s = d as SatelliteEntity;
    return formatSatelliteLabel(s);
  }, []);

  const polygonLabel = useCallback((d: object) => {
    const z = d as ConflictZone;
    return formatConflictLabel(z);
  }, []);

  const objectLabel = useCallback((d: object) => {
    const obj = d as (AircraftEntity | ShipEntity) & { _type: string };
    if (obj._type === 'aircraft') {
      const a = obj as AircraftEntity;
      return formatAircraftLabel(a);
    }
    const s = obj as ShipEntity;
    return formatShipLabel(s);
  }, []);

  const objectThreeObject = useCallback((d: object) => {
    const obj = d as (AircraftEntity | ShipEntity) & { _type: string };
    if (!sharedGeo) return null;
    const { aircraftGeo, shipGeo, materialCache, THREE } = sharedGeo;
    const color =
      obj._type === 'aircraft'
        ? (obj as AircraftEntity).isMilitary
          ? '#ff3333'
          : '#00aaff'
        : shipColor((obj as ShipEntity).type);
    let material = materialCache.get(color);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ color });
      materialCache.set(color, material);
    }
    const geometry = obj._type === 'aircraft' ? aircraftGeo : shipGeo;
    return new THREE.Mesh(geometry, material);
  }, [sharedGeo]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000010' }}>
      <GlobeGL
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        // ── Globe appearance
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#1a4a8a"
        atmosphereAltitude={0.15}
        showAtmosphere={layers.atmosphere}

        // ── War-zone polygons ──────────────────────────────────
        polygonsData={polygonsData}
        polygonGeoJsonGeometry={(d: object) => (d as ConflictZone).geoJSON.geometry as any}
        polygonCapColor={(d: object) => conflictCapColor((d as ConflictZone).intensity)}
        polygonSideColor={(d: object) => conflictSideColor((d as ConflictZone).intensity)}
        polygonStrokeColor={(d: object) => conflictStrokeColor((d as ConflictZone).intensity)}
        polygonAltitude={0.005}
        onPolygonClick={handleZoneClick}
        polygonLabel={polygonLabel}

        // ── GPS jam hexbin ─────────────────────────────────────
        hexBinPointsData={hexBinPoints}
        hexBinPointLat={(d: object) => (d as { lat: number }).lat}
        hexBinPointLng={(d: object) => (d as { lng: number }).lng}
        hexBinPointWeight={(d: object) => (d as { weight: number }).weight}
        hexBinResolution={3}
        hexBinColor={(d: object) => {
          const bin = d as { sumWeight: number; points: unknown[] };
          const maxLevel = Math.min(1, bin.sumWeight / Math.max(1, bin.points.length));
          return hexBinColor(maxLevel);
        }}
        hexAltitude={(d: object) => {
          const bin = d as { sumWeight: number };
          return bin.sumWeight * 0.02;
        }}

        // ── Satellite points ───────────────────────────────────
        pointsData={satellitePoints}
        pointLat={(d: object) => (d as SatelliteEntity).lat}
        pointLng={(d: object) => (d as SatelliteEntity).lng}
        pointAltitude={(d: object) => {
          const s = d as SatelliteEntity;
          return s.alt / 6371; // normalise to globe radius fraction
        }}
        pointColor={pointColor}
        pointRadius={(d: object) => ((d as SatelliteEntity).category === 'iss' ? 0.6 : 0.3)}
        pointLabel={pointLabel}
        onPointClick={handleSatelliteClick}

        // ── Aircraft points ────────────────────────────────────
        // react-globe.gl only supports one pointsData, so we merge points
        // via custom objects layer for aircraft + ships below

        // ── Satellite ground tracks + aircraft trails (merged) ──
        pathsData={allPaths}
        pathPoints={(d: object) => (d as PathEntry).coords}
        pathPointLat={(pt: object) => (pt as { lat: number }).lat}
        pathPointLng={(pt: object) => (pt as { lng: number }).lng}
        pathPointAlt={(pt: object) => (pt as { alt: number }).alt}
        pathColor={(d: object) => {
          const entry = d as PathEntry;
          if (entry._kind === 'sat') return satelliteColorDim(entry.sat.category);
          // aircraft trail: military = dim red, civilian = dim blue
          return entry.aircraft.isMilitary ? 'rgba(255,51,51,0.35)' : 'rgba(0,170,255,0.35)';
        }}
        pathDashLength={0.5}
        pathDashGap={0.3}
        pathStroke={0.5}

        // ── Connection arcs (military → conflict, nav → GPS jam) ──
        arcsData={arcsData}
        arcStartLat={(d: object) => (d as ArcConnection).startLat}
        arcStartLng={(d: object) => (d as ArcConnection).startLng}
        arcEndLat={(d: object) => (d as ArcConnection).endLat}
        arcEndLng={(d: object) => (d as ArcConnection).endLng}
        arcColor={(d: object) => (d as ArcConnection).color}
        arcLabel={(d: object) => (d as ArcConnection).label}
        arcAltAutoScale={0.3}
        arcStroke={0.5}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}

        // ── Satellite footprint rings ──────────────────────────
        ringsData={ringsData}
        ringLat={(d: object) => (d as FootprintRing).lat}
        ringLng={(d: object) => (d as FootprintRing).lng}
        ringMaxR={(d: object) => (d as FootprintRing).maxR}
        ringColor={(d: object) => (d as FootprintRing).color}
        ringPropagationSpeed={2}
        ringRepeatPeriod={800}

        // ── Custom HTML objects for aircraft + ships ───────────
        // (uses objectsData so we can overlay on top of satellite points)
        objectsData={objectsData}
        objectLat={(d: object) => (d as AircraftEntity & { _type: string }).lat}
        objectLng={(d: object) => (d as AircraftEntity & { _type: string }).lng}
        objectAltitude={(d: object) => {
          const obj = d as (AircraftEntity | ShipEntity) & { _type: string };
          if (obj._type === 'aircraft') return (obj as AircraftEntity).altitude / 6_371_000;
          return 0.001; // ships at surface
        }}
        objectThreeObject={objectThreeObject}
        objectLabel={objectLabel}
        onObjectClick={(d: object) => {
          const obj = d as (AircraftEntity | ShipEntity) & { _type: string };
          if (obj._type === 'aircraft') handleAircraftClick(obj);
          else handleShipClick(obj);
        }}
      />

    </div>
  );
});

export default Globe;
