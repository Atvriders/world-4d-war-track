import React, { useState } from 'react';

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

interface GpsJamPanelProps {
  gpsJamCells: GpsJamCell[];
  onFlyTo: (lat: number, lng: number) => void;
  visible: boolean;
  onToggle: () => void;
}

// Lookup table: [lat, lng, name]
const LOCATION_LOOKUP: Array<[number, number, string]> = [
  [54.7, 20.5, 'Kaliningrad, Russia'],
  [48.0, 37.8, 'Eastern Ukraine'],
  [43.5, 34.0, 'Black Sea'],
  [33.0, 35.5, 'Northern Israel/Lebanon'],
  [31.4, 34.4, 'Gaza Strip'],
  [33.3, 44.4, 'Baghdad, Iraq'],
  [34.8, 38.5, 'Syria'],
  [14.5, 43.0, 'Yemen/Red Sea'],
  [12.0, 48.0, 'Gulf of Aden'],
  [60.0, 27.0, 'Baltic/Finland'],
  [35.5, 35.0, 'E. Mediterranean'],
  [38.0, 126.5, 'Korean DMZ'],
  [16.0, 114.0, 'South China Sea'],
  [35.7, 51.4, 'Tehran, Iran'],
  [45.3, 34.1, 'Crimea'],
];

function getLocationName(lat: number, lng: number): string {
  let best = '';
  let bestDist = Infinity;
  for (const [tlat, tlng, name] of LOCATION_LOOKUP) {
    const d = Math.sqrt((lat - tlat) ** 2 + (lng - tlng) ** 2);
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  // If closest match is still pretty far, show coords
  if (bestDist > 5) {
    return `${lat.toFixed(1)}°N, ${lng.toFixed(1)}°E`;
  }
  return best;
}

function getIntensityColor(level: number): string {
  if (level >= 0.9) return '#ff2222';
  if (level >= 0.7) return '#ff8c00';
  if (level >= 0.4) return '#e6c200';
  return '#22cc66';
}

function getTypeIcon(type: GpsJamCell['type']): string {
  if (type === 'jamming') return '📡';
  if (type === 'spoofing') return '🔀';
  return '❓';
}

function getTypeLabel(type: GpsJamCell['type']): string {
  if (type === 'jamming') return 'JAM';
  if (type === 'spoofing') return 'SPOOF';
  return 'UNK';
}

function getTypeLabelColor(type: GpsJamCell['type']): string {
  if (type === 'jamming') return '#e6c200';
  if (type === 'spoofing') return '#ff8c00';
  return 'rgba(160, 185, 220, 0.6)';
}

const GpsJamPanel: React.FC<GpsJamPanelProps> = ({ gpsJamCells, onFlyTo, visible, onToggle }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!visible) return null;

  const jammingZones = gpsJamCells.filter(c => c.type === 'jamming');
  const spoofingZones = gpsJamCells.filter(c => c.type === 'spoofing');
  const totalZones = gpsJamCells.length;

  // Find highest intensity zone
  let highestCell: GpsJamCell | null = null;
  for (const cell of gpsJamCells) {
    if (!highestCell || cell.level > highestCell.level) highestCell = cell;
  }
  const highestIntensityStr = highestCell
    ? `${Math.round(highestCell.level * 100)}% at ${getLocationName(highestCell.lat, highestCell.lng)}`
    : '—';

  // Show up to 6 zones in the list
  const visibleCells = gpsJamCells.slice(0, 6);

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '210px',
    left: '16px',
    width: '310px',
    maxWidth: 'calc(100vw - 32px)',
    zIndex: 1150,
    fontFamily: '"Share Tech Mono", "Courier New", monospace',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.97)',
    border: '1px solid rgba(30, 180, 255, 0.38)',
    borderBottom: collapsed ? undefined : '1px solid rgba(30, 180, 255, 0.18)',
    borderRadius: collapsed ? '6px' : '6px 6px 0 0',
    padding: '7px 11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const bodyStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.93)',
    border: '1px solid rgba(30, 180, 255, 0.38)',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 8px 6px 8px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(30, 180, 255, 0.25) transparent',
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'rgba(170, 200, 235, 0.78)',
    padding: '2px 0',
    borderBottom: '1px solid rgba(30, 180, 255, 0.08)',
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(30, 180, 255, 0.12)',
    margin: '6px 0',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div
        style={headerStyle}
        onClick={() => setCollapsed(c => !c)}
        title="Toggle GPS Interference Monitor"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(30, 200, 255, 0.95)', letterSpacing: '0.06em' }}>
            📡 GPS INTERFERENCE MONITOR
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              background: 'rgba(30, 144, 255, 0.1)',
              border: '1px solid rgba(30, 144, 255, 0.3)',
              color: 'rgba(100, 180, 255, 0.75)',
              borderRadius: '3px',
              padding: '1px 6px',
              fontSize: '10px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30, 144, 255, 0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30, 144, 255, 0.1)')}
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
          {/* Summary Stats */}
          <div style={{ marginBottom: '6px' }}>
            <div style={statRowStyle}>
              <span>Total active zones</span>
              <span style={{ color: 'rgba(30, 210, 255, 0.9)', fontWeight: 700 }}>{totalZones}</span>
            </div>
            <div style={statRowStyle}>
              <span>Jamming zones</span>
              <span style={{ color: '#e6c200', fontWeight: 700 }}>{jammingZones.length}</span>
            </div>
            <div style={statRowStyle}>
              <span>Spoofing zones</span>
              <span style={{ color: '#ff8c00', fontWeight: 700 }}>{spoofingZones.length}</span>
            </div>
            <div style={{ ...statRowStyle, borderBottom: 'none' }}>
              <span>Highest intensity</span>
              <span
                style={{
                  color: highestCell ? getIntensityColor(highestCell.level) : 'rgba(160, 185, 220, 0.5)',
                  fontWeight: 700,
                  fontSize: '10px',
                  maxWidth: '160px',
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={highestIntensityStr}
              >
                {highestIntensityStr}
              </span>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Zone list */}
          {totalZones === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(120, 150, 190, 0.45)',
                fontSize: '12px',
                padding: '16px 0',
                letterSpacing: '0.04em',
              }}
            >
              No active interference zones
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                maxHeight: `${6 * 72}px`,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(30, 180, 255, 0.2) transparent',
              }}
            >
              {visibleCells.map((cell, i) => {
                const locationName = getLocationName(cell.lat, cell.lng);
                const intensityColor = getIntensityColor(cell.level);
                const intensityPct = Math.round(cell.level * 100);
                const typeIcon = getTypeIcon(cell.type);
                const typeLabel = getTypeLabel(cell.type);
                const typeLabelColor = getTypeLabelColor(cell.type);

                return (
                  <div
                    key={`${cell.lat}-${cell.lng}-${cell.type}`}
                    style={{
                      background: 'rgba(8, 22, 48, 0.82)',
                      border: `1px solid rgba(30, 180, 255, 0.15)`,
                      borderLeft: `3px solid ${intensityColor}`,
                      borderRadius: '4px',
                      padding: '6px 8px 6px 9px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {/* Row 1: icon + type badge + location + confirmed badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                      <span style={{ fontSize: '13px', lineHeight: 1, flexShrink: 0 }}>{typeIcon}</span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: typeLabelColor,
                          background: `${typeLabelColor}22`,
                          border: `1px solid ${typeLabelColor}44`,
                          borderRadius: '2px',
                          padding: '1px 4px',
                          flexShrink: 0,
                        }}
                      >
                        {typeLabel}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'rgba(190, 215, 245, 0.88)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0,
                        }}
                        title={locationName}
                      >
                        {locationName}
                      </span>
                      {cell.confirmed ? (
                        <span
                          title="Confirmed"
                          style={{
                            fontSize: '11px',
                            color: '#22cc66',
                            flexShrink: 0,
                          }}
                        >
                          ✔
                        </span>
                      ) : (
                        <span
                          title="Unconfirmed"
                          style={{
                            fontSize: '11px',
                            color: 'rgba(130, 155, 185, 0.45)',
                            flexShrink: 0,
                          }}
                        >
                          ○
                        </span>
                      )}
                    </div>

                    {/* Row 2: Intensity bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '5px',
                          background: 'rgba(255,255,255,0.07)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${intensityPct}%`,
                            height: '100%',
                            background: intensityColor,
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: intensityColor,
                          fontWeight: 700,
                          flexShrink: 0,
                          minWidth: '30px',
                          textAlign: 'right',
                        }}
                      >
                        {intensityPct}%
                      </span>
                    </div>

                    {/* Row 3: radius + fly-to */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(140, 170, 210, 0.6)' }}>
                        {cell.radius} km affected
                      </span>
                      <button
                        onClick={() => onFlyTo(cell.lat, cell.lng)}
                        style={{
                          background: 'rgba(30, 144, 255, 0.12)',
                          border: '1px solid rgba(30, 144, 255, 0.35)',
                          color: 'rgba(100, 180, 255, 0.88)',
                          borderRadius: '3px',
                          padding: '2px 7px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30, 144, 255, 0.26)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30, 144, 255, 0.12)')}
                      >
                        📍 Fly To
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Warning banner */}
          <div
            style={{
              marginTop: '7px',
              background: 'rgba(255, 160, 0, 0.07)',
              border: '1px solid rgba(255, 160, 0, 0.25)',
              borderRadius: '3px',
              padding: '5px 8px',
              fontSize: '10px',
              color: 'rgba(255, 185, 80, 0.82)',
              lineHeight: 1.45,
              letterSpacing: '0.02em',
            }}
          >
            ⚠ GPS-dependent navigation affected in highlighted regions. Verify with backup systems.
          </div>
        </div>
      )}
    </div>
  );
};

export default GpsJamPanel;
