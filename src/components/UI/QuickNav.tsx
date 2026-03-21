import React, { useState, useEffect, useCallback } from 'react';

interface QuickNavProps {
  onFlyTo: (lat: number, lng: number, altitude?: number) => void;
  conflictZones: Array<{
    id: string;
    name: string;
    intensity: string;
    geoJSON: { geometry: { coordinates: unknown; type: string } };
  }>;
}

interface NavLocation {
  label: string;
  lat: number;
  lng: number;
  alt: number;
}

const PREDEFINED_LOCATIONS: NavLocation[] = [
  { label: 'GLOBAL VIEW',   lat: 20,   lng: 0,    alt: 3.0 },
  { label: 'EUROPE',        lat: 50,   lng: 15,   alt: 1.5 },
  { label: 'MIDDLE EAST',   lat: 29,   lng: 42,   alt: 1.2 },
  { label: 'E. EUROPE',     lat: 50,   lng: 32,   alt: 1.0 },
  { label: 'UKRAINE',       lat: 48.5, lng: 32,   alt: 0.8 },
  { label: 'GAZA',          lat: 31.4, lng: 34.4, alt: 0.3 },
  { label: 'RED SEA',       lat: 15,   lng: 43,   alt: 1.0 },
  { label: 'PERSIAN GULF',  lat: 26,   lng: 54,   alt: 0.8 },
  { label: 'SOUTH CHINA',   lat: 15,   lng: 115,  alt: 1.2 },
  { label: 'KOREAN PENIN.', lat: 37,   lng: 127,  alt: 0.8 },
  { label: 'AFRICA',        lat: 5,    lng: 25,   alt: 2.0 },
  { label: 'INDO-PACIFIC',  lat: 10,   lng: 110,  alt: 2.5 },
];

const INTENSITY_ORDER: Record<string, number> = {
  critical: 5,
  high:     4,
  medium:   3,
  low:      2,
  minimal:  1,
};

function getZoneCenter(geoJSON: { geometry: { coordinates: unknown; type: string } }): [number, number] | null {
  const { type, coordinates } = geoJSON.geometry;
  try {
    if (type === 'Point') {
      const coords = coordinates as [number, number];
      return [coords[1], coords[0]];
    }
    if (type === 'MultiPoint' || type === 'LineString') {
      const coords = coordinates as [number, number][];
      if (!coords.length) return null;
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      return [lat, lng];
    }
    if (type === 'Polygon') {
      const ring = (coordinates as [number, number][][])[0];
      if (!ring?.length) return null;
      const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      return [lat, lng];
    }
    if (type === 'MultiPolygon') {
      const allRings = (coordinates as [number, number][][][]).flatMap(p => p[0] ?? []);
      if (!allRings.length) return null;
      const lat = allRings.reduce((s, c) => s + c[1], 0) / allRings.length;
      const lng = allRings.reduce((s, c) => s + c[0], 0) / allRings.length;
      return [lat, lng];
    }
  } catch {
    // fall through
  }
  return null;
}

const QuickNav: React.FC<QuickNavProps> = ({ onFlyTo, conflictZones }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      switch (e.key.toLowerCase()) {
        case 'g': onFlyTo(20, 0, 3.0);   break;
        case 'e': onFlyTo(50, 15, 1.5);  break;
        case 'm': onFlyTo(29, 42, 1.2);  break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onFlyTo]);

  const topZones = [...conflictZones]
    .sort((a, b) => {
      const ai = INTENSITY_ORDER[a.intensity?.toLowerCase()] ?? 0;
      const bi = INTENSITY_ORDER[b.intensity?.toLowerCase()] ?? 0;
      return bi - ai;
    })
    .slice(0, 5);

  const handleZoneFly = useCallback(
    (zone: QuickNavProps['conflictZones'][number]) => {
      const center = getZoneCenter(zone.geoJSON);
      if (center) onFlyTo(center[0], center[1], 0.6);
    },
    [onFlyTo],
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <button
        style={styles.header}
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand QuickNav' : 'Collapse QuickNav'}
      >
        <span>📍 QUICK NAV</span>
        <span style={styles.collapseIcon}>{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div style={styles.body}>
          {/* Predefined location grid */}
          <div style={styles.grid}>
            {PREDEFINED_LOCATIONS.map(loc => (
              <button
                key={loc.label}
                style={hoveredId === `nav-${loc.label}` ? styles.navBtnHover : styles.navBtn}
                onClick={() => onFlyTo(loc.lat, loc.lng, loc.alt)}
                title={`Fly to ${loc.label} (${loc.lat}°, ${loc.lng}°)`}
                onMouseEnter={() => setHoveredId(`nav-${loc.label}`)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {loc.label}
              </button>
            ))}
          </div>

          {/* Dynamic conflict zone buttons */}
          {topZones.length > 0 && (
            <>
              <div style={styles.divider} />
              <div style={styles.sectionLabel}>ACTIVE ZONES</div>
              <div style={styles.zoneList}>
                {topZones.map(zone => (
                  <button
                    key={zone.id}
                    style={hoveredId === `zone-${zone.id}` ? styles.zoneBtnHover : styles.zoneBtn}
                    onClick={() => handleZoneFly(zone)}
                    title={`Fly to ${zone.name} (${zone.intensity})`}
                    onMouseEnter={() => setHoveredId(`zone-${zone.id}`)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    ⚔️ {zone.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Keyboard shortcuts hint */}
          <div style={styles.hint}>G=Global&nbsp;&nbsp;E=Europe&nbsp;&nbsp;M=Middle East</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BASE_BTN: React.CSSProperties = {
  background: 'rgba(0, 20, 40, 0.85)',
  color: '#7ecfff',
  border: '2px solid rgba(0, 180, 255, 0.35)',
  borderRadius: '3px',
  fontSize: '9px',
  fontFamily: 'monospace',
  fontWeight: 700,
  letterSpacing: '0.04em',
  padding: '4px 3px',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'box-shadow 0.15s, border-color 0.15s, color 0.15s',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const HOVER_BTN: React.CSSProperties = {
  ...BASE_BTN,
  color: '#ffffff',
  borderColor: 'rgba(0, 220, 255, 0.85)',
  boxShadow: '0 0 8px rgba(0, 200, 255, 0.55)',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute' as const,
    top: '44px',
    right: '8px',
    width: '210px',
    background: 'rgba(0, 8, 20, 0.90)',
    border: '2px solid rgba(0, 180, 255, 0.40)',
    borderRadius: '5px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    zIndex: 900,
    fontFamily: 'monospace',
    userSelect: 'none',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '5px 8px',
    background: 'rgba(0, 40, 80, 0.70)',
    border: 'none',
    borderBottom: '1px solid rgba(0, 180, 255, 0.25)',
    borderRadius: '3px 3px 0 0',
    color: '#00d4ff',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    fontFamily: 'monospace',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },

  collapseIcon: {
    fontSize: '8px',
    opacity: 0.7,
  },

  body: {
    padding: '6px',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '3px',
  },

  navBtnBase: BASE_BTN,
  navBtn: BASE_BTN,
  navBtnHover: HOVER_BTN,

  divider: {
    borderTop: '1px solid rgba(0, 180, 255, 0.20)',
    margin: '6px 0 4px',
  },

  sectionLabel: {
    color: 'rgba(0, 200, 255, 0.55)',
    fontSize: '8px',
    letterSpacing: '0.15em',
    fontWeight: 700,
    marginBottom: '3px',
    paddingLeft: '1px',
  },

  zoneList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },

  zoneBtnBase: {
    ...BASE_BTN,
    width: '100%',
    textAlign: 'left' as const,
    padding: '4px 6px',
    fontSize: '9px',
    color: '#ffca7a',
    borderColor: 'rgba(255, 160, 0, 0.35)',
  },

  zoneBtn: {
    ...BASE_BTN,
    width: '100%',
    textAlign: 'left' as const,
    padding: '4px 6px',
    fontSize: '9px',
    color: '#ffca7a',
    borderColor: 'rgba(255, 160, 0, 0.35)',
  },

  zoneBtnHover: {
    ...HOVER_BTN,
    width: '100%',
    textAlign: 'left' as const,
    padding: '4px 6px',
    fontSize: '9px',
    color: '#ffe0a0',
    borderColor: 'rgba(255, 190, 0, 0.85)',
    boxShadow: '0 0 8px rgba(255, 180, 0, 0.50)',
  },

  hint: {
    marginTop: '6px',
    color: 'rgba(0, 180, 255, 0.40)',
    fontSize: '8px',
    letterSpacing: '0.04em',
    textAlign: 'center' as const,
    borderTop: '1px solid rgba(0, 180, 255, 0.12)',
    paddingTop: '4px',
  },
};

export default QuickNav;
