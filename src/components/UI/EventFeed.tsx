import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ConflictZone, ConflictEvent } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EventFeedProps {
  conflictZones: ConflictZone[];
  onFlyTo: (lat: number, lng: number) => void;
  visible: boolean;
  onToggle: () => void;
}

type FilterType = 'ALL' | 'AIRSTRIKES' | 'GROUND' | 'NAVAL' | 'MISSILES' | 'DRONES';

interface FlatEvent extends ConflictEvent {
  zoneName: string;
  zoneColor: string;
  zoneIntensity: ConflictZone['intensity'];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 320;

const EVENT_ICONS: Record<ConflictEvent['type'], string> = {
  airstrike:    '✈️💥',
  'ground-battle': '⚔️',
  artillery:    '💣',
  naval:        '🚢',
  drone:        '🚁',
  missile:      '🚀',
  explosion:    '💥',
  other:        '⚠️',
};

const EVENT_TYPE_LABELS: Record<ConflictEvent['type'], string> = {
  airstrike:       'AIRSTRIKE',
  'ground-battle': 'GROUND BATTLE',
  artillery:       'ARTILLERY',
  naval:           'NAVAL',
  drone:           'DRONE',
  missile:         'MISSILE',
  explosion:       'EXPLOSION',
  other:           'OTHER',
};

const FILTER_MAP: Record<FilterType, ConflictEvent['type'][] | null> = {
  ALL:       null,
  AIRSTRIKES: ['airstrike'],
  GROUND:    ['ground-battle', 'artillery'],
  NAVAL:     ['naval'],
  MISSILES:  ['missile'],
  DRONES:    ['drone'],
};

const FILTERS: FilterType[] = ['ALL', 'AIRSTRIKES', 'GROUND', 'NAVAL', 'MISSILES', 'DRONES'];

// ── Keyframes ──────────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes efFadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes efCriticalBg {
  0%, 100% { background-color: rgba(255, 34, 34, 0.07); }
  50%       { background-color: rgba(255, 34, 34, 0.17); }
}
@keyframes efLoadingDot {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40%           { opacity: 1;   transform: scale(1.1); }
}
`;

function injectKeyframes() {
  const id = 'event-feed-keyframes';
  if (typeof document !== 'undefined' && !document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface EventCardProps {
  event: FlatEvent;
  index: number;
  onFlyTo: (lat: number, lng: number) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, index, onFlyTo }) => {
  const [hovered, setHovered] = useState(false);
  const isCritical = event.zoneIntensity === 'critical';

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    borderLeft: `3px solid ${event.zoneColor}`,
    borderRadius: '4px',
    padding: '8px 10px 8px 11px',
    marginBottom: '5px',
    background: hovered
      ? 'rgba(30, 50, 80, 0.92)'
      : isCritical
      ? undefined
      : 'rgba(10, 20, 38, 0.88)',
    animation: isCritical
      ? `efFadeInUp 0.35s cubic-bezier(0.22,1,0.36,1) ${index * 40}ms both, efCriticalBg 2.2s ease-in-out infinite`
      : `efFadeInUp 0.35s cubic-bezier(0.22,1,0.36,1) ${index * 40}ms both`,
    boxSizing: 'border-box',
    cursor: 'default',
    transition: 'background 0.15s',
    flexShrink: 0,
    minWidth: 0,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row 1: icon + type label + zone badge + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', minWidth: 0 }}>
        <span style={{ fontSize: '13px', lineHeight: 1, flexShrink: 0 }}>
          {EVENT_ICONS[event.type]}
        </span>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#b0c8e8',
          flexShrink: 0,
        }}>
          {EVENT_TYPE_LABELS[event.type]}
        </span>

        {/* Zone badge */}
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: event.zoneColor,
          background: `${event.zoneColor}22`,
          border: `1px solid ${event.zoneColor}55`,
          borderRadius: '3px',
          padding: '1px 5px',
          flexShrink: 0,
        }}>
          {event.zoneName.toUpperCase()}
        </span>

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Date */}
        <span style={{
          fontSize: '9px',
          color: '#6688aa',
          letterSpacing: '0.04em',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {formatEventDate(event.date)}
        </span>
      </div>

      {/* Row 2: description (2-line clamp) */}
      <p style={{
        margin: '4px 0 0',
        fontSize: '11px',
        color: '#ccdaee',
        lineHeight: 1.45,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {event.description}
      </p>

      {/* Row 3: fatalities + source + fly-to */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
        {event.fatalities > 0 && (
          <span style={{
            fontSize: '10px',
            color: '#ff4444',
            fontWeight: 600,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}>
            💀 {event.fatalities.toLocaleString()} reported
          </span>
        )}

        <span style={{
          fontSize: '9px',
          color: '#4a6888',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '3px',
          padding: '1px 5px',
          flexShrink: 0,
        }}>
          {event.source}
        </span>

        <span style={{ flex: 1 }} />

        {/* Fly-to button */}
        <button
          title="Fly to location"
          onClick={() => onFlyTo(event.lat, event.lng)}
          style={{
            background: 'rgba(30, 90, 180, 0.22)',
            border: '1px solid rgba(60, 140, 255, 0.35)',
            borderRadius: '3px',
            color: '#6aabff',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '2px 6px',
            lineHeight: 1,
            flexShrink: 0,
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,90,180,0.45)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(60,140,255,0.7)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,90,180,0.22)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(60,140,255,0.35)';
          }}
        >
          📍
        </button>
      </div>
    </div>
  );
};

// ── Loading Indicator ──────────────────────────────────────────────────────────

const LoadingDots: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    gap: '14px',
  }}>
    <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#3a7fbf',
            animation: `efLoadingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
    <span style={{
      fontSize: '11px',
      color: '#4a7090',
      letterSpacing: '0.08em',
      textAlign: 'center',
    }}>
      Fetching latest conflict data...
    </span>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const EventFeed: React.FC<EventFeedProps> = ({
  conflictZones,
  onFlyTo,
  visible,
  onToggle,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectKeyframes();
  }, []);

  // Flatten + sort all events newest-first
  const allEvents = useMemo<FlatEvent[]>(() => {
    const flat: FlatEvent[] = [];
    for (const zone of conflictZones) {
      for (const ev of zone.events || []) {
        flat.push({
          ...ev,
          zoneName: zone.name,
          zoneColor: zone.color,
          zoneIntensity: zone.intensity,
        });
      }
    }
    flat.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return flat;
  }, [conflictZones]);

  const filteredEvents = useMemo<FlatEvent[]>(() => {
    const types = FILTER_MAP[activeFilter];
    if (!types) return allEvents;
    return allEvents.filter(e => types.includes(e.type));
  }, [allEvents, activeFilter]);

  // Per-zone event counts
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const zone of conflictZones) {
      counts[zone.name] = zone.events.length;
    }
    return counts;
  }, [conflictZones]);

  const zoneCountStr = useMemo(() => {
    return Object.entries(zoneCounts)
      .filter(([, n]) => n > 0)
      .map(([name, n]) => `${name}: ${n}`)
      .join(' | ');
  }, [zoneCounts]);

  const totalEvents = allEvents.length;

  // Panel container
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '60px',
    right: '16px',
    width: `${PANEL_WIDTH}px`,
    maxHeight: 'calc(100vh - 80px)',
    background: 'rgba(6, 14, 28, 0.96)',
    border: '1px solid rgba(40, 80, 140, 0.5)',
    borderRadius: '6px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
    display: visible ? 'flex' : 'none',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1200,
    fontFamily: "'Courier New', Courier, monospace",
    boxSizing: 'border-box',
  };

  return (
    <div style={panelStyle}>
      {/* ── Header ── */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid rgba(40, 80, 140, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: '#88bbdd',
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          📰 CONFLICT EVENT FEED
        </span>

        {/* Event count badge */}
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#ffffff',
          background: totalEvents > 0 ? 'rgba(200, 40, 40, 0.6)' : 'rgba(50, 80, 110, 0.6)',
          border: `1px solid ${totalEvents > 0 ? 'rgba(255,80,80,0.5)' : 'rgba(70,120,160,0.4)'}`,
          borderRadius: '10px',
          padding: '1px 7px',
          flexShrink: 0,
        }}>
          {totalEvents}
        </span>

        {/* Close toggle */}
        <button
          onClick={onToggle}
          title="Hide event feed"
          style={{
            background: 'none',
            border: 'none',
            color: '#446688',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: 1,
            padding: '0 0 0 4px',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Zone count summary ── */}
      {zoneCountStr.length > 0 && (
        <div style={{
          padding: '5px 12px',
          borderBottom: '1px solid rgba(30, 60, 100, 0.3)',
          fontSize: '9px',
          color: '#4a6888',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
        }}>
          {zoneCountStr}
        </div>
      )}

      {/* ── Filter buttons ── */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '7px 10px',
        borderBottom: '1px solid rgba(30, 60, 100, 0.3)',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                padding: '3px 7px',
                borderRadius: '3px',
                cursor: 'pointer',
                border: isActive
                  ? '1px solid rgba(80, 160, 255, 0.7)'
                  : '1px solid rgba(40, 80, 120, 0.4)',
                background: isActive
                  ? 'rgba(30, 90, 200, 0.35)'
                  : 'rgba(10, 24, 44, 0.5)',
                color: isActive ? '#aad4ff' : '#5580a0',
                transition: 'all 0.12s',
                fontFamily: 'inherit',
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* ── Scrollable event list ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px 10px',
          boxSizing: 'border-box',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(40, 90, 160, 0.4) transparent',
        }}
      >
        {allEvents.length === 0 ? (
          <LoadingDots />
        ) : filteredEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
          }}>
            <span style={{
              fontSize: '11px',
              color: '#4a7090',
              letterSpacing: '0.08em',
              textAlign: 'center',
            }}>
              No matching events
            </span>
          </div>
        ) : (
          filteredEvents.map((ev, i) => (
            <EventCard
              key={ev.id}
              event={ev}
              index={i}
              onFlyTo={onFlyTo}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default EventFeed;
