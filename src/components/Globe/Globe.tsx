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
import { MILITARY_BASES, type MilitaryBase } from '../../data/militaryBases';
import { SEA_CABLES, type SeaCable } from '../../data/seaCables';

import { CYBER_THREATS, type CyberThreat } from '../../data/cyberThreats';

import { REFUGEE_FLOWS, type RefugeeFlow } from '../../data/refugeeFlows';

import { PIRACY_ZONES, type PiracyZone } from '../../data/piracyZones';
import { ENERGY_FACILITIES, type EnergyFacility } from '../../data/energyInfra';

import { WEAPON_RANGES } from '../../data/weaponRanges';
import { NUCLEAR_SITES, type NuclearSite } from '../../data/nuclearSites';
import { CHOKEPOINTS, type Chokepoint } from '../../data/chokepoints';
import { ARMS_FLOWS, type ArmsFlow } from '../../data/armsFlows';


// ─── Inject chokepoint pulse animation CSS (once) ────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('chokepoint-pulse-css')) {
  const style = document.createElement('style');
  style.id = 'chokepoint-pulse-css';
  style.textContent = `
    @keyframes chokepoint-pulse {
      0%   { transform: scale(1);   opacity: 0.9; }
      50%  { transform: scale(1.6); opacity: 0.3; }
      100% { transform: scale(1);   opacity: 0.9; }
    }
    @keyframes oil-flow-ring {
      0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.5; }
      50%  { transform: translate(-50%, -50%) scale(1.4); opacity: 0.12; }
      100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.5; }
    }
    @keyframes csg-pulse {
      0%   { transform: scale(1);   opacity: 0.7; }
      50%  { transform: scale(1.15); opacity: 0.4; }
      100% { transform: scale(1);   opacity: 0.7; }
    }
    .chokepoint-tooltip {
      display: none; position: absolute; bottom: 100%; left: 50%;
      transform: translateX(-50%);
      background: rgba(5,15,30,0.95); border: 1px solid rgba(0,255,136,0.4);
      border-radius: 4px; padding: 8px 10px; white-space: nowrap;
      font-family: 'Courier New', monospace; font-size: 11px; color: #cde;
      pointer-events: none; z-index: 9999; margin-bottom: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.7); line-height: 1.5;
    }
    .chokepoint-marker:hover .chokepoint-tooltip { display: block; }
  `;
  document.head.appendChild(style);
}
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
    geometry: { type: string; coordinates: number[] | number[][] | number[][][] | number[][][][] };
    properties?: Record<string, unknown>;
  };
  events: { id: string; date: string; type: string; lat: number; lng: number; description: string; fatalities: number; source: string }[];
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
  droneActivity: boolean;
  seaCables: boolean;
  refugeeFlows: boolean;
  piracyZones: boolean;
  cyberThreats: boolean;
  weaponRanges: boolean;
  energyInfra: boolean;
  carrierGroups: boolean;
  nuclearSites: boolean;
  militaryBases: boolean;
  chokepoints: boolean;
  sanctionsZones: boolean;
  armsFlows: boolean;
  tradeRoutes: boolean;
  atmosphere: boolean;
}

interface PiracyMarker extends PiracyZone {
  _marker: 'piracy';
}

// ─── Nuclear marker for the unified HTML elements layer ──────────────────────

interface NuclearMarker extends NuclearSite {
  _marker: 'nuclear';
}

interface EventMarker {
  _marker: 'event';
  _zoneName: string;
  _zoneId: string;
  id: string;
  date: string;
  type: string;
  lat: number;
  lng: number;
  description: string;
  fatalities: number;
  source: string;
}

// ─── Carrier Strike Group types & helpers ──────────────────────────────────

interface CarrierStrikeGroup {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  radiusKm: number;
  color: string;
  ships: ShipEntity[];
  composition: string;
  _marker: 'csg';
}

/** Navy color by country */
function navyColor(country: string): string {
  const c = country.toLowerCase();
  if (c.includes('united states'))  return '#1a3a6e';
  if (c.includes('russia'))         return '#cc2222';
  if (c.includes('china'))          return '#ccaa00';
  if (c.includes('united kingdom')) return '#00cccc';
  if (c.includes('india'))          return '#ee7700';
  if (c.includes('south korea'))    return '#4488cc';
  return '#8888ff';
}

/** Navy glow color (brighter) */
function navyGlow(country: string): string {
  const c = country.toLowerCase();
  if (c.includes('united states'))  return '#4477dd';
  if (c.includes('russia'))         return '#ff4444';
  if (c.includes('china'))          return '#ffdd44';
  if (c.includes('united kingdom')) return '#44ffff';
  if (c.includes('india'))          return '#ffaa44';
  if (c.includes('south korea'))    return '#66aaff';
  return '#aaaaff';
}

/** Classify warship role by name */
function classifyShipRole(name: string): string {
  const n = name.toUpperCase();
  if (n.includes('CARRIER') || n.includes('FORD') || n.includes('EISENHOWER') ||
      n.includes('REAGAN') || n.includes('QUEEN ELIZABETH') || n.includes('PRINCE OF WALES') ||
      n.includes('VIKRAMADITYA') || n.includes('BATAAN')) return 'carrier';
  if (n.includes('CRUISER') || n.includes('NORMANDY') || n.includes('CHANCELLORSVILLE') ||
      n.includes('PHILIPPINE SEA') || n.includes('SEJONG')) return 'cruiser';
  if (n.includes('DESTROYER') || n.includes('GRAVELY') || n.includes('MASON') ||
      n.includes('HUDNER') || n.includes('DIAMOND')) return 'destroyer';
  if (n.includes('FRIGATE') || n.includes('KENT') || n.includes('SHIVALIK')) return 'frigate';
  if (n.includes('SUPPLY') || n.includes('COMFORT') || n.includes('USNS')) return 'supply';
  if (n.includes('HALL') || n.includes('CARTER')) return 'amphibious';
  return 'escort';
}

/** Build composition string */
function buildComposition(groupShips: ShipEntity[]): string {
  const counts: Record<string, number> = {};
  for (const s of groupShips) {
    const role = classifyShipRole(s.name);
    counts[role] = (counts[role] || 0) + 1;
  }
  const order = ['carrier', 'cruiser', 'destroyer', 'frigate', 'amphibious', 'escort', 'supply'];
  const parts: string[] = [];
  for (const role of order) {
    const c = counts[role];
    if (c) parts.push(`${c} ${role}${c > 1 ? 's' : ''}`);
  }
  return parts.join(', ');
}

/** Detect carrier strike groups: same-country warships within 50km of a carrier */
function detectCarrierGroups(ships: ShipEntity[]): CarrierStrikeGroup[] {
  const PROXIMITY_KM = 50;
  const militaryShips = ships.filter(s => s.type === 'warship' || s.type === 'military');
  const carriers = militaryShips.filter(s => classifyShipRole(s.name) === 'carrier');
  const assigned = new Set<string>();
  const groups: CarrierStrikeGroup[] = [];

  for (const carrier of carriers) {
    if (assigned.has(carrier.mmsi)) continue;
    const nearby = militaryShips.filter(s =>
      s.country === carrier.country &&
      !assigned.has(s.mmsi) &&
      haversineKm(carrier.lat, carrier.lng, s.lat, s.lng) <= PROXIMITY_KM
    );
    if (nearby.length < 2) continue;
    for (const s of nearby) assigned.add(s.mmsi);

    const avgLat = nearby.reduce((sum, s) => sum + s.lat, 0) / nearby.length;
    const avgLng = nearby.reduce((sum, s) => sum + s.lng, 0) / nearby.length;
    let maxDist = 20;
    for (const s of nearby) {
      const d = haversineKm(avgLat, avgLng, s.lat, s.lng);
      if (d > maxDist) maxDist = d;
    }
    const carrierShortName = carrier.name.replace(/^(USS |HMS |INS |RFS |ROKS )/, '');

    groups.push({
      id: `csg-${carrier.mmsi}`,
      name: `${carrierShortName} CSG`,
      country: carrier.country,
      lat: avgLat,
      lng: avgLng,
      radiusKm: maxDist + 5,
      color: navyColor(carrier.country),
      ships: nearby,
      composition: buildComposition(nearby),
      _marker: 'csg',
    });
  }
  return groups;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globeSettings?: any;
}

// ─── Ref handle exposed to parent ────────────────────────────────────────────

export interface GlobeRef {
  pointOfView: (coords: { lat: number; lng: number; altitude: number }, ms?: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS */
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    case 'low':      return 'rgba(0,255,136,0.10)';
    default:         return 'rgba(255,170,0,0.10)';
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

function shipTrailColor(type: string): string {
  switch (type) {
    case 'warship': case 'military': return 'rgba(255,51,51,0.40)';
    case 'tanker': return 'rgba(255,136,0,0.40)';
    case 'cargo': return 'rgba(51,136,255,0.40)';
    default: return 'rgba(200,200,100,0.30)';
  }
}

function cyberThreatColor(type: CyberThreat['type']): string {
  switch (type) {
    case 'ransomware':             return '#ff2222';
    case 'espionage':              return '#aa44ff';
    case 'ddos':                   return '#00ddff';
    case 'infrastructure':         return '#ff8800';
    case 'election_interference':  return '#ffdd00';
    default:                       return '#ff8800';
  }
}

function cableRiskColor(risk: SeaCable['risk']): string {
  switch (risk) {
    case 'critical': return '#ff3333';
    case 'high':     return '#ff8800';
    case 'medium':   return '#ffdd00';
    case 'low':      return '#00ddff';
    default:         return '#00ddff';
  }
}

/** Risk-based glow color for nuclear site markers */
function nuclearRiskColor(risk: NuclearSite['risk']): string {
  switch (risk) {
    case 'critical': return '#ff2222';
    case 'high':     return '#ff8800';
    case 'medium':   return '#ffdd00';
    case 'low':      return '#44cc44';
    default:         return '#888888';
  }
}

/** CSS animation speed for nuclear pulse */
function nuclearPulseSpeed(risk: NuclearSite['risk']): string {
  switch (risk) {
    case 'critical': return '0.8s';
    case 'high':     return '1.2s';
    case 'medium':   return '2s';
    case 'low':      return '3s';
    default:         return '2s';
  }
}

function militaryBaseColor(operator: string): string {
  const op = operator.toUpperCase();
  if (op.includes('RUSSIA')) return '#ff3333';
  if (op.includes('CHINA')) return '#ffdd00';
  if (op.includes('UK') && !op.includes('US')) return '#00cccc';
  if (op.includes('NATO')) return '#ffffff';
  if (op.includes('US')) return '#4488ff';
  return '#aaaaaa';
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
  return `rgba(${r},${g},${b},0.35)`;
}
/** Cyan-to-purple gradient for drone activity heatmap */
function droneHeatmapColor(t: number): string {
  const r = Math.round(170 * t);
  const g = Math.round(255 * (1 - t));
  const b = 255;
  return `rgba(${r},${g},${b},${(0.4 + 0.5 * t).toFixed(2)})`;
}

/** Expand drone events into weighted lat/lng points for heatmap layer */
function expandDroneEvents(
  zones: ConflictZone[]
): { lat: number; lng: number; weight: number }[] {
  const KM_PER_DEG = 111;
  const points: { lat: number; lng: number; weight: number }[] = [];
  for (const zone of zones) {
    for (const evt of zone.events) {
      if (evt.type !== 'drone') continue;
      const weight = Math.max(0.3, Math.min(1, 0.3 + Math.log10(evt.fatalities + 1) * 0.25));
      points.push({ lat: evt.lat, lng: evt.lng, weight });
      const radius = 50;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const dLat = (radius / KM_PER_DEG) * Math.cos(angle);
        const dLng =
          (radius / (KM_PER_DEG * Math.cos((evt.lat * Math.PI) / 180))) *
          Math.sin(angle);
        points.push({ lat: evt.lat + dLat, lng: evt.lng + dLng, weight: weight * 0.5 });
      }
    }
  }
  return points;
}


// zoneCentroid replaced by getConflictCenter from utils/satelliteConnections


function piracyZoneColor(risk: PiracyZone['risk']): string {
  switch (risk) {
    case 'critical': return '#ff2222';
    case 'high':     return '#ff8800';
    case 'medium':   return '#ffdd00';
    case 'low':      return '#44cc44';
    default:         return '#ff8800';
  }
}

let _piracyStyleInjected = false;
function injectPiracyPulseStyle() {
  if (_piracyStyleInjected) return;
  _piracyStyleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes piracy-pulse-critical {
      0%, 100% { opacity: 0.9; transform: scale(1); box-shadow: 0 0 12px #ff2222, inset 0 0 8px #ff2222; }
      50% { opacity: 0.5; transform: scale(1.25); box-shadow: 0 0 24px #ff2222, inset 0 0 16px #ff2222; }
    }
    @keyframes piracy-pulse-high {
      0%, 100% { opacity: 0.85; transform: scale(1); box-shadow: 0 0 10px #ff8800, inset 0 0 6px #ff8800; }
      50% { opacity: 0.45; transform: scale(1.2); box-shadow: 0 0 20px #ff8800, inset 0 0 12px #ff8800; }
    }
    @keyframes piracy-pulse-medium {
      0%, 100% { opacity: 0.8; transform: scale(1); box-shadow: 0 0 8px #ffdd00, inset 0 0 5px #ffdd00; }
      50% { opacity: 0.4; transform: scale(1.15); box-shadow: 0 0 16px #ffdd00, inset 0 0 10px #ffdd00; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Path entry union (satellite ground tracks + aircraft trails) ─────────────

type PathEntry =
  | { _kind: 'sat'; sat: SatelliteEntity; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'aircraft'; aircraft: AircraftEntity; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'ship'; ship: ShipEntity; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'frontline'; zone: ConflictZone; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'seaCable'; cable: SeaCable; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'weaponRange'; site: string; weapon: string; rangeKm: number; weaponType: 'ballistic' | 'cruise' | 'drone' | 'sam' | 'rocket'; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'constellation'; constellation: string; color: string; coords: { lat: number; lng: number; alt: number }[] }
  | { _kind: 'nuclearZone'; facility: string; zone: 'Evacuation' | 'Shelter-in-place' | 'Monitoring'; radiusKm: number; risk: NuclearSite['risk']; coords: { lat: number; lng: number; alt: number }[] };

// ─── Navigation constellation helpers ──────────────────────────────────────

type ConstellationName = 'GPS' | 'GLONASS' | 'Galileo' | 'BeiDou' | 'Starlink';

const CONSTELLATION_COLORS: Record<ConstellationName, string> = {
  GPS:      '#00ff00',
  GLONASS:  '#ff3333',
  Galileo:  '#4488ff',
  BeiDou:   '#ffdd00',
  Starlink: '#aaddff',
};

/** Identify which navigation constellation a satellite belongs to (or null) */
function getConstellation(sat: SatelliteEntity): ConstellationName | null {
  const upper = sat.name.toUpperCase();
  if (upper.includes('NAVSTAR') || upper.includes('GPS')) return 'GPS';
  if (upper.includes('GLONASS') || upper.includes('COSMOS')) return 'GLONASS';
  if (upper.includes('GALILEO') || upper.includes('GSAT')) return 'Galileo';
  if (upper.includes('BEIDOU')) return 'BeiDou';
  if (sat.category === 'starlink') return 'Starlink';
  return null;
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Refugee flow arc ────────────────────────────────────────────────────────

interface RefugeeArc {
  _isRefugee: true;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  count: number;
  from: string;
  to: string;
  year: string;
}

/** Map refugee count to arc stroke width (min 0.8, max 4) */
function refugeeArcWidth(count: number): number {
  return Math.min(4, Math.max(0.8, 0.8 + Math.log10(Math.max(1, count)) * 0.5));
}

function formatRefugeeCount(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
  if (count >= 1_000) return Math.round(count / 1_000) + 'K';
  return String(count);
}

// ─── Arms supply flow arc ───────────────────────────────────────────────────

interface ArmsFlowArc {
  _isArmsFlow: true;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  supplier: string;
  recipient: string;
  category: string;
  value: string;
}

function armsFlowColor(category: string): string {
  switch (category) {
    case 'missiles':     return '#ff2222';
    case 'drones':       return '#00ddff';
    case 'ammunition':   return '#ff8800';
    case 'air_defense':  return '#22cc44';
    case 'vehicles':     return '#ffdd00';
    case 'artillery':    return '#ff6644';
    default:             return '#ff8800';
  }
}

/** Map arms flow category to arc stroke width (thicker = higher significance) */
function armsFlowStroke(category: string, value: string): number {
  // Billion-dollar+ transfers get thicker lines
  if (value.includes('B')) return 3.0;
  if (value.includes('M') || value.includes('million')) return 2.0;
  return 1.8;
}

// ─── Trade route disruption arcs ─────────────────────────────────────────────

interface TradeRouteArc {
  _isTradeRoute: true;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  status: 'disrupted' | 'active';
  color: string;
}

const TRADE_ROUTE_ARCS: Omit<TradeRouteArc, '_isTradeRoute'>[] = [
  // Normal Suez route (now disrupted)
  { name: 'Suez Route (DISRUPTED)', startLat: 34.0, startLng: 11.0, endLat: 12.5, endLng: 43.3, status: 'disrupted', color: 'rgba(255,50,50,0.6)' },
  // Cape of Good Hope reroute
  { name: 'Cape Reroute (Active)', startLat: 34.0, startLng: 11.0, endLat: -34.4, endLng: 18.5, status: 'active', color: 'rgba(0,255,136,0.4)' },
  { name: 'Cape Reroute East', startLat: -34.4, startLng: 18.5, endLat: 12.5, endLng: 43.3, status: 'active', color: 'rgba(0,255,136,0.4)' },
  // Black Sea grain (disrupted)
  { name: 'Black Sea Grain (SUSPENDED)', startLat: 46.5, startLng: 31.0, endLat: 41.0, endLng: 29.0, status: 'disrupted', color: 'rgba(255,50,50,0.6)' },
];

function isTradeRouteArc(d: object): d is TradeRouteArc {
  return '_isTradeRoute' in d;
}

type ArcEntry = ArcConnection | RefugeeArc | ArmsFlowArc | TradeRouteArc;

function isRefugeeArc(d: object): d is RefugeeArc {
  return '_isRefugee' in d;
}

function isArmsFlowArc(d: object): d is ArmsFlowArc {
  return '_isArmsFlow' in d;
}


/** Generate a circle of [lat, lng] points on Earth surface */
function generateCircleCoords(
  centerLat: number, centerLng: number, radiusKm: number, segments: number = 64
): { lat: number; lng: number; alt: number }[] {
  const KM_PER_DEG = 111.32;
  const coords: { lat: number; lng: number; alt: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const dLat = (radiusKm / KM_PER_DEG) * Math.cos(angle);
    const dLng = (radiusKm / (KM_PER_DEG * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);
    coords.push({ lat: centerLat + dLat, lng: centerLng + dLng, alt: 0.002 });
  }
  return coords;
}

/** Color for weapon range circle by type */
function weaponRangeColor(type: 'ballistic' | 'cruise' | 'drone' | 'sam' | 'rocket'): string {
  switch (type) {
    case 'ballistic': return 'rgba(255,50,50,0.55)';
    case 'cruise':    return 'rgba(255,160,0,0.55)';
    case 'drone':     return 'rgba(0,220,255,0.55)';
    case 'sam':       return 'rgba(255,255,0,0.55)';
    case 'rocket':    return 'rgba(255,255,255,0.55)';
    default:          return 'rgba(200,200,200,0.40)';
  }
}

// Inject nuclear pulse keyframes into the document once
let _nuclearStyleInjected = false;
function injectNuclearPulseStyle() {
  if (_nuclearStyleInjected) return;
  _nuclearStyleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes nuclear-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.5); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Unified HTML marker type (events + nuclear sites share htmlElementsData) ─

type HtmlMarker =
  | (EventMarker & { _marker: 'event' })
  | NuclearMarker;


function energyRiskColor(risk: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (risk) {
    case 'critical': return '#ff0033';
    case 'high':     return '#ff8800';
    case 'medium':   return '#ffcc00';
    case 'low':      return '#44cc44';
    default:         return '#888888';
  }
}

function energyTypeIcon(type: string): string {
  switch (type) {
    case 'oil_field':
    case 'gas_field':     return '\u{1F525}'; // flame
    case 'refinery':      return '\u{1F3ED}'; // factory
    case 'pipeline_hub':  return '\u{1F6E2}'; // oil drum
    case 'lng_terminal':
    case 'oil_terminal':  return '\u{2693}';  // anchor
    default:              return '\u{26A1}';  // lightning
  }
}


function chokepointRiskColor(risk: Chokepoint['risk']): string {
  switch (risk) {
    case 'critical': return '#ff2222';
    case 'high':     return '#ff8800';
    case 'medium':   return '#ffdd00';
    case 'low':      return '#44cc44';
    default:         return '#ff8800';
  }
}

/** Parse oil flow string like "21M bbl/day" to numeric millions */
function parseOilFlowM(oilFlow: string): number {
  const match = oilFlow.match(/([\d.]+)\s*M/i);
  return match ? parseFloat(match[1]) : 0;
}

/** Map daily traffic string to a ring size in px (16-36) */
function chokepointRingSize(dailyTraffic: string): number {
  const match = dailyTraffic.match(/~?(\d+)/);
  if (!match) return 20;
  const n = parseInt(match[1], 10);
  return Math.min(36, Math.max(16, Math.round(12 + n * 0.28)));
}

/** Map oil flow to an outer ring size in px (0-52). Scales relative to max ~21M bbl/day */
function oilFlowRingSize(oilFlow: string): number {
  const m = parseOilFlowM(oilFlow);
  if (m <= 0) return 0;
  return Math.round(20 + (m / 21) * 32);  // 20..52 px
}

/** Pulse speed based on risk level */
function oilFlowPulseSpeed(risk: Chokepoint['risk']): string {
  switch (risk) {
    case 'critical': return '0.9s';
    case 'high':     return '1.5s';
    case 'medium':   return '2.2s';
    case 'low':      return '3s';
    default:         return '2s';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const Globe = forwardRef<GlobeRef, GlobeProps>(function Globe(
  { satellites, aircraft, ships, conflictZones, gpsJamCells, layers, onEntityClick, timeOffset, globeSettings },
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

  // Use ResizeObserver on container for accurate dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setDimensions({ width, height });
          }
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
    // Fallback to window resize if container not available
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

  // Inject nuclear pulse CSS once
  useEffect(() => { injectNuclearPulseStyle(); injectPiracyPulseStyle(); }, []);

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
  // Drone activity heatmap data
  const droneActivityHeatmap = useMemo(() => {
    if (!layers.droneActivity) return [];
    const pts = expandDroneEvents(conflictZones);
    if (pts.length === 0) return [];
    return [{
      id: 'drone-activity',
      points: pts,
    }];
  }, [layers.droneActivity, conflictZones]);


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

  // Ship trail paths
  const shipTrailPaths: PathEntry[] = useMemo(
    () =>
      layers.shipTrails
        ? ships
            .filter((s) => s.trail && s.trail.length > 1)
            .map((s) => ({
              _kind: 'ship' as const,
              ship: s,
              coords: s.trail.map(([lat, lng]) => ({ lat, lng, alt: 0 })),
            }))
        : [],
    [layers.shipTrails, ships]
  );

  // Front line paths (from conflict zones with line/polygon geometries)
  const frontLinePaths: PathEntry[] = useMemo(
    () => {
      if (!layers.frontLines) return [];
      const paths: PathEntry[] = [];
      for (const zone of conflictZones) {
        const geo = zone.geoJSON?.geometry;
        if (!geo) continue;
        const coordArrays: number[][][] = [];
        if (geo.type === 'LineString') {
          coordArrays.push(geo.coordinates as number[][]);
        } else if (geo.type === 'MultiLineString') {
          coordArrays.push(...(geo.coordinates as number[][][]));
        } else if (geo.type === 'Polygon') {
          coordArrays.push(...(geo.coordinates as number[][][]));
        } else if (geo.type === 'MultiPolygon') {
          for (const poly of geo.coordinates as number[][][][]) {
            coordArrays.push(...poly);
          }
        }
        for (const ring of coordArrays) {
          if (ring.length < 2) continue;
          paths.push({
            _kind: 'frontline' as const,
            zone,
            coords: ring.map(([lng, lat]) => ({ lat, lng, alt: 0.003 })),
          });
        }
      }
      return paths;
    },
    [layers.frontLines, conflictZones]
  );

  // Sea cable paths
  const seaCablePaths: PathEntry[] = useMemo(
    () =>
      layers.seaCables
        ? SEA_CABLES.map((cable) => ({
            _kind: 'seaCable' as const,
            cable,
            coords: cable.path.map(([lat, lng]) => ({ lat, lng, alt: 0 })),
          }))
        : [],
    [layers.seaCables]
  );

  // ── Navigation constellation connection paths ─────────────────────────────
  // Groups nav satellites by constellation and draws connecting lines.
  // Starlink skipped (too many for connecting lines).
  const constellationPaths: PathEntry[] = useMemo(() => {
    if (!layers.satelliteOrbits) return [];

    const groups = new Map<ConstellationName, SatelliteEntity[]>();
    for (const sat of satellites) {
      const constellation = getConstellation(sat);
      if (!constellation || constellation === 'Starlink') continue;
      if (!groups.has(constellation)) groups.set(constellation, []);
      groups.get(constellation)!.push(sat);
    }

    const paths: PathEntry[] = [];
    const MAX_CONNECT_KM = 12000;

    for (const [constellation, sats] of groups) {
      if (sats.length < 2) continue;
      const color = CONSTELLATION_COLORS[constellation] + '88';

      const sorted = [...sats].sort((a, b) => a.lng - b.lng);

      // Greedy nearest-neighbor chain
      const connected = new Set<number>();
      connected.add(0);
      let current = 0;

      while (connected.size < sorted.length) {
        let nearestIdx = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < sorted.length; i++) {
          if (connected.has(i)) continue;
          const dist = haversineKm(
            sorted[current].lat, sorted[current].lng,
            sorted[i].lat, sorted[i].lng
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        if (nearestIdx === -1 || nearestDist > MAX_CONNECT_KM) break;

        const s1 = sorted[current];
        const s2 = sorted[nearestIdx];
        const alt = Math.min(s1.alt, s2.alt) / 6371;
        paths.push({
          _kind: 'constellation',
          constellation,
          color,
          coords: [
            { lat: s1.lat, lng: s1.lng, alt },
            { lat: s2.lat, lng: s2.lng, alt },
          ],
        });

        connected.add(nearestIdx);
        current = nearestIdx;
      }
    }

    return paths;
  }, [layers.satelliteOrbits, satellites]);

  // Weapon range circles
  const weaponRangePaths: PathEntry[] = useMemo(
    () => {
      if (!layers.weaponRanges) return [];
      const paths: PathEntry[] = [];
      for (const site of WEAPON_RANGES) {
        for (const r of site.ranges) {
          paths.push({
            _kind: 'weaponRange' as const,
            site: `${site.name} (${site.operator})`,
            weapon: r.weapon,
            rangeKm: r.rangeKm,
            weaponType: r.type,
            coords: generateCircleCoords(site.lat, site.lng, r.rangeKm),
          });
        }
      }
      return paths;
    },
    [layers.weaponRanges]
  );

  // Nuclear exclusion / danger zone circles
  const nuclearZonePaths: PathEntry[] = useMemo(() => {
    if (!layers.nuclearSites) return [];
    const zones: { zone: 'Evacuation' | 'Shelter-in-place' | 'Monitoring'; radiusKm: number }[] = [
      { zone: 'Evacuation', radiusKm: 30 },
      { zone: 'Shelter-in-place', radiusKm: 100 },
      { zone: 'Monitoring', radiusKm: 300 },
    ];
    const paths: PathEntry[] = [];
    for (const site of NUCLEAR_SITES) {
      for (const z of zones) {
        const coords = generateCircleCoords(site.lat, site.lng, z.radiusKm);
        // Override altitude to 0.001 to sit just above terrain
        for (const c of coords) c.alt = 0.001;
        paths.push({
          _kind: 'nuclearZone',
          facility: site.name,
          zone: z.zone,
          radiusKm: z.radiusKm,
          risk: site.risk,
          coords,
        });
      }
    }
    return paths;
  }, [layers.nuclearSites]);

  const allPaths: PathEntry[] = useMemo(
    () => [...satelliteTrackPaths, ...aircraftTrailPaths, ...shipTrailPaths, ...frontLinePaths, ...seaCablePaths, ...constellationPaths, ...weaponRangePaths, ...nuclearZonePaths],
    [satelliteTrackPaths, aircraftTrailPaths, shipTrailPaths, frontLinePaths, seaCablePaths, constellationPaths, weaponRangePaths, nuclearZonePaths]
  );

  // Satellite connection arcs: military/spy/recon → nearest conflict zone + nav → GPS jam cells
  const arcsData: ArcEntry[] = useMemo(() => {
    if (!layers.satelliteConnections && !layers.refugeeFlows && !layers.cyberThreats && !layers.tradeRoutes && !layers.armsFlows) return [];
    const milArcs = layers.satelliteConnections ? getMilitarySatelliteConnections(
      satellites as any,
      conflictZones as any,
      20
    ) : [];
    const jamArcs = layers.satelliteConnections ? getGpsJamConnections(satellites as any, gpsJamCells as any) : [];
    // Refugee / displacement flow arcs
    const refugeeArcs: RefugeeArc[] = layers.refugeeFlows
      ? REFUGEE_FLOWS.map((flow) => ({
          _isRefugee: true as const,
          startLat: flow.startLat,
          startLng: flow.startLng,
          endLat: flow.endLat,
          endLng: flow.endLng,
          count: flow.count,
          from: flow.from,
          to: flow.to,
          year: flow.year,
        }))
      : [];
    // Cyber threat arcs (origin -> target)
    const cyberArcs: ArcEntry[] = layers.cyberThreats
      ? CYBER_THREATS.filter(t => t.active).map(t => ({
          startLat: t.originLat,
          startLng: t.originLng,
          startAlt: 0,
          endLat: t.targetLat,
          endLng: t.targetLng,
          endAlt: 0,
          color: cyberThreatColor(t.type),
          label: `<b>${t.group}</b><br/>${t.name}<br/><i>${t.description}</i><br/>${t.originCountry} \u2192 ${t.targetCountry}`,
          type: 'communications' as const,
        }))
      : [];
    // Trade route disruption arcs
    const tradeArcs: TradeRouteArc[] = layers.tradeRoutes
      ? TRADE_ROUTE_ARCS.map((route) => ({
          _isTradeRoute: true as const,
          ...route,
        }))
      : [];
    // Arms supply flow arcs
    const armsArcs: ArmsFlowArc[] = layers.armsFlows
      ? ARMS_FLOWS.map((flow) => ({
          _isArmsFlow: true as const,
          startLat: flow.startLat,
          startLng: flow.startLng,
          endLat: flow.endLat,
          endLng: flow.endLng,
          supplier: flow.supplier,
          recipient: flow.recipient,
          category: flow.category,
          value: flow.value,
        }))
      : [];
    return [...milArcs, ...jamArcs, ...refugeeArcs, ...cyberArcs, ...tradeArcs, ...armsArcs];
  }, [layers.satelliteConnections, layers.refugeeFlows, layers.cyberThreats, layers.tradeRoutes, layers.armsFlows, satellites, conflictZones, gpsJamCells]);

  // Satellite footprint rings
  const ringsData: FootprintRing[] = useMemo(
    () =>
      layers.satelliteFootprints
        ? getSatelliteFootprints(satellites as any, ['military', 'spy', 'reconnaissance', 'navigation'])
        : [],
    [layers.satelliteFootprints, satellites]
  );

  // ── Carrier Strike Group detection ─────────────────────────────────────────
  const carrierGroups: CarrierStrikeGroup[] = useMemo(
    () => (layers.carrierGroups ? detectCarrierGroups(ships) : []),
    [layers.carrierGroups, ships]
  );

  // ── Shared Three.js geometries/materials (avoid per-call allocation) ───────
  // No custom THREE objects — use built-in points layer instead to avoid duplicate Three.js instances

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

  // objectThreeObject removed — caused dual Three.js instance crash
  // Aircraft/ships visible via trail paths instead

  // ── Military base HTML markers ──────────────────────────────────────────────
  const militaryBaseMarkers = useMemo(
    () => (layers.militaryBases ? MILITARY_BASES.map(b => ({ ...b, _marker: 'base' as const })) : []),
    [layers.militaryBases]
  );

  // ── Energy infrastructure markers ──────────────────────────────────────────
  const energyMarkers = useMemo(
    () => (layers.energyInfra ? ENERGY_FACILITIES.map(f => ({ ...f, _marker: 'energy' as const })) : []),
    [layers.energyInfra]
  );

  // ── Nuclear site markers ──────────────────────────────────────────────────
  const nuclearMarkers: NuclearMarker[] = useMemo(
    () => (layers.nuclearSites ? NUCLEAR_SITES.map(s => ({ ...s, _marker: 'nuclear' as const })) : []),
    [layers.nuclearSites]
  );

  // ── Piracy zone markers ──────────────────────────────────────────────────
  const piracyMarkers = useMemo(
    () => (layers.piracyZones ? PIRACY_ZONES.map(z => ({ ...z, _marker: 'piracy' as const })) : []),
    [layers.piracyZones]
  );

    // ── Chokepoint markers ──────────────────────────────────────────────────────
  const chokepointMarkers = useMemo(
    () => layers.chokepoints
      ? CHOKEPOINTS.map(cp => ({ ...cp, _marker: 'chokepoint' as const }))
      : [],
    [layers.chokepoints]
  );

// ── Unified HTML markers (military bases + energy infra + nuclear) ────────
  const htmlMarkers = useMemo(
    () => [...militaryBaseMarkers, ...energyMarkers, ...nuclearMarkers, ...piracyMarkers, ...chokepointMarkers],
    [militaryBaseMarkers, energyMarkers, nuclearMarkers, piracyMarkers, chokepointMarkers]
  );

  const htmlMarkerElement = useCallback((d: object) => {
    const obj = d as { _marker: string };

    // ── Energy infrastructure ──
    if (obj._marker === 'energy') {
      const fac = d as EnergyFacility & { _marker: string };
      const color = energyRiskColor(fac.risk);
      const icon = energyTypeIcon(fac.type);

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '0';
      wrapper.style.height = '0';
      wrapper.style.cursor = 'pointer';
      wrapper.style.pointerEvents = 'auto';

      // Colored dot with icon
      const dot = document.createElement('div');
      dot.style.position = 'absolute';
      dot.style.width = '16px';
      dot.style.height = '16px';
      dot.style.left = '-8px';
      dot.style.top = '-8px';
      dot.style.borderRadius = '50%';
      dot.style.background = `radial-gradient(circle, ${color}cc 30%, ${color}44 100%)`;
      dot.style.border = `1.5px solid ${color}`;
      dot.style.boxShadow = `0 0 6px ${color}88`;
      dot.style.display = 'flex';
      dot.style.alignItems = 'center';
      dot.style.justifyContent = 'center';
      dot.style.fontSize = '9px';
      dot.style.lineHeight = '1';
      dot.textContent = icon;
      wrapper.appendChild(dot);

      // Hover label
      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.left = '12px';
      label.style.top = '-8px';
      label.style.whiteSpace = 'nowrap';
      label.style.background = 'rgba(0,0,0,0.9)';
      label.style.color = color;
      label.style.fontSize = '10px';
      label.style.fontFamily = "'Courier New', monospace";
      label.style.padding = '3px 7px';
      label.style.borderRadius = '3px';
      label.style.border = `1px solid ${color}55`;
      label.style.pointerEvents = 'none';
      label.style.opacity = '0';
      label.style.transition = 'opacity 0.15s';
      label.style.zIndex = '10';

      const typeLabel = fac.type.replace(/_/g, ' ').toUpperCase();
      const conflictLine = fac.nearConflict ? `Near conflict: ${fac.nearConflict}` : '';
      label.innerHTML = `<b>${escHtml(fac.name)}</b><br/>${escHtml(typeLabel)} | ${escHtml(fac.country)}<br/>Capacity: ${escHtml(fac.capacity)}<br/>Risk: ${escHtml(fac.risk.toUpperCase())}${conflictLine ? '<br/>' + escHtml(conflictLine) : ''}`;
      wrapper.appendChild(label);

      wrapper.addEventListener('mouseenter', () => { label.style.opacity = '1'; });
      wrapper.addEventListener('mouseleave', () => { label.style.opacity = '0'; });

      wrapper.title = `${fac.name}\n${typeLabel} | ${fac.country}\nCapacity: ${fac.capacity}\nRisk: ${fac.risk.toUpperCase()}${conflictLine ? '\n' + conflictLine : ''}`;

      return wrapper;
    }

    // ── Nuclear facility ──
    if (obj._marker === 'nuclear') {
      const nuc = d as NuclearMarker;
      const color = nuclearRiskColor(nuc.risk);
      const pulse = nuclearPulseSpeed(nuc.risk);

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '0';
      wrapper.style.height = '0';
      wrapper.style.cursor = 'pointer';
      wrapper.style.pointerEvents = 'auto';

      // Pulsing glow ring
      const glow = document.createElement('div');
      glow.style.position = 'absolute';
      glow.style.width = '28px';
      glow.style.height = '28px';
      glow.style.left = '-14px';
      glow.style.top = '-14px';
      glow.style.borderRadius = '50%';
      glow.style.background = `radial-gradient(circle, ${color}66 0%, transparent 70%)`;
      glow.style.animation = `nuclear-pulse ${pulse} ease-in-out infinite`;
      wrapper.appendChild(glow);

      // Nuclear icon
      const icon = document.createElement('div');
      icon.style.position = 'absolute';
      icon.style.left = '-10px';
      icon.style.top = '-10px';
      icon.style.width = '20px';
      icon.style.height = '20px';
      icon.style.display = 'flex';
      icon.style.alignItems = 'center';
      icon.style.justifyContent = 'center';
      icon.style.fontSize = '14px';
      icon.style.borderRadius = '50%';
      icon.style.background = 'rgba(0,0,0,0.7)';
      icon.style.border = `2px solid ${color}`;
      icon.style.boxShadow = `0 0 8px ${color}, 0 0 16px ${color}44`;
      icon.style.color = color;
      icon.style.lineHeight = '1';
      icon.textContent = '\u2622'; // radioactive symbol
      wrapper.appendChild(icon);

      // Label (shown on hover)
      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.left = '14px';
      label.style.top = '-8px';
      label.style.whiteSpace = 'nowrap';
      label.style.background = 'rgba(0,0,0,0.85)';
      label.style.color = color;
      label.style.fontSize = '10px';
      label.style.fontFamily = "'Courier New', monospace";
      label.style.padding = '2px 6px';
      label.style.borderRadius = '3px';
      label.style.border = `1px solid ${color}55`;
      label.style.pointerEvents = 'none';
      label.style.opacity = '0';
      label.style.transition = 'opacity 0.15s';
      label.textContent = `${nuc.name} [${nuc.risk.toUpperCase()}]`;
      wrapper.appendChild(label);

      wrapper.addEventListener('mouseenter', () => { label.style.opacity = '1'; });
      wrapper.addEventListener('mouseleave', () => { label.style.opacity = '0'; });

      wrapper.title = `${nuc.name}\n${nuc.country} | ${nuc.type.replace('_', ' ')} | ${nuc.status}\nRisk: ${nuc.risk.toUpperCase()}`;

      return wrapper;
    }

    // ── Piracy zone ──
    if (obj._marker === 'piracy') {
      const pz = d as PiracyZone & { _marker: string };
      const color = piracyZoneColor(pz.risk);
      const size = Math.min(50, Math.max(20, Math.round(pz.radius / 8)));

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '0';
      wrapper.style.height = '0';
      wrapper.style.cursor = 'pointer';
      wrapper.style.pointerEvents = 'auto';

      const circle = document.createElement('div');
      circle.style.position = 'absolute';
      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.left = `${-size / 2}px`;
      circle.style.top = `${-size / 2}px`;
      circle.style.borderRadius = '50%';
      circle.style.border = `2px solid ${color}`;
      circle.style.background = pz.risk === 'critical' ? 'rgba(255,34,34,0.15)'
        : pz.risk === 'high' ? 'rgba(255,136,0,0.15)'
        : 'rgba(255,221,0,0.15)';
      circle.style.animation = `piracy-pulse-${pz.risk} 2s ease-in-out infinite`;
      wrapper.appendChild(circle);

      const hoverIcon = document.createElement('div');
      hoverIcon.style.position = 'absolute';
      hoverIcon.style.left = '-8px';
      hoverIcon.style.top = '-8px';
      hoverIcon.style.width = '16px';
      hoverIcon.style.height = '16px';
      hoverIcon.style.display = 'flex';
      hoverIcon.style.alignItems = 'center';
      hoverIcon.style.justifyContent = 'center';
      hoverIcon.style.fontSize = '12px';
      hoverIcon.style.opacity = '0';
      hoverIcon.style.transition = 'opacity 0.15s';
      hoverIcon.style.pointerEvents = 'none';
      hoverIcon.textContent = '\u2620';
      wrapper.appendChild(hoverIcon);

      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.left = `${size / 2 + 4}px`;
      label.style.top = '-8px';
      label.style.whiteSpace = 'nowrap';
      label.style.background = 'rgba(0,0,0,0.85)';
      label.style.color = color;
      label.style.fontSize = '10px';
      label.style.fontFamily = "'Courier New', monospace";
      label.style.padding = '2px 6px';
      label.style.borderRadius = '3px';
      label.style.border = `1px solid ${color}55`;
      label.style.pointerEvents = 'none';
      label.style.opacity = '0';
      label.style.transition = 'opacity 0.15s';
      label.textContent = `\u2620 ${pz.name} [${pz.risk.toUpperCase()}]`;
      wrapper.appendChild(label);

      wrapper.addEventListener('mouseenter', () => {
        label.style.opacity = '1';
        hoverIcon.style.opacity = '1';
      });
      wrapper.addEventListener('mouseleave', () => {
        label.style.opacity = '0';
        hoverIcon.style.opacity = '0';
      });

      wrapper.title = `\u2620 ${pz.name}\nRisk: ${pz.risk.toUpperCase()}\nType: ${pz.type.replace(/_/g, ' ')}\nIncidents (2024): ${pz.incidents2024}\n${pz.description}`;
      return wrapper;
    }

    // ── Chokepoint marker — pulsing ring + oil flow volume ring ──
    if (obj._marker === 'chokepoint') {
      const cp = d as Chokepoint & { _marker: string };
      const cpColor = chokepointRiskColor(cp.risk);
      const ringSize = chokepointRingSize(cp.dailyTraffic);
      const pulseSpeed = cp.risk === 'critical' ? '1.2s' : cp.risk === 'high' ? '1.8s' : '2.5s';
      const flowM = parseOilFlowM(cp.oilFlow);
      const flowRingPx = oilFlowRingSize(cp.oilFlow);
      const flowPulse = oilFlowPulseSpeed(cp.risk);

      const wrapper = document.createElement('div');
      wrapper.className = 'chokepoint-marker';
      wrapper.style.position = 'relative';
      wrapper.style.cursor = 'pointer';
      wrapper.style.pointerEvents = 'auto';

      // Oil flow volume ring — size correlates with bbl/day
      if (flowM > 0) {
        const flowRing = document.createElement('div');
        flowRing.style.position = 'absolute';
        flowRing.style.top = '50%';
        flowRing.style.left = '50%';
        flowRing.style.width = `${flowRingPx}px`;
        flowRing.style.height = `${flowRingPx}px`;
        flowRing.style.borderRadius = '50%';
        flowRing.style.border = `1.5px dashed ${cpColor}88`;
        flowRing.style.background = `radial-gradient(circle, ${cpColor}18 0%, transparent 70%)`;
        flowRing.style.pointerEvents = 'none';
        flowRing.style.animation = `oil-flow-ring ${flowPulse} ease-in-out infinite`;
        wrapper.appendChild(flowRing);
      }

      const ring = document.createElement('div');
      ring.style.width = `${ringSize}px`;
      ring.style.height = `${ringSize}px`;
      ring.style.borderRadius = '50%';
      ring.style.border = `2px solid ${cpColor}`;
      ring.style.background = 'transparent';
      ring.style.boxShadow = `0 0 ${ringSize / 2}px ${cpColor}, inset 0 0 ${ringSize / 3}px ${cpColor}44`;
      ring.style.animation = `chokepoint-pulse ${pulseSpeed} ease-in-out infinite`;

      const cpDot = document.createElement('div');
      cpDot.style.position = 'absolute';
      cpDot.style.top = '50%';
      cpDot.style.left = '50%';
      cpDot.style.transform = 'translate(-50%, -50%)';
      cpDot.style.width = '6px';
      cpDot.style.height = '6px';
      cpDot.style.borderRadius = '50%';
      cpDot.style.background = cpColor;
      cpDot.style.boxShadow = `0 0 6px ${cpColor}`;

      const tooltip = document.createElement('div');
      tooltip.className = 'chokepoint-tooltip';
      const rlc = cp.risk === 'critical' ? '#ff2222' : cp.risk === 'high' ? '#ff8800' : '#ffdd00';
      const pctGlobal = flowM > 0 ? `${flowM.toFixed(1)}% of global` : 'N/A';
      tooltip.innerHTML = `<div style="color:${rlc};font-weight:bold;font-size:12px;margin-bottom:4px">${escHtml(cp.name)}</div>`
        + `<div>Width: <span style="color:#fff">${escHtml(cp.width)}</span></div>`
        + `<div>Daily Traffic: <span style="color:#fff">${escHtml(cp.dailyTraffic)}</span></div>`
        + `<div>Oil Flow: <span style="color:#fff">${escHtml(cp.oilFlow)}</span> <span style="color:#aab;font-size:10px">(${escHtml(pctGlobal)})</span></div>`
        + `<div>Risk: <span style="color:${rlc}">${escHtml(cp.risk.toUpperCase())}</span></div>`
        + `<div>Threat: <span style="color:#ff8866">${escHtml(cp.threat)}</span></div>`;

      wrapper.appendChild(ring);
      wrapper.appendChild(cpDot);
      wrapper.appendChild(tooltip);
      return wrapper;
    }

    // ── Military base (default) ──
    const base = d as MilitaryBase & { _marker: string };
    const color = militaryBaseColor(base.operator);
    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.width = '0';
    el.style.height = '0';
    // Diamond shape: top triangle
    el.style.borderLeft = '5px solid transparent';
    el.style.borderRight = '5px solid transparent';
    el.style.borderBottom = `8px solid ${color}`;
    el.style.filter = `drop-shadow(0 0 3px ${color})`;
    el.style.cursor = 'pointer';
    el.style.pointerEvents = 'auto';
    // Bottom triangle to complete diamond
    const bottomHalf = document.createElement('div');
    bottomHalf.style.position = 'absolute';
    bottomHalf.style.top = '8px';
    bottomHalf.style.left = '-5px';
    bottomHalf.style.width = '0';
    bottomHalf.style.height = '0';
    bottomHalf.style.borderLeft = '5px solid transparent';
    bottomHalf.style.borderRight = '5px solid transparent';
    bottomHalf.style.borderTop = `5px solid ${color}`;
    el.appendChild(bottomHalf);
    el.title = `${base.name}\nOperator: ${base.operator}\nBranch: ${base.branch}\nType: ${base.type.replace(/_/g, ' ')}\nCountry: ${base.country}`;
    return el;
  }, []);


  // ── Carrier Strike Group HTML element factory ────────────────────────────
  const csgMarkerElement = useCallback((csg: CarrierStrikeGroup) => {
    const glow = navyGlow(csg.country);
    const ringSize = Math.max(40, Math.min(80, csg.radiusKm * 1.5));

    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = `${ringSize}px`;
    container.style.height = `${ringSize}px`;
    container.style.marginLeft = `-${ringSize / 2}px`;
    container.style.marginTop = `-${ringSize / 2}px`;
    container.style.pointerEvents = 'auto';
    container.style.cursor = 'pointer';

    // Outer pulsing ring
    const ring = document.createElement('div');
    ring.style.position = 'absolute';
    ring.style.inset = '0';
    ring.style.borderRadius = '50%';
    ring.style.border = `2px solid ${glow}`;
    ring.style.boxShadow = `0 0 12px ${glow}44, inset 0 0 8px ${glow}22`;
    ring.style.opacity = '0.7';
    ring.style.animation = 'csg-pulse 3s ease-in-out infinite';
    container.appendChild(ring);

    // Inner translucent fill
    const fill = document.createElement('div');
    fill.style.position = 'absolute';
    fill.style.inset = '4px';
    fill.style.borderRadius = '50%';
    fill.style.background = `${csg.color}15`;
    fill.style.border = `1px dashed ${glow}55`;
    container.appendChild(fill);

    // CSG label above ring
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.bottom = `${ringSize + 4}px`;
    label.style.left = '50%';
    label.style.transform = 'translateX(-50%)';
    label.style.whiteSpace = 'nowrap';
    label.style.fontFamily = "'Courier New', monospace";
    label.style.fontSize = '10px';
    label.style.fontWeight = '700';
    label.style.letterSpacing = '0.08em';
    label.style.color = glow;
    label.style.textShadow = `0 0 6px ${glow}`;
    label.style.pointerEvents = 'none';
    label.textContent = csg.name;
    container.appendChild(label);

    // Tooltip
    container.title = `${csg.name}\n${csg.country}\nFormation: ${csg.composition}\nShips: ${csg.ships.map(s => s.name).join(', ')}`;

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      onEntityClick('carrierGroup', csg);
    });

    return container;
  }, [onEntityClick]);

  // ── Merged HTML markers (military bases + carrier strike groups) ──────────
  const mergedHtmlMarkers = useMemo(
    () => [...htmlMarkers, ...carrierGroups],
    [htmlMarkers, carrierGroups]
  );

  // Unified HTML element factory dispatching by _marker tag
  const mergedHtmlElement = useCallback((d: object) => {
    const marker = d as { _marker: string };
    if (marker._marker === 'csg') {
      return csgMarkerElement(d as CarrierStrikeGroup);
    }
    return htmlMarkerElement(d);
  }, [csgMarkerElement, htmlMarkerElement]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="globe-container" style={{ width: '100%', height: '100%', background: '#000010' }}>
      <GlobeGL
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        // ── Globe appearance
        globeImageUrl="https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg"
        backgroundImageUrl="https://unpkg.com/three-globe@2.31.0/example/img/night-sky.png"
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
        // ── Drone activity heatmap ──────────────────────────────
        heatmapsData={droneActivityHeatmap}
        heatmapPoints={(d: object) => (d as { points: unknown[] }).points}
        heatmapPointLat={(d: object) => (d as { lat: number }).lat}
        heatmapPointLng={(d: object) => (d as { lng: number }).lng}
        heatmapPointWeight={(d: object) => (d as { weight: number }).weight}
        heatmapBandwidth={1.5}
        heatmapColorFn={droneHeatmapColor}
        heatmapColorSaturation={2.0}
        heatmapBaseAltitude={0.006}
        heatmapTopAltitude={0.04}


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
          if (entry._kind === 'frontline') return '#ff1111';
          if (entry._kind === 'weaponRange') return weaponRangeColor(entry.weaponType);
          if (entry._kind === 'sat') return satelliteColorDim(entry.sat.category);
          if (entry._kind === 'aircraft') return entry.aircraft.isMilitary ? 'rgba(255,51,51,0.35)' : 'rgba(0,170,255,0.35)';
          if (entry._kind === 'ship') return shipTrailColor(entry.ship.type);
          if (entry._kind === 'seaCable') return cableRiskColor(entry.cable.risk);
          if (entry._kind === 'constellation') return entry.color;
          if (entry._kind === 'nuclearZone') {
            const bright = entry.risk === 'critical';
            if (entry.zone === 'Evacuation') return bright ? 'rgba(255,40,40,0.12)' : 'rgba(255,40,40,0.08)';
            if (entry.zone === 'Shelter-in-place') return bright ? 'rgba(255,165,0,0.08)' : 'rgba(255,165,0,0.05)';
            return bright ? 'rgba(255,255,0,0.05)' : 'rgba(255,255,0,0.03)';
          }
          return '#aaaaaa';
        }}
        pathDashLength={(d: object) => {
          const entry = d as PathEntry;
          if (entry._kind === 'weaponRange') return 0.6;
          if (entry._kind === 'seaCable') return 0.4;
          if (entry._kind === 'constellation') return 0.6;
          if (entry._kind === 'nuclearZone') {
            if (entry.zone === 'Evacuation') return 2;     // solid (large dash, no gap)
            if (entry.zone === 'Shelter-in-place') return 0.4; // dashed
            return 0.15;                                       // dotted
          }
          return 0.5;
        }}
        pathDashGap={(d: object) => {
          const entry = d as PathEntry;
          if (entry._kind === 'weaponRange') return 0.3;
          if (entry._kind === 'seaCable') return 0.2;
          if (entry._kind === 'constellation') return 0.3;
          if (entry._kind === 'nuclearZone') {
            if (entry.zone === 'Evacuation') return 0;        // solid
            if (entry.zone === 'Shelter-in-place') return 0.3; // dashed
            return 0.15;                                        // dotted
          }
          return 0.3;
        }}
        pathStroke={(d: object) => {
          const entry = d as PathEntry;
          if (entry._kind === 'weaponRange') return 0.8;
          if (entry._kind === 'seaCable') return 1.2;
          if (entry._kind === 'constellation') return 0.8;
          if (entry._kind === 'nuclearZone') return entry.risk === 'critical' ? 0.9 : 0.6;
          return 0.5;
        }}
        pathLabel={(d: object) => {
          const entry = d as PathEntry;
          if (entry._kind === 'weaponRange') {
            return `<div style="background:rgba(5,15,30,0.95);border:1px solid rgba(0,255,136,0.4);border-radius:4px;padding:8px 10px;font-family:monospace;font-size:11px;color:#cde;line-height:1.5">` +
              `<b style="color:${weaponRangeColor(entry.weaponType)}">${entry.weapon}</b><br/>` +
              `Range: ${entry.rangeKm.toLocaleString()} km<br/>` +
              `<span style="color:#888">${entry.site}</span></div>`;
          }
          if (entry._kind === 'nuclearZone') {
            const zoneColors = { Evacuation: '#ff4040', 'Shelter-in-place': '#ffa500', Monitoring: '#ffff00' };
            const zc = zoneColors[entry.zone];
            return `<div style="background:rgba(5,15,30,0.95);border:1px solid ${zc};border-radius:4px;padding:8px 10px;font-family:monospace;font-size:11px;color:#cde;line-height:1.5">` +
              `<b style="color:${zc}">${entry.facility}</b><br/>` +
              `${entry.zone} zone (${entry.radiusKm}km)</div>`;
          }
          if (entry._kind === 'seaCable') {
            const c = entry.cable;
            const rc = cableRiskColor(c.risk);
            return `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:4px;border:1px solid ${rc};font-family:monospace;font-size:11px;color:#eee;line-height:1.4">
              <b style="color:${rc}">${c.name}</b><br/>
              Capacity: ${c.capacity}<br/>
              Risk: <span style="color:${rc};font-weight:bold">${c.risk.toUpperCase()}</span>${c.nearConflict ? `<br/>Near: ${c.nearConflict}` : ''}
            </div>`;
          }
          return '';
        }}

        // ── Connection arcs (military → conflict, nav → GPS jam) ──
        arcsData={arcsData}
        arcStartLat={(d: object) => (d as ArcConnection).startLat}
        arcStartLng={(d: object) => (d as ArcConnection).startLng}
        arcEndLat={(d: object) => (d as ArcConnection).endLat}
        arcEndLng={(d: object) => (d as ArcConnection).endLng}
        arcColor={(d: object) => {
          if (isRefugeeArc(d)) return ['rgba(255,140,0,0.9)', 'rgba(220,40,40,0.9)'];
          if (isTradeRouteArc(d)) {
            const t = d as TradeRouteArc;
            return t.status === 'disrupted'
              ? ['rgba(255,50,50,0.8)', 'rgba(255,50,50,0.3)']
              : ['rgba(0,255,136,0.6)', 'rgba(0,255,136,0.2)'];
          }
          if (isArmsFlowArc(d)) {
            const a = d as ArmsFlowArc;
            const c = armsFlowColor(a.category);
            return [c, c.replace(/[\d.]+\)$/, '0.3)')];
          }
          return (d as ArcConnection).color;
        }}
        arcLabel={(d: object) => {
          if (isRefugeeArc(d)) {
            const r = d as RefugeeArc;
            return `<b style="color:#ff6644">${formatRefugeeCount(r.count)} displaced</b><br/>${r.from} → ${r.to}<br/><i>${r.year}</i>`;
          }
          if (isTradeRouteArc(d)) {
            const t = d as TradeRouteArc;
            const statusColor = t.status === 'disrupted' ? '#ff3333' : '#00ff88';
            const statusIcon = t.status === 'disrupted' ? '\u2716' : '\u2714';
            return `<div style="background:rgba(5,15,30,0.95);border:1px solid ${statusColor};border-radius:4px;padding:8px 10px;font-family:monospace;font-size:11px;color:#cde;line-height:1.5">` +
              `<b style="color:${statusColor}">${statusIcon} ${t.name}</b><br/>` +
              `Status: <span style="color:${statusColor};font-weight:bold">${t.status.toUpperCase()}</span><br/>` +
              `<span style="color:#888">Trade route ${t.status === 'disrupted' ? 'blocked by conflict' : 'alternative shipping lane'}</span></div>`;
          }
          if (isArmsFlowArc(d)) {
            const a = d as ArmsFlowArc;
            const c = armsFlowColor(a.category);
            return `<div style="background:rgba(5,15,30,0.95);border:1px solid ${c};border-radius:4px;padding:8px 10px;font-family:monospace;font-size:11px;color:#cde;line-height:1.5">` +
              `<b style="color:${c}">${a.supplier} \u2192 ${a.recipient}</b><br/>` +
              `Category: ${a.category.replace(/_/g, ' ')}<br/>` +
              `Value: ${a.value}</div>`;
          }
          return (d as ArcConnection).label;
        }}
        arcAltAutoScale={0.3}
        arcStroke={(d: object) => {
          if (isRefugeeArc(d)) return refugeeArcWidth((d as RefugeeArc).count);
          if (isTradeRouteArc(d)) return (d as TradeRouteArc).status === 'disrupted' ? 1.8 : 1.2;
          if (isArmsFlowArc(d)) { const a = d as ArmsFlowArc; return armsFlowStroke(a.category, a.value); }
          return 0.5;
        }}
        arcDashLength={(d: object) => {
          if (isRefugeeArc(d)) return 0.6;
          if (isTradeRouteArc(d)) return (d as TradeRouteArc).status === 'disrupted' ? 0.3 : 0.5;
          if (isArmsFlowArc(d)) return 0.5;
          return 0.4;
        }}
        arcDashGap={(d: object) => {
          if (isRefugeeArc(d)) return 0.3;
          if (isTradeRouteArc(d)) return (d as TradeRouteArc).status === 'disrupted' ? 0.4 : 0.2;
          if (isArmsFlowArc(d)) return 0.25;
          return 0.2;
        }}
        arcDashAnimateTime={(d: object) => {
          if (isRefugeeArc(d)) return 2500;
          if (isTradeRouteArc(d)) return (d as TradeRouteArc).status === 'disrupted' ? 0 : 2000;
          if (isArmsFlowArc(d)) return 2000;
          return 1500;
        }}

        // ── Satellite footprint rings ──────────────────────────
        ringsData={ringsData}
        ringLat={(d: object) => (d as FootprintRing).lat}
        ringLng={(d: object) => (d as FootprintRing).lng}
        ringMaxR={(d: object) => (d as FootprintRing).maxR}
        ringColor={(d: object) => (d as FootprintRing).color}
        ringPropagationSpeed={2}
        ringRepeatPeriod={800}

        // HTML elements disabled — isBehindGlobe crash in three-render-objects
        // htmlElementsData={mergedHtmlMarkers}
        // htmlLat={(d: object) => (d as { lat: number }).lat}
        // htmlLng={(d: object) => (d as { lng: number }).lng}
        // htmlAltitude={0.008}
        // htmlElement={mergedHtmlElement}


      />

    </div>
  );
});

export default Globe;
