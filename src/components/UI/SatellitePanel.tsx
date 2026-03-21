import React, { useState, useMemo } from 'react';
import { getOrbitClass } from '../../utils/geoMath';

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

interface SatellitePanelProps {
  satellites: SatelliteEntity[];
  onSelect: (sat: SatelliteEntity) => void;
  onFlyTo: (lat: number, lng: number) => void;
  visible: boolean;
  onToggle: () => void;
}

// ── Category meta ─────────────────────────────────────────────────────────────
const CATEGORY_META: Record<
  SatelliteEntity['category'],
  { label: string; dot: string; filterKey: FilterKey }
> = {
  iss:           { label: 'ISS',      dot: '#00e5ff', filterKey: 'iss' },
  military:      { label: 'MILITARY', dot: '#ff4444', filterKey: 'military' },
  spy:           { label: 'SPY',      dot: '#cc00ff', filterKey: 'spy' },
  reconnaissance:{ label: 'RECON',   dot: '#ff8800', filterKey: 'spy' },
  navigation:    { label: 'GPS/NAV', dot: '#22cc66', filterKey: 'navigation' },
  weather:       { label: 'WEATHER', dot: '#66ccff', filterKey: 'weather' },
  starlink:      { label: 'STARLINK', dot: '#aaaaff', filterKey: 'starlink' },
  commercial:    { label: 'OTHER',   dot: '#aaaaaa', filterKey: 'other' },
  other:         { label: 'OTHER',   dot: '#888888', filterKey: 'other' },
};

type FilterKey = 'all' | 'iss' | 'military' | 'spy' | 'navigation' | 'weather' | 'starlink' | 'other';

const FILTER_PILLS: { key: FilterKey; label: string; dot: string }[] = [
  { key: 'all',        label: 'ALL',      dot: '#aaaaaa' },
  { key: 'iss',        label: 'ISS',      dot: '#00e5ff' },
  { key: 'military',   label: 'MILITARY', dot: '#ff4444' },
  { key: 'spy',        label: 'SPY',      dot: '#cc00ff' },
  { key: 'navigation', label: 'GPS/NAV',  dot: '#22cc66' },
  { key: 'weather',    label: 'WEATHER',  dot: '#66ccff' },
  { key: 'starlink',   label: 'STARLINK', dot: '#aaaaff' },
  { key: 'other',      label: 'OTHER',    dot: '#888888' },
];

function formatCoord(val: number, pos: string, neg: string): string {
  return `${Math.abs(val).toFixed(2)}° ${val >= 0 ? pos : neg}`;
}

// Last updated indicator based on real lastUpdated timestamp
function lastSeenAgo(sat: SatelliteEntity): string {
  if (!sat.lastUpdated) return 'No data';
  const ago = Math.round((Date.now() - sat.lastUpdated) / 60000);
  if (ago < 1) return 'Live';
  if (ago < 60) return `${ago}m ago`;
  return `${Math.floor(ago / 60)}h ${ago % 60}m ago`;
}

const SAT_PULSE_STYLE = `@keyframes satPulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.55; } }`;

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '6px 8px',
        borderRadius: '4px',
        background: 'rgba(8, 22, 48, 0.6)',
        border: '1px solid rgba(30, 180, 255, 0.1)',
        marginBottom: '4px',
      }}
    >
      <style>{SAT_PULSE_STYLE}</style>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'rgba(100,150,200,0.4)',
          animation: 'satPulse 1.4s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          flex: 1,
          height: 10,
          borderRadius: 3,
          background: 'rgba(80,120,180,0.25)',
          animation: 'satPulse 1.4s ease-in-out infinite 0.1s',
        }}
      />
      <div
        style={{
          width: 55,
          height: 10,
          borderRadius: 3,
          background: 'rgba(80,120,180,0.18)',
          animation: 'satPulse 1.4s ease-in-out infinite 0.2s',
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const SatellitePanel: React.FC<SatellitePanelProps> = ({
  satellites,
  onSelect,
  onFlyTo,
  visible,
  onToggle,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const isLoading = satellites.length === 0;

  // Derived counts
  const counts = useMemo(() => {
    const military  = satellites.filter(s => s.category === 'military' || s.category === 'spy' || s.category === 'reconnaissance').length;
    const navigation = satellites.filter(s => s.category === 'navigation').length;
    const leo = satellites.filter(s => getOrbitClass(s.alt) === 'LEO').length;
    const meo = satellites.filter(s => getOrbitClass(s.alt) === 'MEO').length;
    const geo = satellites.filter(s => getOrbitClass(s.alt) === 'GEO').length;
    const heo = satellites.filter(s => getOrbitClass(s.alt) === 'HEO').length;
    return { military, navigation, leo, meo, geo, heo };
  }, [satellites]);

  // ISS
  const issSat = useMemo(() => satellites.find(s => s.category === 'iss'), [satellites]);

  // Filtered & sorted list (ISS excluded from main list; shown in featured card)
  const filteredList = useMemo(() => {
    let list = satellites.filter(s => s.category !== 'iss');
    if (activeFilter !== 'all') {
      list = list.filter(s => CATEGORY_META[s.category].filterKey === activeFilter);
    }
    return list.slice().sort((a, b) => b.alt - a.alt);
  }, [satellites, activeFilter]);

  if (!visible) return null;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '80px',
    left: '300px',
    width: '320px',
    maxWidth: 'calc(100vw - 320px)',
    zIndex: 1200,
    fontFamily: '"Share Tech Mono", "Courier New", monospace',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(4, 12, 26, 0.97)',
    border: '1px solid rgba(0, 229, 255, 0.35)',
    borderBottom: collapsed ? undefined : '1px solid rgba(0, 229, 255, 0.14)',
    borderRadius: collapsed ? '6px' : '6px 6px 0 0',
    padding: '7px 11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const bodyStyle: React.CSSProperties = {
    background: 'rgba(4, 12, 26, 0.95)',
    border: '1px solid rgba(0, 229, 255, 0.35)',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 8px 8px 8px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0, 229, 255, 0.2) transparent',
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(0, 229, 255, 0.1)',
    margin: '6px 0',
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: 'rgba(160, 200, 230, 0.7)',
    padding: '2px 0',
  };

  return (
    <div style={panelStyle}>
      {/* ── Header ── */}
      <div
        style={headerStyle}
        onClick={() => setCollapsed(c => !c)}
        title="Toggle Satellite Tracking"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'rgba(0, 229, 255, 0.95)',
              letterSpacing: '0.06em',
            }}
          >
            🛰 SATELLITE TRACKING
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(0, 200, 255, 0.55)',
              fontWeight: 400,
            }}
          >
            [{satellites.length} total]
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              background: 'rgba(0, 180, 255, 0.1)',
              border: '1px solid rgba(0, 180, 255, 0.28)',
              color: 'rgba(80, 190, 255, 0.7)',
              borderRadius: '3px',
              padding: '1px 6px',
              fontSize: '10px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 180, 255, 0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0, 180, 255, 0.1)')}
            title="Hide panel"
          >
            ✕
          </button>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(0, 200, 255, 0.45)',
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

      {/* ── Body ── */}
      {!collapsed && (
        <div style={bodyStyle}>

          {/* ── Category filter pills ── */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
              marginBottom: '6px',
            }}
          >
            {FILTER_PILLS.map(pill => {
              const active = activeFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setActiveFilter(pill.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: active ? 'rgba(0, 200, 100, 0.22)' : 'rgba(10, 28, 55, 0.8)',
                    border: active
                      ? '1px solid rgba(0, 220, 100, 0.55)'
                      : '1px solid rgba(0, 180, 255, 0.2)',
                    borderRadius: '3px',
                    padding: '2px 6px',
                    fontSize: '9px',
                    fontFamily: 'inherit',
                    color: active ? '#ffffff' : 'rgba(160, 200, 230, 0.7)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    letterSpacing: '0.05em',
                    transition: 'background 0.15s, border 0.15s, color 0.15s',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: pill.dot,
                      flexShrink: 0,
                      opacity: active ? 1 : 0.65,
                    }}
                  />
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* ── Stats row ── */}
          <div
            style={{
              background: 'rgba(0, 20, 45, 0.7)',
              border: '1px solid rgba(0, 180, 255, 0.12)',
              borderRadius: '4px',
              padding: '5px 8px',
              marginBottom: '6px',
            }}
          >
            <div style={{ ...statRowStyle, marginBottom: '3px' }}>
              <span>
                Total:{' '}
                <span style={{ color: 'rgba(0, 229, 255, 0.9)', fontWeight: 700 }}>
                  {satellites.length}
                </span>
              </span>
              <span>
                Military:{' '}
                <span style={{ color: '#ff5555', fontWeight: 700 }}>{counts.military}</span>
              </span>
              <span>
                Nav:{' '}
                <span style={{ color: '#22cc66', fontWeight: 700 }}>{counts.navigation}</span>
              </span>
            </div>
            <div style={{ ...statRowStyle, color: 'rgba(140, 175, 210, 0.55)' }}>
              <span>LEO: {counts.leo}</span>
              <span>MEO: {counts.meo}</span>
              <span>GEO: {counts.geo}</span>
              <span>HEO: {counts.heo}</span>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ── ISS Featured Card ── */}
          {(activeFilter === 'all' || activeFilter === 'iss') && (
            issSat ? (
              <div
                style={{
                  background: 'rgba(0, 40, 60, 0.85)',
                  border: '2px solid rgba(0, 229, 255, 0.55)',
                  borderRadius: '5px',
                  padding: '8px 10px',
                  marginBottom: '7px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => onSelect(issSat)}
                title="Select ISS"
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#00e5ff',
                    letterSpacing: '0.07em',
                    marginBottom: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span>🌟 INTERNATIONAL SPACE STATION</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '9px',
                      background: 'rgba(0, 200, 255, 0.14)',
                      border: '1px solid rgba(0, 200, 255, 0.35)',
                      color: 'rgba(0, 220, 255, 0.8)',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      letterSpacing: '0.06em',
                    }}
                  >
                    LIVE
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '3px 10px',
                    fontSize: '10px',
                    color: 'rgba(160, 220, 240, 0.8)',
                    marginBottom: '5px',
                  }}
                >
                  <span>
                    Lat:{' '}
                    <span style={{ color: '#7fffcc' }}>
                      {formatCoord(issSat.lat, 'N', 'S')}
                    </span>
                  </span>
                  <span>
                    Lng:{' '}
                    <span style={{ color: '#7fffcc' }}>
                      {formatCoord(issSat.lng, 'E', 'W')}
                    </span>
                  </span>
                  <span>
                    Alt:{' '}
                    <span style={{ color: '#ffdd77' }}>
                      {Math.round(issSat.alt)} km
                    </span>
                  </span>
                  <span>
                    Vel:{' '}
                    <span style={{ color: '#ffdd77' }}>
                      {issSat.velocity.toFixed(1)} km/s
                    </span>
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '9px',
                    color: 'rgba(120, 195, 220, 0.6)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Updated: {lastSeenAgo(issSat)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); onFlyTo(issSat.lat, issSat.lng); }}
                    style={{
                      background: 'rgba(0, 180, 255, 0.14)',
                      border: '1px solid rgba(0, 180, 255, 0.38)',
                      color: 'rgba(80, 200, 255, 0.9)',
                      borderRadius: '3px',
                      padding: '2px 7px',
                      fontSize: '9px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      letterSpacing: '0.03em',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 180, 255, 0.28)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0, 180, 255, 0.14)')}
                  >
                    📍 Track
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div
                style={{
                  background: 'rgba(0, 40, 60, 0.6)',
                  border: '2px solid rgba(0, 229, 255, 0.2)',
                  borderRadius: '5px',
                  padding: '12px 10px',
                  marginBottom: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <style>{SAT_PULSE_STYLE}</style>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#00e5ff',
                    animation: 'satPulse 1.4s ease-in-out infinite',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 3,
                    background: 'rgba(0, 180, 255, 0.18)',
                    animation: 'satPulse 1.4s ease-in-out infinite',
                  }}
                />
              </div>
            ) : null
          )}

          {/* ── Satellite list ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: `${8 * 40}px`,
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 180, 255, 0.2) transparent',
            }}
          >
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={`skeleton-${i}`} />)
              : filteredList.length === 0
              ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'rgba(100, 150, 190, 0.4)',
                    fontSize: '11px',
                    padding: '18px 0',
                    letterSpacing: '0.04em',
                  }}
                >
                  No satellites in this category
                </div>
              )
              : filteredList.map(sat => {
                  const meta = CATEGORY_META[sat.category];
                  const orbit = getOrbitClass(sat.alt);
                  const isHovered = hoveredId === sat.id;
                  const nameShort = sat.name.length > 20 ? sat.name.slice(0, 19) + '…' : sat.name;

                  return (
                    <div
                      key={sat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '5px 8px',
                        borderRadius: '4px',
                        background: isHovered ? 'rgba(0, 30, 60, 0.9)' : 'rgba(6, 18, 40, 0.75)',
                        border: `1px solid ${isHovered ? 'rgba(0, 200, 255, 0.3)' : 'rgba(0, 180, 255, 0.1)'}`,
                        cursor: 'pointer',
                        transition: 'background 0.12s, border 0.12s',
                        position: 'relative',
                      }}
                      onClick={() => onSelect(sat)}
                      onMouseEnter={() => setHoveredId(sat.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Category dot */}
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: meta.dot,
                          flexShrink: 0,
                          boxShadow: isHovered ? `0 0 5px ${meta.dot}` : undefined,
                        }}
                      />

                      {/* Name */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: '11px',
                          color: isHovered ? 'rgba(210, 235, 255, 0.95)' : 'rgba(175, 210, 235, 0.82)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                        title={sat.name}
                      >
                        {nameShort}
                      </span>

                      {/* Altitude + orbit band */}
                      <span
                        style={{
                          fontSize: '9px',
                          color: 'rgba(140, 180, 215, 0.6)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {Math.round(sat.alt)} km{' '}
                        <span
                          style={{
                            color:
                              orbit === 'LEO' ? '#22cc66'
                              : orbit === 'MEO' ? '#e6c200'
                              : orbit === 'GEO' ? '#66ccff'
                              : '#ff8c00',
                          }}
                        >
                          {orbit}
                        </span>
                      </span>

                      {/* Country */}
                      <span
                        style={{
                          fontSize: '9px',
                          color: 'rgba(120, 160, 200, 0.5)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          minWidth: '24px',
                          textAlign: 'right',
                        }}
                      >
                        {sat.country.length <= 3 ? sat.country.toUpperCase() : sat.country.slice(0, 3).toUpperCase()}
                      </span>

                      {/* Hover: Track button */}
                      {isHovered && (
                        <button
                          onClick={e => { e.stopPropagation(); onFlyTo(sat.lat, sat.lng); }}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'rgba(0, 150, 255, 0.18)',
                            border: '1px solid rgba(0, 180, 255, 0.4)',
                            color: 'rgba(80, 200, 255, 0.9)',
                            borderRadius: '3px',
                            padding: '2px 6px',
                            fontSize: '9px',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            letterSpacing: '0.03em',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 150, 255, 0.32)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0, 150, 255, 0.18)')}
                        >
                          📍 Track
                        </button>
                      )}
                    </div>
                  );
                })
            }
          </div>

          {/* ── Footer note ── */}
          {!isLoading && (
            <div
              style={{
                marginTop: '7px',
                padding: '4px 7px',
                background: 'rgba(0, 20, 45, 0.6)',
                border: '1px solid rgba(0, 180, 255, 0.1)',
                borderRadius: '3px',
                fontSize: '9px',
                color: 'rgba(100, 150, 195, 0.5)',
                letterSpacing: '0.03em',
                textAlign: 'center',
              }}
            >
              TLE data — positions updated in real-time via SGP4 propagation
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SatellitePanel;
