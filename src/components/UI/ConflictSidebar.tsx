import React, { useState, useMemo } from 'react';
import { ConflictZone } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConflictSidebarProps {
  conflictZones: ConflictZone[];
  selectedConflictId: string | null;
  onSelect: (zone: ConflictZone) => void;
  onFlyTo: (lat: number, lng: number) => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

type SortMode = 'deaths' | 'intensity' | 'alpha';

// ── Constants ─────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 290;

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

function formatCasualtiesPlus(n: number | undefined): string {
  if (n === undefined || n === null) return 'N/A';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${Math.floor(n / 1_000).toLocaleString()}K+`;
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

function getDaysSinceStart(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function getRecentEventCount(events: ConflictZone['events']): number {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return events.filter((e) => new Date(e.date) >= cutoff).length;
}

/** Group events into weekly buckets (most recent 8 weeks) and return counts + trend direction. */
function getWeeklyBuckets(events: ConflictZone['events']): { counts: number[]; trend: 'rising' | 'falling' | 'stable' } {
  const NUM_WEEKS = 8;
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - NUM_WEEKS * msPerWeek);

  const filtered = events
    .filter((e) => new Date(e.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const counts = new Array(NUM_WEEKS).fill(0);
  for (const ev of filtered) {
    const weeksAgo = Math.floor((now.getTime() - new Date(ev.date).getTime()) / msPerWeek);
    const bucketIdx = NUM_WEEKS - 1 - Math.min(weeksAgo, NUM_WEEKS - 1);
    counts[bucketIdx]++;
  }

  const half = Math.floor(NUM_WEEKS / 2);
  const firstHalfAvg = counts.slice(0, half).reduce((s, v) => s + v, 0) / half;
  const secondHalfAvg = counts.slice(half).reduce((s, v) => s + v, 0) / (NUM_WEEKS - half);
  const diff = secondHalfAvg - firstHalfAvg;
  const threshold = 0.5;
  const trend: 'rising' | 'falling' | 'stable' =
    diff > threshold ? 'rising' : diff < -threshold ? 'falling' : 'stable';

  return { counts, trend };
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

/** Compute intensity trend indicator based on event frequency */
function getTrendIndicator(trend: 'rising' | 'falling' | 'stable'): { symbol: string; color: string; label: string } {
  switch (trend) {
    case 'rising':
      return { symbol: '\u25B2', color: '#ff4444', label: 'Escalating' };
    case 'falling':
      return { symbol: '\u25BC', color: '#00ff88', label: 'De-escalating' };
    case 'stable':
      return { symbol: '\u2500', color: '#ffcc00', label: 'Stable' };
  }
}

// ── Source Indicator ──────────────────────────────────────────────────────────

function SourceIndicator({ tooltip }: { tooltip: string }) {
  const [showTip, setShowTip] = React.useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 2 }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <span
        style={{
          color: 'rgba(0, 255, 136, 0.4)',
          fontSize: 10,
          cursor: 'help',
          lineHeight: 1,
          userSelect: 'none',
        }}
        title={tooltip}
      >
        {'\u24D8'}
      </span>
      {showTip && (
        <span
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(5, 15, 30, 0.95)',
            border: '1px solid rgba(0, 255, 136, 0.4)',
            borderRadius: 3,
            padding: '4px 8px',
            whiteSpace: 'nowrap',
            fontSize: 9,
            color: '#b0c0cc',
            fontWeight: 600,
            letterSpacing: '0.04em',
            zIndex: 10,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            marginTop: 4,
          }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    right: 0,
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
    padding: '10px 10px 8px',
    borderBottom: '1px solid rgba(0, 255, 100, 0.15)',
    flexShrink: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
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
    marginBottom: 2,
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

// ── Sparkline ─────────────────────────────────────────────────────────────────

const TREND_COLORS: Record<'rising' | 'falling' | 'stable', string> = {
  rising: '#ff4444',
  falling: '#00ff88',
  stable: '#ffcc00',
};

function Sparkline({ counts, trend }: { counts: number[]; trend: 'rising' | 'falling' | 'stable' }) {
  const W = 52;
  const H = 14;
  const PAD_Y = 2;
  const maxVal = Math.max(...counts, 1);
  const stepX = W / (counts.length - 1 || 1);

  const points = counts
    .map((v, i) => {
      const x = i * stepX;
      const y = PAD_Y + (H - 2 * PAD_Y) * (1 - v / maxVal);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const color = TREND_COLORS[trend];

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ flexShrink: 0, display: 'block' }}
      aria-label={`Event frequency trend: ${trend}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

// ── Casualty Bar Chart ────────────────────────────────────────────────────────

function CasualtyBar({ military, civilian, total, militarySource, civilianSource }: { military?: number; civilian?: number; total?: number; militarySource?: string; civilianSource?: string }) {
  const mil = military ?? 0;
  const civ = civilian ?? 0;
  const denominator = total || (mil + civ) || 1;
  const milPct = Math.min(100, (mil / denominator) * 100);
  const civPct = Math.min(100 - milPct, (civ / denominator) * 100);

  // If we have no military/civilian breakdown, show full bar as unknown
  if (!military && !civilian) {
    return (
      <div style={{ width: '100%', marginTop: 3, marginBottom: 1 }}>
        <div style={{
          height: 5,
          borderRadius: 2,
          background: 'rgba(255, 60, 60, 0.35)',
          width: '100%',
        }} />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 1 }}>
          <span style={{ color: 'rgba(180, 160, 160, 0.5)', fontSize: 8 }}>breakdown unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', marginTop: 3, marginBottom: 1 }}>
      <div style={{
        display: 'flex',
        height: 5,
        borderRadius: 2,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.05)',
      }}>
        {milPct > 0 && (
          <div
            style={{
              width: `${milPct}%`,
              background: '#cc3333',
              transition: 'width 0.3s ease',
            }}
            title={`Military: ${formatCasualties(military)}`}
          />
        )}
        {civPct > 0 && (
          <div
            style={{
              width: `${civPct}%`,
              background: '#777788',
              transition: 'width 0.3s ease',
            }}
            title={`Civilian: ${formatCasualties(civilian)}`}
          />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 1 }}>
        <span style={{ color: '#cc5555', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          MIL {formatCasualties(military)}
          <SourceIndicator tooltip={`Source: ${militarySource ?? 'ACLED / OSINT'}`} />
        </span>
        <span style={{ color: '#888899', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          CIV {formatCasualties(civilian)}
          <SourceIndicator tooltip={`Source: ${civilianSource ?? 'ACLED / OSINT'}`} />
        </span>
      </div>
    </div>
  );
}

// ── Global Toll Banner ────────────────────────────────────────────────────────

function GlobalTollBanner({ zones }: { zones: ConflictZone[] }) {
  const totalKilled = zones.reduce((sum, z) => sum + (z.casualties.total ?? 0), 0);
  const totalDisplaced = zones.reduce((sum, z) => sum + (z.casualties.displaced ?? 0), 0);

  return (
    <div style={{
      margin: '6px 8px 2px',
      padding: '8px 10px',
      background: 'rgba(255, 20, 20, 0.08)',
      border: '1px solid rgba(255, 50, 50, 0.35)',
      borderRadius: 3,
    }}>
      <div style={{
        color: 'rgba(255, 80, 80, 0.6)',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        marginBottom: 4,
      }}>
        GLOBAL TOLL
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          color: '#ff3333',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {formatCasualtiesPlus(totalKilled)}
        </span>
        <span style={{
          color: 'rgba(255, 100, 100, 0.7)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          KILLED
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.15)',
          fontSize: 12,
        }}>|</span>
        <span style={{
          color: '#cc8844',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {formatCasualtiesPlus(totalDisplaced)}
        </span>
        <span style={{
          color: 'rgba(200, 140, 60, 0.7)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          DISPLACED
        </span>
      </div>
    </div>
  );
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
  const { counts: weeklyCounts, trend } = useMemo(() => getWeeklyBuckets(zone.events), [zone.events]);
  const duration = getDuration(zone.startDate);
  const flags = getCountryFlags(zone.countries);
  const intensityColor = INTENSITY_COLORS[zone.intensity];
  const dots = INTENSITY_DOTS[zone.intensity];
  const descSnippet = zone.description?.length > 90
    ? zone.description.slice(0, 90).trimEnd() + '\u2026'
    : zone.description;

  const daysSinceStart = getDaysSinceStart(zone.startDate);
  const deathsPerDay = zone.casualties.total
    ? Math.round(zone.casualties.total / daysSinceStart)
    : null;

  const trendIndicator = getTrendIndicator(trend);

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
        {/* Row 1: flags + name + trend indicator + status badge */}
        <div style={styles.cardRow1}>
          <span style={styles.cardFlags}>{flags}</span>
          <span style={styles.cardName} title={zone.name}>{zone.name}</span>
          <span
            title={trendIndicator.label}
            style={{
              color: trendIndicator.color,
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            {trendIndicator.symbol}
          </span>
          <StatusBadge status={zone.status} />
        </div>

        {/* PROMINENT DEATH COUNT */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          marginTop: 3,
          marginBottom: 2,
        }}>
          <span style={{
            color: '#ff2222',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            textShadow: '0 0 12px rgba(255, 30, 30, 0.3)',
          }}>
            {formatCasualtiesPlus(zone.casualties.total)}
          </span>
          <span style={{
            color: 'rgba(255, 80, 80, 0.6)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}>
            KILLED
          </span>
          <SourceIndicator tooltip={`Source: ${zone.casualtySources?.total ?? 'ACLED / OSINT'}`} />
          {deathsPerDay !== null && (
            <span style={{
              color: 'rgba(255, 100, 100, 0.45)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginLeft: 'auto',
            }}>
              ~{deathsPerDay.toLocaleString()}/day
            </span>
          )}
        </div>

        {/* Military / Civilian breakdown bar */}
        <CasualtyBar
          military={zone.casualties.military}
          civilian={zone.casualties.civilian}
          total={zone.casualties.total}
          militarySource={zone.casualtySources?.military}
          civilianSource={zone.casualtySources?.civilian}
        />

        {/* Displaced count */}
        {zone.casualties.displaced != null && zone.casualties.displaced > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 3,
            marginBottom: 2,
          }}>
            <span style={{ fontSize: 10, lineHeight: 1 }} title="Displaced persons">
              {'\uD83D\uDC65'}
            </span>
            <span style={{
              color: '#cc8844',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}>
              {formatCasualtiesPlus(zone.casualties.displaced)}
            </span>
            <span style={{
              color: 'rgba(200, 140, 60, 0.5)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}>
              DISPLACED
            </span>
            <SourceIndicator tooltip={`Source: ${zone.casualtySources?.displaced ?? 'UNHCR / IDMC'}`} />
          </div>
        )}

        {/* Row 2: intensity dots + sparkline + events count */}
        <div style={{ ...styles.cardRow2, marginTop: 4 }}>
          <span style={styles.intensityDots} title={`Intensity: ${zone.intensity}`}>{dots}</span>
          <span title={`Trend: ${trend} (8-week event frequency)`} style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <Sparkline counts={weeklyCounts} trend={trend} />
          </span>
          <span style={styles.cardStat}>
            {recentEvents > 0
              ? `${recentEvents} evt/7d`
              : 'No recent'}
          </span>
        </div>

        {/* Row 3: duration + fly-to */}
        <div style={styles.cardRow3}>
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
              {'\u25CE'} FLY
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
  isMobile,
  mobileOpen,
  onMobileClose,
}) => {
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('deaths');

  const sorted = useMemo(() => {
    const zones = [...conflictZones];
    if (sortMode === 'deaths') {
      zones.sort((a, b) => (b.casualties.total ?? 0) - (a.casualties.total ?? 0));
    } else if (sortMode === 'intensity') {
      zones.sort((a, b) => INTENSITY_ORDER[b.intensity] - INTENSITY_ORDER[a.intensity]);
    } else {
      zones.sort((a, b) => a.name.localeCompare(b.name));
    }
    return zones;
  }, [conflictZones, sortMode]);

  const sortButtons: { key: SortMode; label: string }[] = [
    { key: 'deaths', label: 'Deaths' },
    { key: 'intensity', label: 'Intensity' },
    { key: 'alpha', label: 'A-Z' },
  ];

  // Mobile: slide-up bottom sheet
  if (isMobile) {
    if (!mobileOpen) return null;
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1499,
          }}
        />
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60vh',
            zIndex: 1500,
            background: 'rgba(8, 12, 20, 0.98)',
            borderTop: '2px solid rgba(0, 255, 100, 0.4)',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          {/* Drag handle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0 4px',
            flexShrink: 0,
          }}>
            <div style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.25)',
            }} />
          </div>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 12px 8px',
            borderBottom: '1px solid rgba(0, 255, 100, 0.15)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.headerTitle}>{'\u2694'} Active Conflicts</span>
              <span style={styles.countBadge}>{conflictZones.length}</span>
            </div>
            <button
              onClick={onMobileClose}
              style={{
                width: 44,
                height: 44,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(0, 255, 100, 0.3)',
                borderRadius: 6,
                color: '#00ff88',
                fontSize: 20,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
          {/* Sort row */}
          <div style={{ ...styles.sortRow, padding: '6px 12px' }}>
            {sortButtons.map(({ key, label }) => (
              <button
                key={key}
                style={{
                  ...styles.sortBtn,
                  ...(sortMode === key ? styles.sortBtnActive : {}),
                  minHeight: 44,
                }}
                onClick={() => setSortMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Conflict list */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
            <GlobalTollBanner zones={conflictZones} />
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
                    onMobileClose?.();
                  }}
                />
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // Collapsed tab strip
  if (!open) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '50%',
          right: 0,
          transform: 'translateY(-50%)',
          zIndex: 999,
          fontFamily: "'Courier New', Courier, monospace",
          pointerEvents: 'all',
        }}
      >
        <button
          onClick={() => setOpen(true)}
          title="Expand conflict sidebar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            padding: '12px 6px',
            background: 'rgba(8, 12, 20, 0.97)',
            border: '1px solid rgba(0, 255, 100, 0.28)',
            borderRight: '1px solid rgba(0, 255, 100, 0.28)',
            borderRadius: '6px 0 0 6px',
            cursor: 'pointer',
            boxShadow: '-3px 0 14px rgba(0,0,0,0.5)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 100, 0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8, 12, 20, 0.97)';
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>{'\u2694\uFE0F'}</span>
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              color: '#ff6666',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {conflictZones.length} conflicts
          </span>
          <span
            style={{
              color: 'rgba(0, 255, 100, 0.8)',
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            {'\u25C0'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.panel,
          width: PANEL_WIDTH,
        }}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <span style={styles.headerTitle}>{'\u2694'} Active Conflicts</span>
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

        {/* Global toll banner */}
        <GlobalTollBanner zones={conflictZones} />

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
      </div>

      {/* Collapse toggle on the left edge of the expanded panel */}
      <button
        style={{
          ...styles.collapseBtn,
          right: PANEL_WIDTH,
        }}
        onClick={() => setOpen(false)}
        title="Collapse conflict sidebar"
      >
        {'\u25B6'}
      </button>
    </div>
  );
};

export default ConflictSidebar;
