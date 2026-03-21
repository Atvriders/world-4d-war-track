import React from 'react';

interface StatsOverlayProps {
  aircraft: Array<{ isMilitary: boolean; altitude: number; country: string; onGround: boolean }>;
  ships: Array<{ type: string; speed: number }>;
  satellites: Array<{ category: string; alt: number }>;
  conflictZones: Array<{ intensity: string; casualties: { total?: number } }>;
  gpsJamCells: Array<{ level: number }>;
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function formatAlt(ft: number): string {
  return Math.round(ft).toLocaleString();
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  DE: '🇩🇪',
  GB: '🇬🇧',
  FR: '🇫🇷',
  RU: '🇷🇺',
  CN: '🇨🇳',
  TR: '🇹🇷',
  IN: '🇮🇳',
  AU: '🇦🇺',
  CA: '🇨🇦',
};

function getTopCountries(
  aircraft: StatsOverlayProps['aircraft'],
  topN = 3,
): Array<{ code: string; flag: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const a of aircraft) {
    if (!a.onGround) {
      counts[a.country] = (counts[a.country] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((x, y) => y[1] - x[1])
    .slice(0, topN)
    .map(([code, count]) => ({
      code,
      flag: COUNTRY_FLAGS[code] ?? '🏳️',
      count,
    }));
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

const SectionDivider: React.FC = () => (
  <div
    style={{
      height: 1,
      background: 'rgba(0, 255, 136, 0.12)',
      margin: '5px 0',
    }}
  />
);

interface StatRowProps {
  label: string;
  value: React.ReactNode;
}

const StatRow: React.FC<StatRowProps> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 6,
      lineHeight: 1.55,
    }}
  >
    <span
      style={{
        color: '#4a6a7a',
        fontSize: 9,
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: '#e0f8f0',
        fontSize: 10,
        fontWeight: 700,
        textAlign: 'right',
        letterSpacing: '0.04em',
      }}
    >
      {value}
    </span>
  </div>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div>
    <div
      style={{
        color: '#00ff88',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.14em',
        marginBottom: 3,
        opacity: 0.85,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

/* ── Main component ──────────────────────────────────────────────────────── */

const StatsOverlay: React.FC<StatsOverlayProps> = ({
  aircraft,
  ships,
  satellites,
  conflictZones,
  gpsJamCells,
}) => {
  // Aircraft calculations
  const airborne = aircraft.filter(a => !a.onGround);
  const militaryAc = aircraft.filter(a => a.isMilitary);
  const avgAlt =
    airborne.length
      ? airborne.reduce((s, a) => s + a.altitude, 0) / airborne.length
      : 0;
  const topCountries = getTopCountries(aircraft);

  // Maritime calculations
  const warships = ships.filter(s =>
    ['warship', 'military', 'destroyer', 'frigate', 'carrier', 'cruiser', 'submarine']
      .includes(s.type?.toLowerCase?.() ?? ''),
  );
  const tankers = ships.filter(s =>
    ['tanker', 'oil tanker', 'lng', 'chemical tanker']
      .includes(s.type?.toLowerCase?.() ?? ''),
  );
  const avgSpeed =
    ships.length ? ships.reduce((s, v) => s + (v.speed || 0), 0) / ships.length : 0;

  // Satellite calculations
  const milSpySats = satellites.filter(s =>
    ['military', 'spy', 'reconnaissance']
      .includes(s.category?.toLowerCase?.() ?? ''),
  );
  const navSats = satellites.filter(s =>
    ['navigation', 'gps', 'gnss', 'glonass', 'galileo', 'beidou']
      .includes(s.category?.toLowerCase?.() ?? ''),
  );

  // Conflict calculations
  const totalCasualties = conflictZones.reduce(
    (s, z) => s + (z.casualties?.total || 0),
    0,
  );
  const criticalZones = conflictZones.filter(z => z.intensity === 'critical').length;
  const criticalJam = gpsJamCells.filter(c => c.level > 0.8).length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        width: 200,
        background: 'rgba(2, 8, 20, 0.82)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: 5,
        padding: '8px 10px',
        fontFamily: '"Courier New", Courier, monospace',
        boxSizing: 'border-box',
        backdropFilter: 'blur(4px)',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* ── AIRCRAFT ────────────────────────────────────── */}
      <Section title="AIRCRAFT IN FLIGHT">
        <StatRow label="Airborne" value={airborne.length.toLocaleString()} />
        <StatRow label="Military" value={<span style={{ color: '#ff5555' }}>{militaryAc.length.toLocaleString()}</span>} />
        <StatRow label="Avg altitude" value={`${formatAlt(avgAlt)} ft`} />
        <StatRow
          label="Top countries"
          value={
            topCountries.length === 0 ? '—' : (
              <span style={{ fontSize: 9, letterSpacing: '0.02em' }}>
                {topCountries.map((c, i) => (
                  <span key={c.code}>
                    {i > 0 && <span style={{ color: '#2a4a5a', margin: '0 2px' }}>|</span>}
                    {c.flag} {c.count}
                  </span>
                ))}
              </span>
            )
          }
        />
      </Section>

      <SectionDivider />

      {/* ── MARITIME ────────────────────────────────────── */}
      <Section title="MARITIME ACTIVITY">
        <StatRow label="Vessels" value={ships.length.toLocaleString()} />
        <StatRow label="Warships" value={<span style={{ color: '#ff5555' }}>{warships.length.toLocaleString()}</span>} />
        <StatRow label="Tankers" value={tankers.length.toLocaleString()} />
        <StatRow label="Avg speed" value={`${avgSpeed.toFixed(1)} kts`} />
      </Section>

      <SectionDivider />

      {/* ── SATELLITES ──────────────────────────────────── */}
      <Section title="SATELLITE COVERAGE">
        <StatRow label="Tracked" value={satellites.length.toLocaleString()} />
        <StatRow label="Military/Spy" value={<span style={{ color: '#ff5555' }}>{milSpySats.length.toLocaleString()}</span>} />
        <StatRow label="Navigation (GPS)" value={<span style={{ color: '#ffd700' }}>{navSats.length.toLocaleString()}</span>} />
        <StatRow label="Coverage" value={<span style={{ color: '#00ff88' }}>Global</span>} />
      </Section>

      <SectionDivider />

      {/* ── CONFLICT ────────────────────────────────────── */}
      <Section title="CONFLICT STATUS">
        <StatRow
          label="Active wars"
          value={
            <span style={{ color: conflictZones.length > 0 ? '#ff3b3b' : '#e0f8f0' }}>
              {conflictZones.length}
            </span>
          }
        />
        <StatRow
          label="Total casualties"
          value={
            <span style={{ color: '#ff7777' }}>
              {formatLargeNumber(totalCasualties)}
            </span>
          }
        />
        <StatRow
          label="Critical zones"
          value={
            <span style={{ color: criticalZones > 0 ? '#ff3b3b' : '#e0f8f0' }}>
              {criticalZones}
            </span>
          }
        />
        <StatRow
          label="GPS jam zones"
          value={
            <span style={{ color: criticalJam > 0 ? '#ffd700' : '#e0f8f0' }}>
              {criticalJam}
            </span>
          }
        />
      </Section>
    </div>
  );
};

export default StatsOverlay;
