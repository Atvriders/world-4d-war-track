import React, { useState, useMemo } from 'react';
import { ConflictZone } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConflictSidebarProps {
  conflictZones: ConflictZone[];
  selectedConflictId: string | null;
  onSelect: (zone: ConflictZone) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

type SortMode = 'intensity' | 'casualties' | 'alpha';

// ── Constants ─────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 260;

const INTENSITY_ORDER: Record<ConflictZone['intensity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const INTENSITY_DOTS: Record<ConflictZone['intensity'], string> = {
  critical: '🔴🔴🔴🔴',
  high:     '🟠🟠🟠⚪',
  medium:   '🟡🟡⚪⚪',
  low:      '🟢⚪⚪⚪',
};

const INTENSITY_COLORS: Record<ConflictZone['intensity'], string> = {
  critical: '#ff2200',
  high:     '#ff6600',
  medium:   '#ffcc00',
  low:      '#00ff88',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCasualties(n: number | undefined): string {
  if (n === undefined || n === null) return 'N/A';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function getDuration(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = diffDays % 30;

  if (years > 0 && months > 0) return `${years}y ${months}mo`;
  if (years > 0) return `${years} year${years !== 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months !== 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function getRecentEventCount(events: ConflictZone['events']): number {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return events.filter((e) => new Date(e.date) >= cutoff).length;
}

function getConflictCentroid(zone: ConflictZone): { lat: number; lng: number } | null {
  try {
    const geo = zone.geoJSON?.geometry;
    if (geo?.type === 'Polygon') {
      const coords = (geo.coordinates as number[][][])[0];
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      return { lat, lng };
    }
    if (geo?.type === 'MultiPolygon') {
      const coords = (geo.coordinates as number[][][][])[0][0];
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      return { lat, lng };
    }
  } catch {
    // ignore
  }
  return null;
}

function getCountryFlags(countries: string[]): string {
  // Map common ISO codes to flag emojis; fallback to raw code
  const flagMap: Record<string, string> = {
    UA: '🇺🇦', RU: '🇷🇺', PS: '🇵🇸', IL: '🇮🇱', SD: '🇸🇩', YE: '🇾🇪',
    MM: '🇲🇲', ET: '🇪🇹', CD: '🇨🇩', SO: '🇸🇴', AF: '🇦🇫', IQ: '🇮🇶',
    SY: '🇸🇾', LY: '🇱🇾', ML: '🇲🇱', NI: '🇳🇮', MX: '🇲🇽', NG: '🇳🇬',
    CM: '🇨🇲', CF: '🇨🇫', MZ: '🇲🇿', SS: '🇸🇸', PK: '🇵🇰', IN: '🇮🇳',
    AZ: '🇦🇿', AM: '🇦🇲', ER: '🇪🇷', LB: '🇱🇧', IR: '🇮🇷', TD: '🇹🇩',
  };
  const flags = countries
    .slice(0, 2)
    .map((c) => flagMap[c.toUpperCase()] ?? c)
    .join('');
  return flags;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    right: 320, // left of InfoPanel (320px wide)
    height: '100vh',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'row-reverse',
    fontFamily: "'Courier New', Courier, monospace",
    pointerEvents: 'none',
  },
  panel: {
    height: '100%',
    background: 'rgba(8, 12, 20, 0.97)',
    borderLeft: '1px solid rgba(0, 255, 100, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    pointerEvents: 'all',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  },
  collapseBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    right: 0,
    width: 20,
    height: 52,
    background: 'rgba(8, 12, 20, 0.97)',
    border: '1px solid rgba(0, 255, 100, 0.28)',
    borderRight: 'none',
    borderRadius: '6px 0 0 6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(0, 255, 100, 0.8)',
    fontSize: 11,
    pointerEvents: 'all',
    userSelect: 'none',
    transition: 'background 0.15s, color 0.15s',
    zIndex: 1001,
    boxShadow: '-3px 0 10px rgba(0,0,0,0.5)',
  },
  header: {
    padding: '12px 12px 8px',
    borderBottom: '1px solid rgba(0, 255, 100, 0.15)',
    flexShrink: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerTitle: {
    color: 'rgba(0, 255, 100, 0.95)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    flex: 1,
    whiteSpace: 'nowrap',
  },
  countBadge: {
    background: 'rgba(255, 60, 60, 0.15)',
    border: '1px solid rgba(255, 60, 60, 0.4)',
    borderRadius: 3,
    color: '#ff6666',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  sortRow: {
    display: 'flex',
    gap: 4,
  },
  sortBtn: {
    flex: 1,
    padding: '3px 4px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0, 255, 100, 0.15)',
    borderRadius: 2,
    color: 'rgba(150, 190, 160, 0.7)',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
    whiteSpace: 'nowrap',
  },
  sortBtnActive: {
    background: 'rgba(0, 255, 100, 0.12)',
    border: '1px solid rgba(0, 255, 100, 0.45)',
    color: 'rgba(0, 255, 100, 0.95)',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingBottom: 8,
  },
  card: {
    margin: '6px 8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(0, 255, 100, 0.1)',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'background 0.12s, border-color 0.12s',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  cardHovered: {
    background: 'rgba(0, 255, 100, 0.06)',
    borderColor: 'rgba(0, 255, 100, 0.28)',
  },
  cardSelected: {
    background: 'rgba(0, 255, 100, 0.08)',
    border: '1px solid rgba(0, 255, 100, 0.65)',
    boxShadow: '0 0 8px rgba(0, 255, 100, 0.12)',
  },
  intensityBar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: '3px 0 0 3px',
  },
  cardInner: {
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 7,
    paddingBottom: 7,
  },
  cardRow1: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  cardFlags: {
    fontSize: 13,
    flexShrink: 0,
    lineHeight: 1,
  },
  cardName: {
    flex: 1,
    color: '#d0dce8',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: '0.02em',
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 2,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  cardRow2: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 3,
  },
  intensityDots: {
    fontSize: 10,
    letterSpacing: '-0.05em',
    flexShrink: 0,
  },
  cardStat: {
    color: 'rgba(180, 200, 190, 0.65)',
    fontSize: 9,
    letterSpacing: '0.04em',
  },
  cardRow3: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 2,
  },
  casualtyCount: {
    color: '#ff7777',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  activeSince: {
    color: 'rgba(140, 170, 155, 0.6)',
    fontSize: 9,
    letterSpacing: '0.04em',
  },
  flyBtn: {
    background: 'rgba(0, 255, 100, 0.12)',
    border: '1px solid rgba(0, 255, 100, 0.4)',
    borderRadius: 2,
    color: '#00ff88',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '2px 6px',
    transition: 'background 0.12s',
    flexShrink: 0,
  },
  expandedSection: {
    borderTop: '1px solid rgba(0, 255, 100, 0.1)',
    marginTop: 6,
    paddingTop: 6,
  },
  expandedLabel: {
    color: 'rgba(0, 255, 100, 0.5)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  partiesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    marginBottom: 6,
  },
  partyItem: {
    color: '#b0c0cc',
    fontSize: 10,
    paddingLeft: 6,
    borderLeft: '2px solid rgba(0, 255, 100, 0.3)',
    lineHeight: 1.4,
  },
  descSnippet: {
    color: 'rgba(160, 180, 190, 0.75)',
    fontSize: 9,
    lineHeight: 1.5,
    marginTop: 2,
  },
  footer: {
    padding: '6px 8px 8px',
    borderTop: '1px solid rgba(0, 255, 100, 0.1)',
    flexShrink: 0,
  },
  footerText: {
    color: 'rgba(100, 130, 115, 0.45)',
    fontSize: 8,
    letterSpacing: '0.06em',
    textAlign: 'center' as const,
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConflictZone['status'] }) {
  const config: Record<ConflictZone['status'], { label: string; color: string; bg: string; blink?: boolean }> = {
    active:          { label: 'ACTIVE',        color: '#ff5555', bg: 'rgba(255, 60, 60, 0.18)' },
    escalating:      { label: 'ESCALATING',    color: '#ff4444', bg: 'rgba(255, 40, 40, 0.18)', blink: true },
    ceasefire:       { label: 'CEASEFIRE',     color: '#888899', bg: 'rgba(130, 130, 150, 0.15)' },
    'de-escalating': { label: 'DE-ESCAL.',     color: '#ccaa00', bg: 'rgba(200, 170, 0, 0.14)' },
  };
  const c = config[status];
  return (
    <span
      style={{
        ...styles.statusBadge,
        color: c.color,
        background: c.bg,
        animation: c.blink ? 'conflictBlink 1.1s ease-in-out infinite' : 'none',
      }}
    >
      {c.label}
    </span>
  );
}

// ── Blink keyframe injection ──────────────────────────────────────────────────

const BLINK_STYLE_ID = 'conflict-sidebar-blink';
if (typeof document !== 'undefined' && !document.getElementById(BLINK_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = BLINK_STYLE_ID;
  style.textContent = `
    @keyframes conflictBlink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.35; }
    }
  `;
  document.head.appendChild(style);
}

// ── Conflict Card ─────────────────────────────────────────────────────────────

interface ConflictCardProps {
  zone: ConflictZone;
  isSelected: boolean;
  onSelect: () => void;
  onFlyTo: () => void;
}

function ConflictCard({ zone, isSelected, onSelect, onFlyTo }: ConflictCardProps) {
  const [hovered, setHovered] = useState(false);

  const recentEvents = getRecentEventCount(zone.events);
  const duration = getDuration(zone.startDate);
  const flags = getCountryFlags(zone.countries);
  const intensityColor = INTENSITY_COLORS[zone.intensity];
  const dots = INTENSITY_DOTS[zone.intensity];
  const descSnippet = zone.description?.length > 90
    ? zone.description.slice(0, 90).trimEnd() + '…'
    : zone.description;

  let cardStyle: React.CSSProperties = { ...styles.card };
  if (isSelected) {
    cardStyle = { ...cardStyle, ...styles.cardSelected };
  } else if (hovered) {
    cardStyle = { ...cardStyle, ...styles.cardHovered };
  }

  return (
    <div
      style={cardStyle}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left intensity color bar */}
      <div style={{ ...styles.intensityBar, background: intensityColor }} />

      <div style={styles.cardInner}>
        {/* Row 1: flags + name + status badge */}
        <div style={styles.cardRow1}>
          <span style={styles.cardFlags}>{flags}</span>
          <span style={styles.cardName} title={zone.name}>{zone.name}</span>
          <StatusBadge status={zone.status} />
        </div>

        {/* Row 2: intensity dots + events count */}
        <div style={styles.cardRow2}>
          <span style={styles.intensityDots} title={`Intensity: ${zone.intensity}`}>{dots}</span>
          <span style={styles.cardStat}>
            {recentEvents > 0
              ? `${recentEvents} event${recentEvents !== 1 ? 's' : ''} / 7d`
              : 'No recent events'}
          </span>
        </div>

        {/* Row 3: casualties + duration + fly-to (on hover or selected) */}
        <div style={styles.cardRow3}>
          <span style={styles.casualtyCount}>
            ☠ {formatCasualties(zone.casualties.total)}
          </span>
          <span style={styles.activeSince}>{duration}</span>
          {(hovered || isSelected) && (
            <button
              style={styles.flyBtn}
              onClick={(e) => {
                e.stopPropagation();
                onFlyTo();
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,100,0.22)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,100,0.12)';
              }}
              title="Fly to conflict zone"
            >
              ◎ FLY
            </button>
          )}
        </div>

        {/* Expanded detail for selected card */}
        {isSelected && (
          <div style={styles.expandedSection}>
            {zone.parties.length > 0 && (
              <>
                <div style={styles.expandedLabel}>Parties</div>
                <div style={styles.partiesList}>
                  {zone.parties.map((p) => (
                    <div key={`${zone.id}-party-${p}`} style={styles.partyItem}>{p}</div>
                  ))}
                </div>
              </>
            )}
            {descSnippet && (
              <>
                <div style={styles.expandedLabel}>Overview</div>
                <div style={styles.descSnippet}>{descSnippet}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const ConflictSidebar: React.FC<ConflictSidebarProps> = ({
  conflictZones,
  selectedConflictId,
  onSelect,
  onFlyTo,
}) => {
  const [open, setOpen] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('intensity');

  const sorted = useMemo(() => {
    const zones = [...conflictZones];
    if (sortMode === 'intensity') {
      zones.sort((a, b) => INTENSITY_ORDER[b.intensity] - INTENSITY_ORDER[a.intensity]);
    } else if (sortMode === 'casualties') {
      zones.sort((a, b) => (b.casualties.total ?? 0) - (a.casualties.total ?? 0));
    } else {
      zones.sort((a, b) => a.name.localeCompare(b.name));
    }
    return zones;
  }, [conflictZones, sortMode]);

  const sortButtons: { key: SortMode; label: string }[] = [
    { key: 'intensity', label: 'Intensity' },
    { key: 'casualties', label: 'Casualties' },
    { key: 'alpha', label: 'A-Z' },
  ];

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.panel,
          width: open ? PANEL_WIDTH : 0,
        }}
      >
        {open && (
          <>
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerTop}>
                <span style={styles.headerTitle}>⚔ Active Conflicts</span>
                <span style={styles.countBadge}>{conflictZones.length}</span>
              </div>
              <div style={styles.sortRow}>
                {sortButtons.map(({ key, label }) => (
                  <button
                    key={key}
                    style={{
                      ...styles.sortBtn,
                      ...(sortMode === key ? styles.sortBtnActive : {}),
                    }}
                    onClick={() => setSortMode(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict list */}
            <div style={styles.scrollArea}>
              {sorted.map((zone) => {
                const centroid = getConflictCentroid(zone);
                return (
                  <ConflictCard
                    key={zone.id}
                    zone={zone}
                    isSelected={zone.id === selectedConflictId}
                    onSelect={() => onSelect(zone)}
                    onFlyTo={() => {
                      if (centroid) onFlyTo(centroid.lat, centroid.lng);
                    }}
                  />
                );
              })}
              {sorted.length === 0 && (
                <div style={{
                  color: 'rgba(120, 150, 135, 0.5)',
                  fontSize: 10,
                  textAlign: 'center',
                  padding: '24px 12px',
                  letterSpacing: '0.08em',
                }}>
                  NO ACTIVE CONFLICTS
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <div style={styles.footerText}>
                Data: ACLED / OSINT | Updated daily
              </div>
            </div>
          </>
        )}
      </div>

      {/* Collapse / expand toggle on the left edge of the panel */}
      <button
        style={{
          ...styles.collapseBtn,
          right: open ? PANEL_WIDTH : 0,
        }}
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Collapse conflict sidebar' : 'Expand conflict sidebar'}
      >
        {open ? '▶' : '◀'}
      </button>
    </div>
  );
};

export default ConflictSidebar;
