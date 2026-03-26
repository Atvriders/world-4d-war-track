import React, { useMemo, useRef } from 'react';
import { ConflictZone, Alert } from '../../types';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ConflictTickerProps {
  conflictZones: ConflictZone[];
  alerts: Alert[];
  onEventClick: (lat: number, lng: number) => void;
}

interface TickerItem {
  id: string;
  label: string;
  labelColor: string;
  text: string;
  textColor: string;
  isCritical: boolean;
  lat?: number;
  lng?: number;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const SCROLL_PX_PER_SEC = 60;

// Approximate width per character in the monospace font at 12px
const CHAR_WIDTH_PX = 7.5;

// Alert type → label + color mappings
const ALERT_LABEL_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  'gps-jam':           { label: 'GPS JAM',  emoji: '📡', color: '#ffd700' },
  'military-aircraft': { label: 'MILITARY', emoji: '✈️', color: '#ff3b3b' },
  'warship':           { label: 'WARSHIP',  emoji: '🚢', color: '#ff8c00' },
  'conflict-event':    { label: 'CONFLICT', emoji: '⚔️', color: '#ff3b3b' },
  'satellite-pass':    { label: 'SAT',      emoji: '🛰️', color: '#00ff88' },
  'system':            { label: 'SYS',      emoji: '🔷', color: '#38bdf8' },
};

const SEVERITY_TEXT_COLOR: Record<string, string> = {
  critical: '#ff3b3b',
  warning:  '#ffd700',
  info:     '#94a3b8',
};

const CONFLICT_TYPE_LABEL: Record<string, { emoji: string; label: string }> = {
  airstrike:     { emoji: '💥', label: 'AIRSTRIKE' },
  artillery:     { emoji: '💣', label: 'ARTILLERY' },
  'ground-battle': { emoji: '⚔️', label: 'GROUND'  },
  naval:         { emoji: '🚢', label: 'NAVAL'     },
  drone:         { emoji: '🛸', label: 'DRONE'     },
  missile:       { emoji: '🚀', label: 'MISSILE'   },
  explosion:     { emoji: '💥', label: 'EXPLOSION' },
  other:         { emoji: '⚔️', label: 'INCIDENT'  },
};

/* ── Injected CSS ────────────────────────────────────────────────────────── */

const TICKER_CSS = `
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes ticker-pulse-red {
    0%, 100% { color: #ff3b3b; opacity: 1; }
    50%       { color: #ff6b6b; opacity: 0.65; }
  }
  .ticker-item-critical {
    animation: ticker-pulse-red 1.1s ease-in-out infinite;
  }
  .ticker-item-clickable:hover {
    text-decoration: underline;
    cursor: pointer;
    filter: brightness(1.25);
  }
`;

/* ── Build ticker items ─────────────────────────────────────────────────── */

function buildTickerItems(
  conflictZones: ConflictZone[],
  alerts: Alert[],
): TickerItem[] {
  const items: TickerItem[] = [];

  // Conflict events — pull up to 5 most recent from each zone
  for (const zone of conflictZones) {
    if (!zone.events || zone.events.length === 0) continue;

    const sorted = [...zone.events].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    for (const ev of sorted.slice(0, 5)) {
      const typeInfo = CONFLICT_TYPE_LABEL[ev.type] ?? CONFLICT_TYPE_LABEL.other;
      const fatalStr =
        ev.fatalities > 0
          ? ` — ${ev.fatalities} ${ev.fatalities === 1 ? 'casualty' : 'casualties'}`
          : '';

      items.push({
        id: `ev-${ev.id}`,
        label: zone.name.toUpperCase(),
        labelColor: zone.color ?? '#ff3b3b',
        text: `${typeInfo.emoji} ${ev.description}${fatalStr}`,
        textColor: '#fca5a5',
        isCritical: zone.intensity === 'critical',
        lat: ev.lat,
        lng: ev.lng,
      });
    }
  }

  // Alerts — only warning + critical, skip dismissed
  for (const alert of alerts) {
    if (alert.dismissed) continue;
    if (alert.severity === 'info') continue;

    const mapping = ALERT_LABEL_MAP[alert.type] ?? ALERT_LABEL_MAP.system;

    items.push({
      id: `alert-${alert.id}`,
      label: mapping.label,
      labelColor: mapping.color,
      text: `${mapping.emoji} ${alert.message}`,
      textColor: SEVERITY_TEXT_COLOR[alert.severity] ?? '#94a3b8',
      isCritical: alert.severity === 'critical',
      lat: alert.lat,
      lng: alert.lng,
    });
  }

  // Fallback so the bar is never empty
  if (items.length === 0) {
    items.push({
      id: 'idle',
      label: 'STATUS',
      labelColor: '#38bdf8',
      text: '🔷 No active alerts — monitoring all sectors',
      textColor: '#94a3b8',
      isCritical: false,
    });
  }

  return items;
}

/* ── Estimate total pixel width of one pass of items ──────────────────── */

function estimateItemsWidth(items: TickerItem[]): number {
  // Each item: "[LABEL] text ◆ "
  let total = 0;
  for (const item of items) {
    const text = `[${item.label}] ${item.text}  ◆  `;
    total += text.length * CHAR_WIDTH_PX;
  }
  return Math.max(total, 800);
}

/* ── Component ──────────────────────────────────────────────────────────── */

const ConflictTicker: React.FC<ConflictTickerProps> = ({
  conflictZones,
  alerts,
  onEventClick,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => buildTickerItems(conflictZones, alerts),
    [conflictZones, alerts],
  );

  // Duplicate 3× so the loop appears seamless (we animate -50% = one copy)
  const tripled = useMemo(() => [...items, ...items, ...items], [items]);

  const onePassWidth = useMemo(() => estimateItemsWidth(items), [items]);
  const durationSec = onePassWidth / SCROLL_PX_PER_SEC;

  /* ── Pause on hover ── */
  const handleMouseEnter = () => {
    if (trackRef.current) {
      trackRef.current.style.animationPlayState = 'paused';
    }
  };
  const handleMouseLeave = () => {
    if (trackRef.current) {
      trackRef.current.style.animationPlayState = 'running';
    }
  };

  /* ── Styles ── */
  const outerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 82,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 999,
    background: 'rgba(2, 8, 20, 0.96)',
    borderTop: '1px solid rgba(255, 59, 59, 0.25)',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    fontFamily: '"Courier New", Courier, monospace',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  const headerStyle: React.CSSProperties = {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 10px 0 52px',
    height: '100%',
    background: 'rgba(2, 8, 20, 0.98)',
    borderRight: '1px solid rgba(0, 255, 136, 0.3)',
    zIndex: 1,
  };

  const liveIntelStyle: React.CSSProperties = {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    whiteSpace: 'nowrap',
  };

  const liveDotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#ff3b3b',
    flexShrink: 0,
    animation: 'ticker-pulse-red 1.1s ease-in-out infinite',
  };

  const viewportStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  };

  // Left fade edge
  const fadeLeftStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
    background: 'linear-gradient(to right, rgba(2,8,20,0.95) 0%, transparent 100%)',
    zIndex: 2,
    pointerEvents: 'none',
  };

  // Right fade edge
  const fadeRightStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    background: 'linear-gradient(to left, rgba(2,8,20,0.95) 0%, transparent 100%)',
    zIndex: 2,
    pointerEvents: 'none',
  };

  const trackStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    willChange: 'transform',
    animation: `ticker-scroll ${durationSec.toFixed(1)}s linear infinite`,
  };

  const separatorStyle: React.CSSProperties = {
    color: '#374151',
    fontSize: 11,
    margin: '0 8px',
    flexShrink: 0,
  };

  return (
    <div style={outerStyle}>
      <style>{TICKER_CSS}</style>

      {/* Fixed "LIVE INTEL" header badge */}
      <div style={headerStyle}>
        <div style={liveDotStyle} />
        <span style={liveIntelStyle}>LIVE INTEL</span>
      </div>

      {/* Scrolling viewport */}
      <div
        style={viewportStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={fadeLeftStyle} />
        <div style={fadeRightStyle} />

        <div ref={trackRef} style={trackStyle}>
          {tripled.map((item, idx) => (
            <TickerItemNode
              key={`${Math.floor(idx / items.length)}-${item.id}-${idx % items.length}`}
              item={item}
              onEventClick={onEventClick}
              separatorStyle={separatorStyle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Single ticker item ─────────────────────────────────────────────────── */

interface TickerItemNodeProps {
  item: TickerItem;
  onEventClick: (lat: number, lng: number) => void;
  separatorStyle: React.CSSProperties;
}

const TickerItemNode: React.FC<TickerItemNodeProps> = ({
  item,
  onEventClick,
  separatorStyle,
}) => {
  const isClickable = item.lat !== undefined && item.lng !== undefined;

  const handleClick = () => {
    if (isClickable) {
      onEventClick(item.lat!, item.lng!);
    }
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    lineHeight: 1,
    cursor: isClickable ? 'pointer' : 'default',
  };

  const labelStyle: React.CSSProperties = {
    color: item.labelColor,
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: '0.06em',
    background: `${item.labelColor}1a`,
    border: `1px solid ${item.labelColor}55`,
    borderRadius: 3,
    padding: '1px 4px',
    flexShrink: 0,
  };

  const textStyle: React.CSSProperties = {
    color: item.isCritical ? undefined : item.textColor,
    fontSize: 11,
    letterSpacing: '0.02em',
  };

  return (
    <>
      <span
        style={wrapperStyle}
        onClick={handleClick}
        className={isClickable ? 'ticker-item-clickable' : undefined}
        title={isClickable ? 'Click to fly to location' : undefined}
      >
        <span style={labelStyle}>[{item.label}]</span>
        <span
          style={textStyle}
          className={item.isCritical ? 'ticker-item-critical' : undefined}
        >
          {item.text}
        </span>
      </span>
      <span style={separatorStyle} aria-hidden="true">◆</span>
    </>
  );
};

export default ConflictTicker;
