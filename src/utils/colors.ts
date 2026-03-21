export const COLORS = {
  // Background
  globeAtmosphere: '#0a1628',
  globeNight: '#050d1a',

  // Satellites by category
  satellite: {
    iss: '#00ffff',
    military: '#ff4444',
    spy: '#ff6600',
    reconnaissance: '#ff8800',
    navigation: '#44ff44',
    weather: '#ffff44',
    starlink: '#8888ff',
    commercial: '#aaaaff',
    other: '#888888',
  },

  // Aircraft
  aircraft: {
    military: '#ff4444',
    civilian: '#00aaff',
    ground: '#666666',
    trail: 'rgba(0, 170, 255, 0.3)',
    militaryTrail: 'rgba(255, 68, 68, 0.4)',
  },

  // Ships
  ship: {
    warship: '#ff2222',
    military: '#ff4444',
    tanker: '#ff8800',
    cargo: '#ffaa00',
    passenger: '#44aaff',
    fishing: '#44ff88',
    research: '#aa88ff',
    other: '#888888',
  },

  // Conflict intensity
  conflict: {
    critical: '#ff1111',
    high: '#ff6600',
    medium: '#ffaa00',
    low: '#ffff44',
    ceasefire: '#888888',
    polygon: {
      critical: 'rgba(255, 17, 17, 0.25)',
      high: 'rgba(255, 102, 0, 0.2)',
      medium: 'rgba(255, 170, 0, 0.15)',
      low: 'rgba(255, 255, 68, 0.1)',
    },
  },

  // GPS Jamming
  gpsJam: {
    low: 'rgba(255, 255, 0, 0.3)',
    medium: 'rgba(255, 140, 0, 0.4)',
    high: 'rgba(255, 50, 0, 0.5)',
    critical: 'rgba(255, 0, 0, 0.6)',
  },

  // UI
  ui: {
    primary: '#00ff88',
    secondary: '#0088ff',
    accent: '#ff6600',
    background: 'rgba(5, 15, 30, 0.92)',
    backgroundLight: 'rgba(10, 25, 50, 0.85)',
    border: 'rgba(0, 255, 136, 0.3)',
    borderHover: 'rgba(0, 255, 136, 0.7)',
    text: '#e0e8f0',
    textDim: '#7a9ab0',
    textBright: '#ffffff',
    danger: '#ff3333',
    warning: '#ffaa00',
    success: '#00ff88',
    info: '#44aaff',
  },

  // Arcs / connection lines
  arc: {
    satellite: 'rgba(0, 255, 136, 0.6)',
    military: 'rgba(255, 68, 68, 0.7)',
    gpsJam: 'rgba(255, 200, 0, 0.5)',
  },
};

/**
 * Get color for a satellite by its category string.
 */
export function getSatelliteColor(category: string): string {
  const key = category.toLowerCase();
  const map: Record<string, string> = {
    iss: COLORS.satellite.iss,
    military: COLORS.satellite.military,
    spy: COLORS.satellite.spy,
    reconnaissance: COLORS.satellite.reconnaissance,
    navigation: COLORS.satellite.navigation,
    gps: COLORS.satellite.navigation,
    glonass: COLORS.satellite.navigation,
    weather: COLORS.satellite.weather,
    starlink: COLORS.satellite.starlink,
    commercial: COLORS.satellite.commercial,
  };
  return map[key] ?? COLORS.satellite.other;
}

/**
 * Get color for an aircraft based on whether it is military and whether it is on the ground.
 */
export function getAircraftColor(isMilitary: boolean, onGround: boolean): string {
  if (onGround) return COLORS.aircraft.ground;
  return isMilitary ? COLORS.aircraft.military : COLORS.aircraft.civilian;
}

/**
 * Get color for a ship by its type string.
 */
export function getShipColor(type: string): string {
  const key = type.toLowerCase();
  const map: Record<string, string> = {
    warship: COLORS.ship.warship,
    military: COLORS.ship.military,
    tanker: COLORS.ship.tanker,
    cargo: COLORS.ship.cargo,
    passenger: COLORS.ship.passenger,
    fishing: COLORS.ship.fishing,
    research: COLORS.ship.research,
  };
  return map[key] ?? COLORS.ship.other;
}

/**
 * Get the polygon fill color for a conflict zone by intensity.
 * Optionally override the opacity (0–1).
 */
export function getConflictFillColor(intensity: string, opacity?: number): string {
  const key = intensity.toLowerCase() as keyof typeof COLORS.conflict.polygon;
  const base = COLORS.conflict.polygon[key] ?? COLORS.conflict.polygon.low;

  if (opacity === undefined) return base;

  // Replace the existing alpha value inside the rgba() string.
  return base.replace(/[\d.]+\)$/, `${Math.min(1, Math.max(0, opacity))})`);
}

/**
 * Get the border / stroke color for a conflict zone by intensity.
 */
export function getConflictBorderColor(intensity: string): string {
  const key = intensity.toLowerCase() as keyof Omit<typeof COLORS.conflict, 'polygon'>;
  const borderColors: Record<string, string> = {
    critical: COLORS.conflict.critical,
    high: COLORS.conflict.high,
    medium: COLORS.conflict.medium,
    low: COLORS.conflict.low,
    ceasefire: COLORS.conflict.ceasefire,
  };
  return borderColors[key] ?? COLORS.conflict.ceasefire;
}

/**
 * Get a GPS jamming color based on a continuous intensity level in [0, 1].
 * 0–0.33 → low, 0.33–0.66 → medium, 0.66–0.85 → high, 0.85–1 → critical.
 */
export function getGpsJamColor(level: number): string {
  const clamped = Math.min(1, Math.max(0, level));
  if (clamped < 0.33) return COLORS.gpsJam.low;
  if (clamped < 0.66) return COLORS.gpsJam.medium;
  if (clamped < 0.85) return COLORS.gpsJam.high;
  return COLORS.gpsJam.critical;
}

/**
 * Linearly interpolate between two hex colors.
 * t = 0 returns color a, t = 1 returns color b.
 */
export function lerpColor(a: string, b: string, t: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const parseHex = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  };

  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const tt = Math.min(1, Math.max(0, t));

  const r = clamp(ar + (br - ar) * tt);
  const g = clamp(ag + (bg - ag) * tt);
  const bv = clamp(ab + (bb - ab) * tt);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

/**
 * Convert a hex color string to an rgba() string with the given alpha (0–1).
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Get an altitude-based color for satellites.
 * Lower orbits (LEO, ~200–2 000 km) render brighter; higher orbits fade toward dim gray.
 * Brightness peaks at LEO and fades to near-gray at GEO (~35 786 km).
 */
export function getAltitudeColor(altKm: number): string {
  const LEO_MAX = 2_000;   // km — bright cyan
  const GEO = 35_786;      // km — dim gray

  const bright = '#00ffff'; // LEO color
  const dim = '#445566';    // GEO color

  const t = Math.min(1, Math.max(0, (altKm - LEO_MAX) / (GEO - LEO_MAX)));
  return lerpColor(bright, dim, t);
}

/**
 * Get a color appropriate for an alert severity level.
 */
export function getSeverityColor(severity: 'info' | 'warning' | 'critical'): string {
  switch (severity) {
    case 'info':
      return COLORS.ui.info;
    case 'warning':
      return COLORS.ui.warning;
    case 'critical':
      return COLORS.ui.danger;
    default:
      return COLORS.ui.text;
  }
}
