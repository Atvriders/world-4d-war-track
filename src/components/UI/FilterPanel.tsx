import React, { useState } from 'react';

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

interface FilterPanelProps {
  layers: LayerVisibility;
  onToggleLayer: (key: string) => void;
  counts: {
    satellites: number;
    militarySatellites: number;
    aircraft: number;
    militaryAircraft: number;
    ships: number;
    warships: number;
    conflicts: number;
    gpsJamCells: number;
  };
}

const PANEL_WIDTH = 280;

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    zIndex: 1000,
    display: 'flex',
    fontFamily: "'Courier New', Courier, monospace",
    pointerEvents: 'none',
  },
  panel: {
    height: '100%',
    background: 'rgba(10, 14, 20, 0.96)',
    borderRight: '1px solid rgba(0, 255, 100, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'width 0.25s ease',
    pointerEvents: 'all',
    boxShadow: '4px 0 24px rgba(0,0,0,0.6)',
  },
  toggleButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 24,
    height: 56,
    background: 'rgba(10, 14, 20, 0.96)',
    border: '1px solid rgba(0, 255, 100, 0.3)',
    borderLeft: 'none',
    borderRadius: '0 6px 6px 0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(0, 255, 100, 0.8)',
    fontSize: 14,
    pointerEvents: 'all',
    userSelect: 'none',
    transition: 'background 0.15s, color 0.15s',
    zIndex: 1001,
    boxShadow: '3px 0 10px rgba(0,0,0,0.5)',
  },
  header: {
    padding: '16px 14px 10px',
    borderBottom: '1px solid rgba(0, 255, 100, 0.15)',
    flexShrink: 0,
  },
  headerTitle: {
    color: 'rgba(0, 255, 100, 0.9)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    margin: 0,
    whiteSpace: 'nowrap',
  },
  headerSubtitle: {
    color: 'rgba(120, 160, 130, 0.6)',
    fontSize: 9,
    letterSpacing: '0.1em',
    marginTop: 3,
    whiteSpace: 'nowrap',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingBottom: 16,
  },
  section: {
    padding: '10px 0 4px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionLabel: {
    color: 'rgba(0, 200, 80, 0.5)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    padding: '0 14px 6px',
    whiteSpace: 'nowrap',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 14px',
    cursor: 'pointer',
    transition: 'background 0.12s',
    gap: 8,
    minHeight: 32,
  },
  icon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  labelGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 1,
    overflow: 'hidden',
  },
  labelMain: {
    color: 'rgba(200, 220, 210, 0.9)',
    fontSize: 11,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  labelSub: {
    color: 'rgba(200, 60, 60, 0.85)',
    fontSize: 9,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  countBadge: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'rgba(150, 180, 160, 0.7)',
    fontSize: 9,
    padding: '1px 5px',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  switchTrack: {
    width: 32,
    height: 17,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    padding: '0 2px',
    flexShrink: 0,
    transition: 'background 0.2s',
    cursor: 'pointer',
  },
  switchThumb: {
    width: 13,
    height: 13,
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  collapsedIcon: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '12px 0',
    gap: 4,
    flex: 1,
    overflowY: 'auto',
  },
  collapsedIconItem: {
    fontSize: 16,
    width: 40,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'background 0.12s',
  },
};

function formatCount(n: number): string {
  if (n >= 1000) return n.toLocaleString();
  return String(n);
}

interface ToggleSwitchProps {
  on: boolean;
}
function ToggleSwitch({ on }: ToggleSwitchProps) {
  return (
    <div
      style={{
        ...styles.switchTrack,
        background: on ? 'rgba(0, 200, 80, 0.7)' : 'rgba(60, 70, 65, 0.8)',
        border: on ? '1px solid rgba(0,255,100,0.4)' : '1px solid rgba(100,120,110,0.3)',
      }}
    >
      <div
        style={{
          ...styles.switchThumb,
          transform: on ? 'translateX(15px)' : 'translateX(0)',
        }}
      />
    </div>
  );
}

interface LayerRowProps {
  icon: string;
  label: string;
  layerKey: string;
  on: boolean;
  onToggle: (key: string) => void;
  countBadge?: React.ReactNode;
  subLabel?: React.ReactNode;
  indent?: boolean;
}
function LayerRow({ icon, label, layerKey, on, onToggle, countBadge, subLabel, indent }: LayerRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...styles.row,
        paddingLeft: indent ? 30 : 14,
        background: hovered ? 'rgba(0, 255, 100, 0.04)' : 'transparent',
        opacity: on ? 1 : 0.55,
      }}
      onClick={() => onToggle(layerKey)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={styles.icon}>{icon}</span>
      <div style={styles.labelGroup}>
        <span style={styles.labelMain}>
          <span>{label}</span>
          {countBadge && <span style={styles.countBadge}>{countBadge}</span>}
        </span>
        {subLabel && <span style={styles.labelSub}>{subLabel}</span>}
      </div>
      <ToggleSwitch on={on} />
    </div>
  );
}

const COLLAPSED_ICONS = [
  { icon: '🛰️', title: 'Satellites', layerKey: 'satellites' },
  { icon: '✈️', title: 'Aircraft', layerKey: 'aircraft' },
  { icon: '🚢', title: 'Ships', layerKey: 'ships' },
  { icon: '⚔️', title: 'Conflicts', layerKey: 'warZones' },
  { icon: '📡', title: 'GPS Jamming', layerKey: 'gpsJam' },
  { icon: '🌍', title: 'Atmosphere', layerKey: 'atmosphere' },
];

const FilterPanel: React.FC<FilterPanelProps> = ({ layers, onToggleLayer, counts }) => {
  const [open, setOpen] = useState(true);

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.panel,
          width: open ? PANEL_WIDTH : 40,
        }}
      >
        {open ? (
          <>
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerTitle}>Layers &amp; Filters</div>
              <div style={styles.headerSubtitle}>Toggle visibility</div>
            </div>

            {/* Scrollable content */}
            <div style={styles.scrollArea}>

              {/* SATELLITES */}
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Satellites</div>
                <LayerRow
                  icon="🛰️"
                  label="Satellites"
                  layerKey="satellites"
                  on={layers.satellites}
                  onToggle={onToggleLayer}
                  countBadge={formatCount(counts.satellites)}
                  subLabel={
                    counts.militarySatellites > 0
                      ? `⚠ ${formatCount(counts.militarySatellites)} MIL`
                      : undefined
                  }
                />
                <LayerRow
                  icon="〰️"
                  label="Orbital Paths"
                  layerKey="satelliteOrbits"
                  on={layers.satelliteOrbits}
                  onToggle={onToggleLayer}
                  indent
                />
                <LayerRow
                  icon="⭕"
                  label="Coverage Footprints"
                  layerKey="satelliteFootprints"
                  on={layers.satelliteFootprints}
                  onToggle={onToggleLayer}
                  indent
                />
                <LayerRow
                  icon="🔗"
                  label="Connection Lines"
                  layerKey="satelliteConnections"
                  on={layers.satelliteConnections}
                  onToggle={onToggleLayer}
                  indent
                />
              </div>

              {/* AIR TRAFFIC */}
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Air Traffic</div>
                <LayerRow
                  icon="✈️"
                  label="Aircraft"
                  layerKey="aircraft"
                  on={layers.aircraft}
                  onToggle={onToggleLayer}
                  countBadge={formatCount(counts.aircraft)}
                  subLabel={
                    counts.militaryAircraft > 0
                      ? `⚠ ${formatCount(counts.militaryAircraft)} MIL`
                      : undefined
                  }
                />
                <LayerRow
                  icon="💨"
                  label="Flight Trails"
                  layerKey="aircraftTrails"
                  on={layers.aircraftTrails}
                  onToggle={onToggleLayer}
                  indent
                />
              </div>

              {/* MARITIME */}
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Maritime</div>
                <LayerRow
                  icon="🚢"
                  label="Ships"
                  layerKey="ships"
                  on={layers.ships}
                  onToggle={onToggleLayer}
                  countBadge={formatCount(counts.ships)}
                  subLabel={
                    counts.warships > 0
                      ? `⚠ ${formatCount(counts.warships)} WARSHIPS`
                      : undefined
                  }
                />
                <LayerRow
                  icon="〰️"
                  label="Ship Trails"
                  layerKey="shipTrails"
                  on={layers.shipTrails}
                  onToggle={onToggleLayer}
                  indent
                />
              </div>

              {/* CONFLICT ZONES */}
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Conflict Zones</div>
                <LayerRow
                  icon="⚔️"
                  label="War Zone Areas"
                  layerKey="warZones"
                  on={layers.warZones}
                  onToggle={onToggleLayer}
                />
                <LayerRow
                  icon="💥"
                  label="Conflict Events"
                  layerKey="conflictEvents"
                  on={layers.conflictEvents}
                  onToggle={onToggleLayer}
                  countBadge={counts.conflicts > 0 ? formatCount(counts.conflicts) : undefined}
                />
                <LayerRow
                  icon="📍"
                  label="Front Lines"
                  layerKey="frontLines"
                  on={layers.frontLines}
                  onToggle={onToggleLayer}
                />
              </div>

              {/* INTERFERENCE */}
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Interference</div>
                <LayerRow
                  icon="📡"
                  label="GPS Jamming / Spoofing"
                  layerKey="gpsJam"
                  on={layers.gpsJam}
                  onToggle={onToggleLayer}
                  countBadge={counts.gpsJamCells > 0 ? `${formatCount(counts.gpsJamCells)} zones` : undefined}
                />
              </div>

              {/* DISPLAY */}
              <div style={{ ...styles.section, borderBottom: 'none' }}>
                <div style={styles.sectionLabel}>Display</div>
                <LayerRow
                  icon="🌍"
                  label="Atmosphere"
                  layerKey="atmosphere"
                  on={layers.atmosphere}
                  onToggle={onToggleLayer}
                />
              </div>

            </div>
          </>
        ) : (
          /* Collapsed: icon-only column */
          <div style={styles.collapsedIcon}>
            {COLLAPSED_ICONS.map(({ icon, title, layerKey }) => (
              <div
                key={title}
                title={title}
                style={{
                  ...styles.collapsedIconItem,
                  opacity: layers[layerKey as keyof LayerVisibility] ? 1 : 0.4,
                }}
                onClick={() => onToggleLayer(layerKey)}
              >
                {icon}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collapse / expand toggle button */}
      <button
        style={{
          ...styles.toggleButton,
          left: open ? PANEL_WIDTH : 40,
        }}
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Collapse panel' : 'Expand panel'}
      >
        {open ? '◀' : '▶'}
      </button>
    </div>
  );
};

export default FilterPanel;
