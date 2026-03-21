import { throwIfRateLimited } from './rateLimitError';

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

interface Alert {
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

export async function fetchLiveGpsJamData(): Promise<GpsJamCell[]> {
  try {
    const res = await fetch('/api/gpsjam/current');
    throwIfRateLimited(res, 'GPSJam');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: unknown[] = await res.json();
    const cells: GpsJamCell[] = raw.map((item: any) => ({
      lat: Number(item.lat),
      lng: Number(item.lng),
      level: Number(item.level ?? item.intensity ?? 0),
      radius: Number(item.radius ?? 100),
      date: String(item.date ?? new Date().toISOString()),
      confirmed: Boolean(item.confirmed ?? true),
      type: (['spoofing', 'jamming'].includes(item.type) ? item.type : 'unknown') as GpsJamCell['type'],
      source: item.source ?? 'GPSJam.org / live',
    }));
    if (cells.length === 0) throw new Error('Empty response');
    console.log(`[GPS Jam] Live data loaded: ${cells.length} cells`);
    return cells;
  } catch {
    console.log('[GPS Jam] Live data unavailable, using static hotspots');
    return getStaticGpsJamHotspots();
  }
}

export function getStaticGpsJamHotspots(): GpsJamCell[] {
  const now = new Date().toISOString();
  return [
    { lat: 54.7,  lng: 20.5,  level: 0.90, radius: 250, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Kaliningrad, Russia
    { lat: 48.0,  lng: 37.8,  level: 0.95, radius: 180, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Eastern Ukraine/Donbas
    { lat: 43.5,  lng: 34.0,  level: 0.85, radius: 400, date: now, confirmed: true, type: 'spoofing', source: 'GPSJam.org / OSINT' }, // Black Sea
    { lat: 33.0,  lng: 35.5,  level: 0.90, radius: 200, date: now, confirmed: true, type: 'spoofing', source: 'GPSJam.org / OSINT' }, // Northern Israel/Lebanon
    { lat: 31.4,  lng: 34.4,  level: 0.95, radius: 100, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Gaza Strip
    { lat: 33.3,  lng: 44.4,  level: 0.70, radius: 150, date: now, confirmed: true, type: 'spoofing', source: 'GPSJam.org / OSINT' }, // Iraq/Baghdad area
    { lat: 34.8,  lng: 38.5,  level: 0.65, radius: 200, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Syria (Assad-controlled areas)
    { lat: 14.5,  lng: 43.0,  level: 0.80, radius: 300, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Red Sea / Yemen coast (Houthi)
    { lat: 12.0,  lng: 48.0,  level: 0.75, radius: 250, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Gulf of Aden
    { lat: 60.0,  lng: 27.0,  level: 0.70, radius: 150, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Baltic Sea (Finnish border)
    { lat: 35.5,  lng: 35.0,  level: 0.60, radius: 350, date: now, confirmed: true, type: 'spoofing', source: 'GPSJam.org / OSINT' }, // Eastern Mediterranean
    { lat: 38.0,  lng: 126.5, level: 0.80, radius: 200, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // North Korea border / DMZ
    { lat: 16.0,  lng: 114.0, level: 0.50, radius: 500, date: now, confirmed: true, type: 'spoofing', source: 'GPSJam.org / OSINT' }, // South China Sea
    { lat: 35.7,  lng: 51.4,  level: 0.60, radius: 100, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Iran (Tehran area)
    { lat: 45.3,  lng: 34.1,  level: 0.90, radius: 200, date: now, confirmed: true, type: 'jamming',  source: 'GPSJam.org / OSINT' }, // Crimea
  ];
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getJammingIntensityAtPoint(lat: number, lng: number, cells: GpsJamCell[]): number {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 0;
  let total = 0;
  for (const cell of cells) {
    const dist = haversineDistanceKm(lat, lng, cell.lat, cell.lng);
    const contribution = cell.level * Math.max(0, 1 - dist / cell.radius);
    total += contribution;
  }
  return Math.min(1.0, total);
}

export function getActiveJammingAlerts(cells: GpsJamCell[]): Alert[] {
  const now = new Date().toISOString();
  const highAlerts: Alert[] = cells
    .filter((cell) => cell.level > 0.8)
    .map((cell) => ({
      id: `gps-jam-${cell.lat.toFixed(4)}-${cell.lng.toFixed(4)}`,
      type: 'gps-jam' as const,
      severity: (cell.level > 0.9 ? 'critical' : 'warning') as 'critical' | 'warning',
      message: `${cell.level > 0.9 ? 'Critical' : 'High'} GPS ${cell.type} detected at (${cell.lat.toFixed(1)}, ${cell.lng.toFixed(1)}) — intensity ${Math.round(cell.level * 100)}%, radius ${cell.radius} km`,
      lat: cell.lat,
      lng: cell.lng,
      timestamp: now,
      dismissed: false,
    }));
  const mediumAlerts: Alert[] = cells
    .filter((cell) => cell.level >= 0.5 && cell.level <= 0.8)
    .map((cell) => ({
      id: `gps-jam-${cell.lat.toFixed(4)}-${cell.lng.toFixed(4)}`,
      type: 'gps-jam' as const,
      severity: 'warning' as const,
      message: `Moderate GPS ${cell.type} detected at (${cell.lat.toFixed(1)}, ${cell.lng.toFixed(1)}) — intensity ${Math.round(cell.level * 100)}%, radius ${cell.radius} km`,
      lat: cell.lat,
      lng: cell.lng,
      timestamp: now,
      dismissed: false,
    }));
  return [...highAlerts, ...mediumAlerts];
}
