import React, { useEffect, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HotspotsPanelProps {
  aircraft: Array<{ lat: number; lng: number; isMilitary: boolean; callsign: string }>;
  ships: Array<{ lat: number; lng: number; type: string; name: string }>;
  gpsJamCells: Array<{ lat: number; lng: number; level: number; type: string }>;
  conflictZones: Array<{
    id: string;
    name: string;
    intensity: string;
    geoJSON: { geometry: { coordinates: unknown; type: string } };
  }>;
  onFlyTo: (lat: number, lng: number) => void;
  visible: boolean;
  onToggle: () => void;
}

interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  name: string;
  threatLevel: number; // 0-100
  indicators: {
    militaryAircraft: number;
    warships: number;
    gpsJamming: number; // 0-1
    conflictZone: string | null;
  };
  description: string;
}

// ---------------------------------------------------------------------------
// Strategic predefined hotspot seeds
// ---------------------------------------------------------------------------

const STRATEGIC_SEEDS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Eastern Ukraine', lat: 48.5, lng: 37.5 },
  { name: 'Gaza/Israel', lat: 31.5, lng: 34.5 },
  { name: 'Red Sea/Yemen', lat: 14.0, lng: 43.5 },
  { name: 'Taiwan Strait', lat: 24.5, lng: 122.0 },
  { name: 'Black Sea', lat: 43.5, lng: 34.0 },
  { name: 'Persian Gulf', lat: 26.0, lng: 54.0 },
];

// ---------------------------------------------------------------------------
// Geo helpers
// ---------------------------------------------------------------------------

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rough point-in-polygon test for GeoJSON Polygon / MultiPolygon */
function pointInGeoJSON(
  lat: number,
  lng: number,
  geometry: { coordinates: unknown; type: string }
): boolean {
  try {
    const rings: Array<Array<[number, number]>> =
      geometry.type === 'Polygon'
        ? (geometry.coordinates as Array<Array<[number, number]>>)
        : geometry.type === 'MultiPolygon'
        ? (geometry.coordinates as Array<Array<Array<[number, number]>>>).flat(1)
        : [];

    for (const ring of rings) {
      if (pointInRing(lat, lng, ring)) return true;
    }
  } catch {
    // Malformed geometry — ignore
  }
  return false;
}

function pointInRing(lat: number, lng: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; // [lng, lat] GeoJSON convention
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Best GPS jamming level within ~1° of a cell center */
function getJammingAt(
  lat: number,
  lng: number,
  cells: Array<{ lat: number; lng: number; level: number }>
): number {
  let best = 0;
  for (const c of cells) {
    if (Math.abs(c.lat - lat) < 2 && Math.abs(c.lng - lng) < 2) {
      const d = haversineKm(lat, lng, c.lat, c.lng);
      if (d < 220 && c.level > best) best = c.level;
    }
  }
  return best;
}

/** Name a computed grid-cell hotspot */
function cellName(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

function calcHotspots(
  aircraft: HotspotsPanelProps['aircraft'],
  ships: HotspotsPanelProps['ships'],
  gpsJamCells: HotspotsPanelProps['gpsJamCells'],
  conflictZones: HotspotsPanelProps['conflictZones']
): Hotspot[] {
  const milAircraft = aircraft.filter(a => a.isMilitary);

  // Build candidate cells: strategic seeds + 1-degree grid cells near data
  const candidateMap = new Map<string, { lat: number; lng: number; name: string }>();

  // Always include strategic seeds
  for (const seed of STRATEGIC_SEEDS) {
    const key = `${seed.lat.toFixed(0)}_${seed.lng.toFixed(0)}`;
    candidateMap.set(key, { lat: seed.lat, lng: seed.lng, name: seed.name });
  }

  // Add grid cells from live data (1-degree resolution)
  const addCell = (lat: number, lng: number) => {
    const gridLat = Math.round(lat);
    const gridLng = Math.round(lng);
    const key = `${gridLat}_${gridLng}`;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, { lat: gridLat, lng: gridLng, name: cellName(gridLat, gridLng) });
    }
  };

  milAircraft.forEach(a => addCell(a.lat, a.lng));
  ships.forEach(s => addCell(s.lat, s.lng));
  gpsJamCells.forEach(c => addCell(c.lat, c.lng));

  const hotspots: Hotspot[] = [];

  for (const [key, cell] of candidateMap.entries()) {
    const { lat, lng, name } = cell;

    // Count military aircraft within 200 km
    const nearMilAircraft = milAircraft.filter(
      a => haversineKm(lat, lng, a.lat, a.lng) <= 200
    ).length;

    // Count warships within 300 km
    const warshipTypes = new Set(['NAVY', 'MILITARY', 'WARSHIP', 'COAST_GUARD', 'LAW_ENFORCEMENT']);
    const nearWarships = ships.filter(s => {
      const isWarship =
        warshipTypes.has(s.type?.toUpperCase() ?? '') ||
        /navy|warship|destroyer|frigate|corvette|submarine|carrier|cruiser/i.test(s.type ?? '') ||
        /navy|warship|destroyer|frigate|corvette|submarine|carrier|cruiser/i.test(s.name ?? '');
      return isWarship && haversineKm(lat, lng, s.lat, s.lng) <= 300;
    }).length;

    // GPS jamming at cell center
    const gpsJam = getJammingAt(lat, lng, gpsJamCells);

    // Check conflict zones
    let conflictZoneName: string | null = null;
    for (const zone of conflictZones) {
      try {
        if (pointInGeoJSON(lat, lng, zone.geoJSON.geometry)) {
          conflictZoneName = zone.name;
          break;
        }
      } catch {
        // ignore bad geometry
      }
    }
    // Also check proximity to conflict zone centroids (~2.5° fallback)
    if (!conflictZoneName) {
      for (const zone of conflictZones) {
        try {
          const coords = zone.geoJSON.geometry.coordinates as unknown;
          let cLat: number | null = null;
          let cLng: number | null = null;
          if (zone.geoJSON.geometry.type === 'Point') {
            const pt = coords as [number, number];
            cLng = pt[0];
            cLat = pt[1];
          } else if (zone.geoJSON.geometry.type === 'Polygon') {
            const ring = (coords as Array<Array<[number, number]>>)[0];
            if (ring && ring.length) {
              cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
              cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
            }
          }
          if (cLat !== null && cLng !== null) {
            if (haversineKm(lat, lng, cLat, cLng) < 250) {
              conflictZoneName = zone.name;
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const conflictBonus = conflictZoneName ? 1 : 0;

    // Clamp individual contributions to prevent runaway scores
    const milScore = Math.min(nearMilAircraft, 4) * 20;
    const shipScore = Math.min(nearWarships, 3) * 25;
    const gpsScore = gpsJam * 30;
    const conflictScore = conflictBonus * 25;
    const threatLevel = Math.min(100, milScore + shipScore + gpsScore + conflictScore);

    if (threatLevel <= 10) continue;

    // Build description
    const parts: string[] = [];
    if (nearMilAircraft > 0) parts.push(`${nearMilAircraft} mil. aircraft`);
    if (nearWarships > 0) parts.push(`${nearWarships} warship${nearWarships > 1 ? 's' : ''}`);
    if (gpsJam > 0) parts.push(`GPS ${Math.round(gpsJam * 100)}%`);
    if (conflictZoneName) parts.push(conflictZoneName);
    const description = parts.length ? parts.join(' · ') : 'Multi-domain activity';

    hotspots.push({
      id: key,
      lat,
      lng,
      name,
      threatLevel,
      indicators: {
        militaryAircraft: nearMilAircraft,
        warships: nearWarships,
        gpsJamming: gpsJam,
        conflictZone: conflictZoneName,
      },
      description,
    });
  }

  // Sort by threat level desc, return top 8
  hotspots.sort((a, b) => b.threatLevel - a.threatLevel);
  return hotspots.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Visual helpers
// ---------------------------------------------------------------------------

function threatColor(level: number): string {
  if (level >= 80) return '#ff2222';
  if (level >= 60) return '#ff8c00';
  if (level >= 30) return '#e6c200';
  return '#22cc66';
}

function threatLabel(level: number): string {
  if (level >= 80) return 'CRITICAL';
  if (level >= 60) return 'HIGH';
  if (level >= 30) return 'MODERATE';
  return 'LOW';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HotspotsPanel: React.FC<HotspotsPanelProps> = ({
  aircraft,
  ships,
  gpsJamCells,
  conflictZones,
  onFlyTo,
  visible,
  onToggle,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const recalculate = useCallback(() => {
    const result = calcHotspots(aircraft, ships, gpsJamCells, conflictZones);
    setHotspots(result);
    setLastUpdated(new Date());
  }, [aircraft, ships, gpsJamCells, conflictZones]);

  // Initial calculation + recalculate when props change
  useEffect(() => {
    recalculate();
  }, [recalculate]);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(recalculate, 30_000);
    return () => clearInterval(interval);
  }, [recalculate]);

  if (!visible) return null;

  const timeStr = lastUpdated.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '120px',
    right: '16px',
    width: '320px',
    maxWidth: 'calc(100vw - 32px)',
    zIndex: 1150,
    fontFamily: "'Rajdhani', 'Share Tech Mono', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(8, 14, 28, 0.8)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(60, 180, 255, 0.15)',
    borderBottom: collapsed ? undefined : '1px solid rgba(60, 180, 255, 0.08)',
    borderRadius: collapsed ? '8px' : '8px 8px 0 0',
    padding: '7px 11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const bodyStyle: React.CSSProperties = {
    background: 'rgba(8, 14, 28, 0.8)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(60, 180, 255, 0.15)',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 8px 6px 8px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(60, 180, 255, 0.2) transparent',
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div
        style={headerStyle}
        onClick={() => setCollapsed(c => !c)}
        title="Toggle Threat Hotspots"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#3CB8FF',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
            }}
          >
            🎯 THREAT HOTSPOTS
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background:
                hotspots.length > 0 ? 'rgba(255, 50, 50, 0.75)' : 'rgba(80, 110, 150, 0.5)',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 6px',
              minWidth: '18px',
              textAlign: 'center',
              transition: 'background 0.2s',
            }}
          >
            {hotspots.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <button
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              background: 'rgba(255, 60, 60, 0.10)',
              border: '1px solid rgba(255, 60, 60, 0.30)',
              color: 'rgba(255, 140, 140, 0.75)',
              borderRadius: '3px',
              padding: '1px 6px',
              fontSize: '10px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 60, 60, 0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 60, 60, 0.10)')}
            title="Hide panel"
          >
            ✕
          </button>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(120, 170, 220, 0.5)',
              lineHeight: 1,
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={bodyStyle}>
          {/* Subtitle */}
          <div
            style={{
              fontSize: '10px',
              color: '#4A6480',
              letterSpacing: '0.10em',
              fontWeight: 600,
              fontFamily: "'Rajdhani', sans-serif",
              textTransform: 'uppercase',
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>LIVE THREAT ASSESSMENT</span>
            <span style={{ color: 'rgba(140, 170, 200, 0.45)', fontWeight: 400, fontSize: '9px' }}>
              {timeStr}
            </span>
          </div>

          {/* Hotspot list */}
          {hotspots.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(120, 150, 190, 0.45)',
                fontSize: '12px',
                padding: '20px 0',
                letterSpacing: '0.04em',
              }}
            >
              No active hotspots detected
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                maxHeight: '440px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 60, 60, 0.18) transparent',
              }}
            >
              {hotspots.map((hs, rank) => {
                const color = threatColor(hs.threatLevel);
                const label = threatLabel(hs.threatLevel);
                const { militaryAircraft, warships, gpsJamming, conflictZone } = hs.indicators;

                return (
                  <div
                    key={hs.id}
                    style={{
                      background: 'rgba(12, 20, 36, 0.5)',
                      border: '1px solid rgba(60, 180, 255, 0.08)',
                      borderLeft: `3px solid ${color}`,
                      borderRadius: '4px',
                      padding: '7px 9px 6px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  >
                    {/* Row 1: rank + name + threat badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'rgba(180, 200, 230, 0.40)',
                          flexShrink: 0,
                          minWidth: '14px',
                        }}
                      >
                        {rank + 1}.
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'rgba(210, 225, 250, 0.92)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0,
                        }}
                        title={hs.name}
                      >
                        {hs.name}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: color,
                          background: `${color}20`,
                          border: `1px solid ${color}44`,
                          borderRadius: '2px',
                          padding: '1px 5px',
                          flexShrink: 0,
                        }}
                      >
                        {label}
                      </span>
                    </div>

                    {/* Row 2: coordinates */}
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'rgba(140, 165, 200, 0.55)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {hs.lat.toFixed(2)}°, {hs.lng.toFixed(2)}°
                    </div>

                    {/* Row 3: threat level bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '5px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${hs.threatLevel}%`,
                            height: '100%',
                            background: color,
                            borderRadius: '3px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: color,
                          fontWeight: 700,
                          flexShrink: 0,
                          minWidth: '30px',
                          textAlign: 'right',
                        }}
                      >
                        {Math.round(hs.threatLevel)}
                      </span>
                    </div>

                    {/* Row 4: indicator pills */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center',
                      }}
                    >
                      <IndicatorPill
                        icon="✈️"
                        value={militaryAircraft}
                        active={militaryAircraft > 0}
                        title="Military aircraft within 200 km"
                      />
                      <IndicatorPill
                        icon="🚢"
                        value={warships}
                        active={warships > 0}
                        title="Warships within 300 km"
                      />
                      <IndicatorPill
                        icon="📡"
                        value={gpsJamming > 0 ? `${Math.round(gpsJamming * 100)}%` : '—'}
                        active={gpsJamming > 0}
                        title="GPS jamming intensity"
                        warn={gpsJamming > 0.5}
                      />
                      <IndicatorPill
                        icon="⚔️"
                        value={conflictZone ? '!' : '—'}
                        active={!!conflictZone}
                        title={conflictZone ?? 'No active conflict zone'}
                        warn={!!conflictZone}
                      />
                    </div>

                    {/* Row 5: description + Focus button */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'rgba(150, 175, 210, 0.65)',
                          lineHeight: 1.4,
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={hs.description}
                      >
                        {hs.description}
                      </span>
                      <button
                        onClick={() => onFlyTo(hs.lat, hs.lng)}
                        style={{
                          background: 'rgba(255, 60, 60, 0.12)',
                          border: '1px solid rgba(255, 60, 60, 0.35)',
                          color: 'rgba(255, 140, 140, 0.88)',
                          borderRadius: '3px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                          transition: 'background 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.background = 'rgba(255, 60, 60, 0.26)')
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.background = 'rgba(255, 60, 60, 0.12)')
                        }
                        title={`Focus on ${hs.name}`}
                      >
                        📍 Focus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <div
            style={{
              marginTop: '7px',
              background: 'rgba(255, 34, 34, 0.05)',
              border: '1px solid rgba(255, 34, 34, 0.20)',
              borderRadius: '3px',
              padding: '5px 8px',
              fontSize: '10px',
              color: 'rgba(255, 120, 120, 0.70)',
              lineHeight: 1.45,
              letterSpacing: '0.02em',
            }}
          >
            ⚡ Refreshes every 30 s · Top 8 convergence zones
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// IndicatorPill sub-component
// ---------------------------------------------------------------------------

interface IndicatorPillProps {
  icon: string;
  value: number | string;
  active: boolean;
  title?: string;
  warn?: boolean;
}

const IndicatorPill: React.FC<IndicatorPillProps> = ({ icon, value, active, title, warn }) => {
  const activeColor = warn ? '#ff8c00' : 'rgba(30, 180, 255, 0.85)';
  const inactiveColor = 'rgba(100, 130, 170, 0.35)';
  const color = active ? activeColor : inactiveColor;

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: '10px',
        color,
        background: active ? `${color}15` : 'transparent',
        border: `1px solid ${active ? color + '40' : 'rgba(80,110,150,0.18)'}`,
        borderRadius: '3px',
        padding: '1px 5px',
        letterSpacing: '0.02em',
        fontWeight: active ? 700 : 400,
        opacity: active ? 1 : 0.5,
        transition: 'color 0.2s, background 0.2s',
        cursor: title ? 'help' : undefined,
      }}
    >
      <span style={{ fontSize: '11px' }}>{icon}</span>
      <span>{value}</span>
    </span>
  );
};

export default HotspotsPanel;
