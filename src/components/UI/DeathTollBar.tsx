import React, { useMemo, useRef, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConflictZone {
  id: string;
  name: string;
  countries: string[];
  casualties: { total?: number; military?: number; civilian?: number; displaced?: number };
  geoJSON: { type: 'Feature'; geometry: { type: string; coordinates: unknown }; properties?: Record<string, unknown> };
}

interface DeathTollBarProps {
  conflictZones: ConflictZone[];
  onFlyTo: (lat: number, lng: number, altitude?: number) => void;
  onOpenSources?: () => void;
}

// ── Country code → flag emoji map ─────────────────────────────────────────────

const FLAG_MAP: Record<string, string> = {
  UA: '\u{1F1FA}\u{1F1E6}', RU: '\u{1F1F7}\u{1F1FA}',
  IL: '\u{1F1EE}\u{1F1F1}', PS: '\u{1F1F5}\u{1F1F8}',
  SD: '\u{1F1F8}\u{1F1E9}', MM: '\u{1F1F2}\u{1F1F2}',
  YE: '\u{1F1FE}\u{1F1EA}', CD: '\u{1F1E8}\u{1F1E9}',
  RW: '\u{1F1F7}\u{1F1FC}', ML: '\u{1F1F2}\u{1F1F1}',
  BF: '\u{1F1E7}\u{1F1EB}', NE: '\u{1F1F3}\u{1F1EA}',
  SO: '\u{1F1F8}\u{1F1F4}', HT: '\u{1F1ED}\u{1F1F9}',
  LB: '\u{1F1F1}\u{1F1E7}', ET: '\u{1F1EA}\u{1F1F9}',
  PK: '\u{1F1F5}\u{1F1F0}', SY: '\u{1F1F8}\u{1F1FE}',
  IQ: '\u{1F1EE}\u{1F1F6}', AF: '\u{1F1E6}\u{1F1EB}',
  NG: '\u{1F1F3}\u{1F1EC}', MZ: '\u{1F1F2}\u{1F1FF}',
  CM: '\u{1F1E8}\u{1F1F2}', TD: '\u{1F1F9}\u{1F1E9}',
};

function countryFlags(codes: string[]): string {
  return codes.map(c => FLAG_MAP[c] || codeToFlag(c)).join('');
}

function codeToFlag(code: string): string {
  if (code.length !== 2) return code;
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatDeaths(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

// ── Centroid helper ───────────────────────────────────────────────────────────

function getCentroid(zone: ConflictZone): { lat: number; lng: number } | null {
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
  } catch { /* ignore */ }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeathTollBar({ conflictZones, onFlyTo, onOpenSources }: DeathTollBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Sort by death count descending, compute total
  const { sorted, grandTotal } = useMemo(() => {
    const withDeaths = conflictZones
      .filter(z => (z.casualties?.total ?? 0) > 0)
      .sort((a, b) => (b.casualties.total ?? 0) - (a.casualties.total ?? 0));
    const total = withDeaths.reduce((s, z) => s + (z.casualties.total ?? 0), 0);
    return { sorted: withDeaths, grandTotal: total };
  }, [conflictZones]);

  // Auto-scroll the per-conflict strip
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isPaused) return;
    let raf: number;
    let pos = 0;
    const speed = 0.4; // px per frame

    function tick() {
      pos += speed;
      if (pos >= el!.scrollWidth / 2) pos = 0;
      el!.scrollLeft = pos;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPaused, sorted]);

  if (sorted.length === 0) return null;

  const handleClick = (zone: ConflictZone) => {
    const c = getCentroid(zone);
    if (c) onFlyTo(c.lat, c.lng, 1.5);
  };

  // Build the scrolling conflict items (duplicated for seamless loop)
  const conflictItems = sorted.map(zone => (
    <span
      key={zone.id}
      onClick={() => handleClick(zone)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 8px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.15s',
        borderRight: '1px solid rgba(255,68,68,0.15)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      title={`${zone.name} — ${(zone.casualties.total ?? 0).toLocaleString()} deaths (click to fly)`}
    >
      <span style={{ fontSize: 10 }}>{countryFlags(zone.countries)}</span>
      <span style={{ color: '#ff4444', fontWeight: 700, fontSize: 10, fontFamily: "'Courier New', monospace" }}>
        {formatDeaths(zone.casualties.total ?? 0)}
      </span>
    </span>
  ));

  return (
    <>
      {/* Pulse keyframes */}
      <style>{`
        @keyframes deathPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 24,
          zIndex: 1100,
          background: 'rgba(10,0,0,0.55)',
          borderBottom: '1px solid rgba(255,40,40,0.25)',
          display: 'flex',
          alignItems: 'center',
          fontFamily: "'Courier New', monospace",
          backdropFilter: 'blur(4px)',
          userSelect: 'none',
        }}
      >
        {/* Grand total — fixed left, padded for FilterPanel */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 8px 0 52px',
            borderRight: '1px solid rgba(255,68,68,0.3)',
            flexShrink: 0,
            height: '100%',
          }}
        >
          <span style={{ color: '#888', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
            DEATHS:
          </span>
          <span
            style={{
              color: '#ff4444',
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: 0.5,
              animation: 'deathPulse 2.5s ease-in-out infinite',
            }}
          >
            {formatDeaths(grandTotal)}+
          </span>
        </div>

        {/* Separator */}
        <span style={{ color: 'rgba(255,68,68,0.3)', padding: '0 4px', flexShrink: 0, fontSize: 9 }}>|</span>

        {/* Scrolling per-conflict strip */}
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Original + duplicate for seamless loop */}
          {conflictItems}
          {conflictItems.map((item, i) => React.cloneElement(item, { key: `dup-${sorted[i].id}` }))}
        </div>

        {/* Sources link */}
        {onOpenSources && (
          <span
            onClick={onOpenSources}
            style={{
              color: 'rgba(0, 255, 136, 0.5)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: '0 8px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              borderLeft: '1px solid rgba(255,68,68,0.15)',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00ff88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0, 255, 136, 0.5)'; }}
            title="View data sources (U)"
          >
            SOURCES
          </span>
        )}
      </div>
    </>
  );
}
