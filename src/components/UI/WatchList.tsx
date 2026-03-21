import React, { useMemo, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WatchedEntity {
  type: 'aircraft' | 'ship' | 'satellite';
  id: string;
  label: string;
  addedAt: number;
}

interface WatchListProps {
  watchedEntities: WatchedEntity[];
  aircraft: Array<{ icao24: string; callsign: string; lat: number; lng: number; altitude: number; isMilitary: boolean }>;
  ships: Array<{ mmsi: string; name: string; lat: number; lng: number; speed: number }>;
  satellites: Array<{ id: string; name: string; lat: number; lng: number; alt: number; category: string }>;
  onFlyTo: (lat: number, lng: number) => void;
  onRemove: (id: string) => void;
  onAdd: (type: string, id: string) => void;
  visible: boolean;
  onToggle: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

function formatCoord(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${latDir} ${Math.abs(lng).toFixed(1)}°${lngDir}`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 300;

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 80,
    right: 16,
    zIndex: 1000,
    fontFamily: "'Courier New', Courier, monospace",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 0,
    pointerEvents: 'none',
  },
  toggleBtn: {
    pointerEvents: 'all',
    background: 'rgba(10, 14, 20, 0.96)',
    border: '1px solid rgba(0, 255, 136, 0.4)',
    borderRadius: 4,
    color: '#00ff88',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '6px 10px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, border-color 0.15s',
  },
  panel: {
    pointerEvents: 'all',
    width: PANEL_WIDTH,
    maxHeight: 480,
    background: 'rgba(5, 12, 22, 0.97)',
    border: '1px solid rgba(0, 255, 136, 0.35)',
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 4px 32px rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    marginBottom: 6,
  },
  header: {
    padding: '10px 12px 8px',
    borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexShrink: 0,
  },
  headerTitle: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  headerActions: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  copyBtn: {
    background: 'rgba(0, 255, 136, 0.08)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: 3,
    color: 'rgba(0, 255, 136, 0.8)',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 7px',
    cursor: 'pointer',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '6px 0',
  },
  emptyState: {
    padding: '20px 16px',
    color: 'rgba(160, 180, 170, 0.5)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 1.6,
  },
  emptyHint: {
    marginTop: 8,
    color: 'rgba(0, 255, 136, 0.35)',
    fontSize: 10,
    letterSpacing: '0.05em',
  },
  entityCard: {
    margin: '4px 8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(0, 255, 136, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 9px 5px',
    gap: 6,
    borderBottom: '1px solid rgba(0, 255, 136, 0.08)',
  },
  typeIcon: {
    fontSize: 14,
    flexShrink: 0,
    lineHeight: 1,
  },
  callsign: {
    flex: 1,
    color: '#d0e8f0',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
  },
  milBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: '#ff4444',
    background: 'rgba(255, 68, 68, 0.12)',
    border: '1px solid rgba(255, 68, 68, 0.3)',
    borderRadius: 2,
    padding: '1px 5px',
    letterSpacing: '0.08em',
    flexShrink: 0,
  },
  catBadge: {
    fontSize: 9,
    fontWeight: 700,
    borderRadius: 2,
    padding: '1px 5px',
    letterSpacing: '0.06em',
    flexShrink: 0,
  },
  cardBody: {
    padding: '5px 9px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dataLabel: {
    color: 'rgba(160, 200, 180, 0.5)',
    fontSize: 10,
    flexShrink: 0,
  },
  dataValue: {
    color: '#b0ccda',
    fontSize: 10,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  liveValue: {
    color: '#00ff88',
    fontSize: 10,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 700,
  },
  cardActions: {
    display: 'flex',
    padding: '4px 9px 7px',
    gap: 5,
  },
  actionBtn: {
    flex: 1,
    background: 'rgba(0, 255, 136, 0.06)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: 3,
    color: 'rgba(0, 255, 136, 0.8)',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.06em',
    padding: '4px 0',
    cursor: 'pointer',
    textTransform: 'uppercase',
    textAlign: 'center',
    transition: 'background 0.12s, color 0.12s',
  },
  removeBtn: {
    background: 'rgba(255, 60, 60, 0.05)',
    border: '1px solid rgba(255, 60, 60, 0.2)',
    borderRadius: 3,
    color: 'rgba(255, 80, 80, 0.7)',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 11,
    fontWeight: 700,
    width: 24,
    padding: '3px 0',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background 0.12s, color 0.12s',
    flexShrink: 0,
    lineHeight: 1,
  },
  addedAt: {
    color: 'rgba(0, 255, 136, 0.3)',
    fontSize: 9,
    textAlign: 'right',
    paddingRight: 9,
    paddingBottom: 4,
    letterSpacing: '0.04em',
  },
  footer: {
    padding: '7px 10px',
    borderTop: '1px solid rgba(0, 255, 136, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  footerHint: {
    flex: 1,
    color: 'rgba(0, 255, 136, 0.35)',
    fontSize: 9,
    letterSpacing: '0.05em',
    lineHeight: 1.4,
  },
  copiedBadge: {
    color: '#00ff88',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    animation: 'fadeOut 1s ease forwards',
  },
};

// ── Satellite category color map ──────────────────────────────────────────────

const SAT_CAT_COLORS: Record<string, string> = {
  military: '#ff4444',
  spy: '#ff4444',
  reconnaissance: '#ff6600',
  navigation: '#00aaff',
  commercial: '#888888',
  weather: '#00ccff',
  starlink: '#aaaaff',
  iss: '#00ff88',
  other: '#666666',
};

function satCatColor(category: string): string {
  return SAT_CAT_COLORS[category] ?? '#888888';
}

// ── Entity card sub-components ────────────────────────────────────────────────

function AircraftCard({
  watched,
  liveData,
  onFlyTo,
  onRemove,
}: {
  watched: WatchedEntity;
  liveData: { icao24: string; callsign: string; lat: number; lng: number; altitude: number; isMilitary: boolean } | undefined;
  onFlyTo: (lat: number, lng: number) => void;
  onRemove: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const displayName = liveData ? (liveData.callsign || liveData.icao24.toUpperCase()) : watched.label;

  return (
    <div
      style={{
        ...styles.entityCard,
        borderColor: hovered ? 'rgba(0, 255, 136, 0.35)' : 'rgba(0, 255, 136, 0.15)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardHeader}>
        <span style={styles.typeIcon}>✈️</span>
        <span style={styles.callsign} title={displayName}>{displayName}</span>
        {liveData?.isMilitary && <span style={styles.milBadge}>MIL</span>}
        <button
          style={styles.removeBtn}
          onClick={() => onRemove(watched.id)}
          title="Remove from watch list"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ff4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 80, 80, 0.7)'; }}
        >
          ✕
        </button>
      </div>

      {liveData ? (
        <div style={styles.cardBody}>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Altitude</span>
            <span style={styles.liveValue}>
              {liveData.altitude.toLocaleString()} m · {metersToFeet(liveData.altitude).toLocaleString()} ft
            </span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Position</span>
            <span style={styles.dataValue}>{formatCoord(liveData.lat, liveData.lng)}</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>ICAO24</span>
            <span style={{ ...styles.dataValue, color: '#88bbdd', fontFamily: 'monospace' }}>
              {liveData.icao24.toUpperCase()}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.cardBody }}>
          <span style={{ color: 'rgba(200,100,100,0.7)', fontSize: 10 }}>Signal lost — not in current feed</span>
        </div>
      )}

      <div style={styles.cardActions}>
        <button
          style={styles.actionBtn}
          disabled={!liveData}
          onClick={() => liveData && onFlyTo(liveData.lat, liveData.lng)}
          title="Fly to location"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.14)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.06)'; }}
        >
          📍 Fly To
        </button>
      </div>

      <div style={styles.addedAt}>Pinned {timeAgo(watched.addedAt)}</div>
    </div>
  );
}

function ShipCard({
  watched,
  liveData,
  onFlyTo,
  onRemove,
}: {
  watched: WatchedEntity;
  liveData: { mmsi: string; name: string; lat: number; lng: number; speed: number } | undefined;
  onFlyTo: (lat: number, lng: number) => void;
  onRemove: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const displayName = liveData ? liveData.name : watched.label;

  return (
    <div
      style={{
        ...styles.entityCard,
        borderColor: hovered ? 'rgba(0, 170, 255, 0.4)' : 'rgba(0, 170, 255, 0.15)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardHeader}>
        <span style={styles.typeIcon}>🚢</span>
        <span style={styles.callsign} title={displayName}>{displayName}</span>
        <button
          style={styles.removeBtn}
          onClick={() => onRemove(watched.id)}
          title="Remove from watch list"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ff4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 80, 80, 0.7)'; }}
        >
          ✕
        </button>
      </div>

      {liveData ? (
        <div style={styles.cardBody}>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Speed</span>
            <span style={styles.liveValue}>{liveData.speed.toFixed(1)} kts</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Position</span>
            <span style={styles.dataValue}>{formatCoord(liveData.lat, liveData.lng)}</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>MMSI</span>
            <span style={{ ...styles.dataValue, color: '#88bbdd', fontFamily: 'monospace' }}>
              {liveData.mmsi}
            </span>
          </div>
        </div>
      ) : (
        <div style={styles.cardBody}>
          <span style={{ color: 'rgba(200,100,100,0.7)', fontSize: 10 }}>Signal lost — not in current feed</span>
        </div>
      )}

      <div style={styles.cardActions}>
        <button
          style={styles.actionBtn}
          disabled={!liveData}
          onClick={() => liveData && onFlyTo(liveData.lat, liveData.lng)}
          title="Fly to location"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.14)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.06)'; }}
        >
          📍 Fly To
        </button>
      </div>

      <div style={styles.addedAt}>Pinned {timeAgo(watched.addedAt)}</div>
    </div>
  );
}

function SatelliteCard({
  watched,
  liveData,
  onFlyTo,
  onRemove,
}: {
  watched: WatchedEntity;
  liveData: { id: string; name: string; lat: number; lng: number; alt: number; category: string } | undefined;
  onFlyTo: (lat: number, lng: number) => void;
  onRemove: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const displayName = liveData ? liveData.name : watched.label;
  const catColor = satCatColor(liveData?.category ?? '');

  return (
    <div
      style={{
        ...styles.entityCard,
        borderColor: hovered ? `${catColor}55` : `${catColor}22`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardHeader}>
        <span style={styles.typeIcon}>🛰️</span>
        <span style={styles.callsign} title={displayName}>{displayName}</span>
        {liveData && (
          <span
            style={{
              ...styles.catBadge,
              color: catColor,
              background: `${catColor}18`,
              border: `1px solid ${catColor}44`,
            }}
          >
            {liveData.category.toUpperCase()}
          </span>
        )}
        <button
          style={styles.removeBtn}
          onClick={() => onRemove(watched.id)}
          title="Remove from watch list"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ff4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 80, 80, 0.7)'; }}
        >
          ✕
        </button>
      </div>

      {liveData ? (
        <div style={styles.cardBody}>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Altitude</span>
            <span style={styles.liveValue}>{liveData.alt.toLocaleString()} km</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Position</span>
            <span style={styles.dataValue}>{formatCoord(liveData.lat, liveData.lng)}</span>
          </div>
        </div>
      ) : (
        <div style={styles.cardBody}>
          <span style={{ color: 'rgba(200,100,100,0.7)', fontSize: 10 }}>Out of tracking range</span>
        </div>
      )}

      <div style={styles.cardActions}>
        <button
          style={styles.actionBtn}
          disabled={!liveData}
          onClick={() => liveData && onFlyTo(liveData.lat, liveData.lng)}
          title="Fly to location"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.14)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.06)'; }}
        >
          📍 Fly To
        </button>
      </div>

      <div style={styles.addedAt}>Pinned {timeAgo(watched.addedAt)}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const WatchList: React.FC<WatchListProps> = ({
  watchedEntities,
  aircraft,
  ships,
  satellites,
  onFlyTo,
  onRemove,
  onAdd,
  visible,
  onToggle,
}) => {
  const [copied, setCopied] = useState(false);

  // Build lookup maps for O(1) live data access
  const aircraftMap = useMemo(() => {
    const map = new Map<string, typeof aircraft[number]>();
    for (const ac of aircraft) map.set(ac.icao24, ac);
    return map;
  }, [aircraft]);

  const shipMap = useMemo(() => {
    const map = new Map<string, typeof ships[number]>();
    for (const ship of ships) map.set(ship.mmsi, ship);
    return map;
  }, [ships]);

  const satelliteMap = useMemo(() => {
    const map = new Map<string, typeof satellites[number]>();
    for (const sat of satellites) map.set(sat.id, sat);
    return map;
  }, [satellites]);

  const count = watchedEntities.length;

  function handleCopyIds() {
    const ids = watchedEntities.map((w) => w.id).join('\n');
    navigator.clipboard.writeText(ids).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={styles.container}>
      {/* Panel — rendered above toggle button */}
      {visible && (
        <div style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <span style={styles.headerTitle}>
              📌 Watch List [{count}]
            </span>
            <div style={styles.headerActions}>
              {copied ? (
                <span style={styles.copiedBadge}>✓ COPIED</span>
              ) : (
                count > 0 && (
                  <button
                    style={styles.copyBtn}
                    onClick={handleCopyIds}
                    title="Copy all IDs (ICAO24 / MMSI) to clipboard"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.15)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.08)'; }}
                  >
                    📋 Copy IDs
                  </button>
                )
              )}
            </div>
          </div>

          {/* Scroll area */}
          <div style={styles.scrollArea}>
            {count === 0 ? (
              <div style={styles.emptyState}>
                No entities being tracked.
                <br />
                Click an entity on the globe to add to watch list.
                <div style={styles.emptyHint}>
                  Right-click entities for quick-pin options.
                </div>
              </div>
            ) : (
              watchedEntities.map((watched) => {
                if (watched.type === 'aircraft') {
                  return (
                    <AircraftCard
                      key={watched.id}
                      watched={watched}
                      liveData={aircraftMap.get(watched.id)}
                      onFlyTo={onFlyTo}
                      onRemove={onRemove}
                    />
                  );
                }
                if (watched.type === 'ship') {
                  return (
                    <ShipCard
                      key={watched.id}
                      watched={watched}
                      liveData={shipMap.get(watched.id)}
                      onFlyTo={onFlyTo}
                      onRemove={onRemove}
                    />
                  );
                }
                if (watched.type === 'satellite') {
                  return (
                    <SatelliteCard
                      key={watched.id}
                      watched={watched}
                      liveData={satelliteMap.get(watched.id)}
                      onFlyTo={onFlyTo}
                      onRemove={onRemove}
                    />
                  );
                }
                return null;
              })
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <span style={styles.footerHint}>
              Right-click any globe entity to pin it here.
            </span>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        style={{
          ...styles.toggleBtn,
          background: visible
            ? 'rgba(0, 255, 136, 0.15)'
            : 'rgba(10, 14, 20, 0.96)',
          borderColor: visible
            ? 'rgba(0, 255, 136, 0.7)'
            : 'rgba(0, 255, 136, 0.4)',
        }}
        onClick={onToggle}
        title={visible ? 'Hide Watch List' : 'Show Watch List'}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.18)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = visible
            ? 'rgba(0,255,136,0.15)'
            : 'rgba(10,14,20,0.96)';
        }}
      >
        📌 Watch List {count > 0 ? `[${count}]` : ''}
      </button>
    </div>
  );
};

export default WatchList;
