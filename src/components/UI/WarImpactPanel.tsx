import React, { useMemo, useState } from 'react';
import { distanceKm } from '../../utils/geoMath';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AircraftLike {
  lat: number;
  lng: number;
  isMilitary: boolean;
  callsign: string;
}

interface ShipLike {
  lat: number;
  lng: number;
  type: string;
  name: string;
}

interface ConflictZoneLike {
  id: string;
  name: string;
  countries: string[];
  status: string;
  intensity: string;
  casualties: {
    total?: number;
    military?: number;
    civilian?: number;
    displaced?: number;
  };
  color: string;
  geoJSON: { geometry: { coordinates: unknown; type: string } };
}

interface GpsJamCellLike {
  lat: number;
  lng: number;
  level: number;
  radius: number;
  type: string;
}

interface WarImpactPanelProps {
  aircraft: AircraftLike[];
  ships: ShipLike[];
  conflictZones: ConflictZoneLike[];
  gpsJamCells: GpsJamCellLike[];
  visible: boolean;
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a rough centroid from GeoJSON polygon / multipolygon */
function getZoneCentroid(geoJSON: { geometry: { coordinates: unknown; type: string } }): {
  lat: number;
  lng: number;
} | null {
  const { type, coordinates } = geoJSON.geometry;
  let pairs: number[][] = [];

  if (type === 'Polygon') {
    const rings = coordinates as number[][][];
    if (rings[0]) pairs = rings[0];
  } else if (type === 'MultiPolygon') {
    const polys = coordinates as number[][][][];
    for (const poly of polys) {
      if (poly[0]) pairs = pairs.concat(poly[0]);
    }
  } else if (type === 'Point') {
    const pt = coordinates as [number, number];
    return { lat: pt[1], lng: pt[0] };
  }

  if (pairs.length === 0) return null;
  const sumLng = pairs.reduce((s, p) => s + p[0], 0);
  const sumLat = pairs.reduce((s, p) => s + p[1], 0);
  return { lat: sumLat / pairs.length, lng: sumLng / pairs.length };
}

/** Country code to flag emoji */
function countryFlag(code: string): string {
  const c = (code || '').toUpperCase();
  if (c.length !== 2) return '';
  return String.fromCodePoint(...[...c].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function diversionLevel(civilianCount: number): { label: string; color: string } {
  if (civilianCount >= 10) return { label: 'HIGH', color: '#ff2222' };
  if (civilianCount >= 5) return { label: 'MODERATE', color: '#ff8c00' };
  if (civilianCount >= 1) return { label: 'LOW', color: '#e6c200' };
  return { label: 'NONE', color: '#22cc66' };
}

function disruption(
  milAir: number,
  civAir: number,
  warships: number,
  commercial: number,
  gpsLevel: number
): number {
  // Weighted components (max contribution per component):
  //   military aircraft  (max ~25)  — active threat indicator
  //   civilian in zone   (max ~20)  — disruption to commerce
  //   warships           (max ~20)  — area denial
  //   commercial vessels (max ~10)  — economic disruption
  //   GPS jamming        (max ~25)  — electronics warfare
  const milScore = Math.min(milAir, 5) * 5;
  const civScore = Math.min(civAir, 10) * 2;
  const wsScore = Math.min(warships, 4) * 5;
  const comScore = Math.min(commercial, 10) * 1;
  const gpsScore = gpsLevel * 25;
  return Math.min(100, Math.round(milScore + civScore + wsScore + comScore + gpsScore));
}

function scoreColor(score: number): string {
  if (score >= 75) return '#ff2222';
  if (score >= 50) return '#ff8c00';
  if (score >= 25) return '#e6c200';
  return '#22cc66';
}

function intensityLabel(intensity: string): { label: string; color: string } {
  switch (intensity) {
    case 'critical':
      return { label: 'CRITICAL', color: '#ff2222' };
    case 'high':
      return { label: 'HIGH', color: '#ff8c00' };
    case 'medium':
      return { label: 'MEDIUM', color: '#e6c200' };
    default:
      return { label: 'LOW', color: '#22cc66' };
  }
}

// ---------------------------------------------------------------------------
// Per-conflict impact data
// ---------------------------------------------------------------------------

interface ConflictImpact {
  zone: ConflictZoneLike;
  centroid: { lat: number; lng: number };
  milAircraft: number;
  civAircraft: number;
  warships: number;
  commercialVessels: number;
  gpsLevel: number; // 0-1
  gpsRegion: string;
  score: number;
}

function computeImpacts(
  conflictZones: ConflictZoneLike[],
  aircraft: AircraftLike[],
  ships: ShipLike[],
  gpsJamCells: GpsJamCellLike[]
): ConflictImpact[] {
  const warshipTypes = new Set([
    'military',
    'warship',
  ]);

  return conflictZones
    .filter(z => z.status === 'active' || z.status === 'escalating')
    .map(zone => {
      const centroid = getZoneCentroid(zone.geoJSON) ?? { lat: 0, lng: 0 };

      // Aircraft within 200 km
      let milAircraft = 0;
      let civAircraft = 0;
      for (const ac of aircraft) {
        const d = distanceKm(centroid.lat, centroid.lng, ac.lat, ac.lng);
        if (d <= 200) {
          if (ac.isMilitary) milAircraft++;
          else civAircraft++;
        }
      }

      // Ships within 300 km
      let warships = 0;
      let commercialVessels = 0;
      for (const sh of ships) {
        const d = distanceKm(centroid.lat, centroid.lng, sh.lat, sh.lng);
        if (d <= 300) {
          const t = sh.type?.toLowerCase() ?? '';
          const n = sh.name?.toLowerCase() ?? '';
          if (
            warshipTypes.has(t) ||
            /navy|warship|destroyer|frigate|corvette|submarine|carrier|cruiser/i.test(t) ||
            /navy|warship|destroyer|frigate|corvette|submarine|carrier|cruiser/i.test(n)
          ) {
            warships++;
          } else {
            commercialVessels++;
          }
        }
      }

      // GPS jamming: best level within 250 km of centroid
      let gpsLevel = 0;
      let gpsRegion = '';
      for (const cell of gpsJamCells) {
        const d = distanceKm(centroid.lat, centroid.lng, cell.lat, cell.lng);
        if (d <= 250 && cell.level > gpsLevel) {
          gpsLevel = cell.level;
          gpsRegion =
            `${Math.abs(cell.lat).toFixed(0)}${cell.lat >= 0 ? 'N' : 'S'} ` +
            `${Math.abs(cell.lng).toFixed(0)}${cell.lng >= 0 ? 'E' : 'W'}`;
        }
      }

      const score = disruption(milAircraft, civAircraft, warships, commercialVessels, gpsLevel);

      return {
        zone,
        centroid,
        milAircraft,
        civAircraft,
        warships,
        commercialVessels,
        gpsLevel,
        gpsRegion,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const WarImpactPanel: React.FC<WarImpactPanelProps> = ({
  aircraft,
  ships,
  conflictZones,
  gpsJamCells,
  visible,
  onToggle,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const impacts = useMemo(
    () => computeImpacts(conflictZones, aircraft, ships, gpsJamCells),
    [conflictZones, aircraft, ships, gpsJamCells]
  );

  if (!visible) return null;

  // ── Styles ──────────────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '120px',
    left: '220px',
    width: '360px',
    maxWidth: 'calc(100vw - 240px)',
    maxHeight: 'calc(100vh - 140px)',
    zIndex: 1200,
    fontFamily: '"Share Tech Mono", "Courier New", monospace',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.97)',
    border: '1px solid rgba(255, 80, 40, 0.45)',
    borderBottom: collapsed ? undefined : '1px solid rgba(255, 80, 40, 0.18)',
    borderRadius: collapsed ? '6px' : '6px 6px 0 0',
    padding: '7px 11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const bodyStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.95)',
    border: '1px solid rgba(255, 80, 40, 0.45)',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 8px 6px 8px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255, 80, 40, 0.22) transparent',
    flex: 1,
    minHeight: 0,
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle} onClick={() => setCollapsed(c => !c)} title="Toggle War Impact Panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'rgba(255, 140, 80, 0.95)',
              letterSpacing: '0.06em',
            }}
          >
            WAR IMPACT
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background: impacts.length > 0 ? 'rgba(255, 80, 40, 0.70)' : 'rgba(80, 110, 150, 0.5)',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 6px',
              minWidth: '18px',
              textAlign: 'center',
            }}
          >
            {impacts.length}
          </span>
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(140, 170, 200, 0.45)',
              letterSpacing: '0.04em',
            }}
          >
            [I]
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <button
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              background: 'rgba(255, 80, 40, 0.10)',
              border: '1px solid rgba(255, 80, 40, 0.30)',
              color: 'rgba(255, 160, 120, 0.75)',
              borderRadius: '3px',
              padding: '1px 6px',
              fontSize: '10px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 80, 40, 0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 80, 40, 0.10)')}
            title="Hide panel"
          >
            X
          </button>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(120, 170, 220, 0.5)',
              lineHeight: 1,
              transition: 'transform 0.2s',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          >
            ^
          </span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={bodyStyle}>
          {/* Subtitle */}
          <div
            style={{
              fontSize: '9px',
              color: 'rgba(255, 120, 80, 0.60)',
              letterSpacing: '0.10em',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            AIR &amp; SEA TRAFFIC DISRUPTION BY CONFLICT
          </div>

          {impacts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(120, 150, 190, 0.45)',
                fontSize: '12px',
                padding: '20px 0',
              }}
            >
              No active conflict zones detected
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {impacts.map(imp => {
                const { zone, milAircraft, civAircraft, warships, commercialVessels, gpsLevel, gpsRegion, score } = imp;
                const cas = zone.casualties;
                const flags = zone.countries.map(countryFlag).join(' ');
                const intens = intensityLabel(zone.intensity);
                const diversion = diversionLevel(civAircraft);
                const sColor = scoreColor(score);

                return (
                  <div
                    key={zone.id}
                    style={{
                      background: 'rgba(8, 20, 45, 0.85)',
                      border: '1px solid rgba(255, 80, 40, 0.18)',
                      borderLeft: `3px solid ${zone.color || sColor}`,
                      borderRadius: '4px',
                      padding: '9px 10px 8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'rgba(220, 235, 255, 0.95)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {flags} {zone.name}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: intens.color,
                          background: `${intens.color}20`,
                          border: `1px solid ${intens.color}44`,
                          borderRadius: '2px',
                          padding: '1px 5px',
                          flexShrink: 0,
                          marginLeft: '6px',
                        }}
                      >
                        {intens.label}
                      </span>
                    </div>

                    {/* Casualties */}
                    <div style={{ fontSize: '10px', color: 'rgba(180, 200, 230, 0.70)', lineHeight: 1.5 }}>
                      {cas.total != null && (
                        <div>
                          Deaths: {formatNumber(cas.total)}
                          {(cas.military != null || cas.civilian != null) && (
                            <span style={{ color: 'rgba(140, 165, 200, 0.50)' }}>
                              {' '}({cas.military != null ? `${formatNumber(cas.military)} mil` : ''}
                              {cas.military != null && cas.civilian != null ? ' / ' : ''}
                              {cas.civilian != null ? `${formatNumber(cas.civilian)} civ` : ''})
                            </span>
                          )}
                        </div>
                      )}
                      {cas.displaced != null && cas.displaced > 0 && (
                        <div>Displaced: {formatNumber(cas.displaced)}</div>
                      )}
                    </div>

                    {/* Separator */}
                    <div
                      style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        margin: '3px 0',
                      }}
                    />

                    {/* Air Traffic Impact */}
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(100, 200, 255, 0.85)', marginBottom: '2px' }}>
                      Air Traffic Impact:
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(180, 200, 230, 0.70)', lineHeight: 1.6, paddingLeft: '8px' }}>
                      <div>
                        Military:{' '}
                        <span style={{ color: milAircraft > 0 ? '#ff8c00' : 'rgba(140,165,200,0.50)' }}>
                          {milAircraft} aircraft detected
                        </span>
                      </div>
                      <div>
                        Civilian:{' '}
                        <span style={{ color: civAircraft > 0 ? '#e6c200' : 'rgba(140,165,200,0.50)' }}>
                          {civAircraft} aircraft in zone
                        </span>
                      </div>
                      <div>
                        Diversions likely:{' '}
                        <span style={{ color: diversion.color, fontWeight: 700 }}>{diversion.label}</span>
                      </div>
                    </div>

                    {/* Sea Traffic Impact */}
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(100, 200, 255, 0.85)', marginTop: '4px', marginBottom: '2px' }}>
                      Sea Traffic Impact:
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(180, 200, 230, 0.70)', lineHeight: 1.6, paddingLeft: '8px' }}>
                      <div>
                        Warships:{' '}
                        <span style={{ color: warships > 0 ? '#ff8c00' : 'rgba(140,165,200,0.50)' }}>
                          {warships} vessels
                        </span>
                      </div>
                      <div>
                        Commercial:{' '}
                        <span style={{ color: commercialVessels > 0 ? '#e6c200' : 'rgba(140,165,200,0.50)' }}>
                          {commercialVessels} vessels
                        </span>
                      </div>
                    </div>

                    {/* GPS Disruption */}
                    <div style={{ fontSize: '10px', color: 'rgba(180, 200, 230, 0.70)', marginTop: '4px' }}>
                      GPS Disruption:{' '}
                      <span
                        style={{
                          color: gpsLevel > 0.5 ? '#ff2222' : gpsLevel > 0 ? '#ff8c00' : 'rgba(140,165,200,0.50)',
                          fontWeight: 700,
                        }}
                      >
                        {Math.round(gpsLevel * 100)}%
                      </span>
                      {gpsRegion && (
                        <span style={{ color: 'rgba(140, 165, 200, 0.50)' }}> ({gpsRegion})</span>
                      )}
                    </div>

                    {/* Disruption Score */}
                    <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(180, 200, 230, 0.70)', flexShrink: 0 }}>
                        Disruption Score:
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${score}%`,
                            height: '100%',
                            background: sColor,
                            borderRadius: '3px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: sColor,
                          flexShrink: 0,
                          minWidth: '40px',
                          textAlign: 'right',
                        }}
                      >
                        {score}/100
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: '8px',
              background: 'rgba(255, 80, 40, 0.05)',
              border: '1px solid rgba(255, 80, 40, 0.20)',
              borderRadius: '3px',
              padding: '5px 8px',
              fontSize: '9px',
              color: 'rgba(255, 140, 100, 0.60)',
              lineHeight: 1.4,
              letterSpacing: '0.02em',
            }}
          >
            Aircraft: 200 km radius | Ships: 300 km radius | GPS: 250 km radius
          </div>
        </div>
      )}
    </div>
  );
};

export default WarImpactPanel;
