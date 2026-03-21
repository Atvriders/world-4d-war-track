import React, { useState, useEffect } from 'react';

interface StatusBarProps {
  satellites: number;
  aircraft: number;
  militaryAircraft: number;
  ships: number;
  warships: number;
  activeConflicts: number;
  gpsJamZones: number;
  isLoading: { satellites: boolean; aircraft: boolean; ships: boolean; gpsJam: boolean };
  errors: { satellites: string | null; aircraft: string | null; ships: string | null; gpsJam: string | null };
  lastRefresh: { satellites: number; aircraft: number; ships: number; gpsJam: number };
  currentTime: Date;
  alerts?: unknown[];
  gpsJamCells?: unknown[];
  onRetry?: () => void;
}

const STYLES = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

function formatUTC(date: Date): string {
  return date.toUTCString().replace(/.*(\d{2}:\d{2}:\d{2}) GMT.*/, '$1');
}

function formatDate(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const d = date.getUTCDate().toString().padStart(2, '0');
  const m = months[date.getUTCMonth()];
  const y = date.getUTCFullYear();
  return `${d} ${m} ${y}`;
}

function getFreshness(
  lastRefresh: StatusBarProps['lastRefresh'],
  hasErrors: boolean,
): 'live' | 'stale' | 'connecting' {
  const slowest = Math.min(lastRefresh.satellites, lastRefresh.aircraft, lastRefresh.ships, lastRefresh.gpsJam);
  if (slowest === 0) return hasErrors ? 'connecting' : 'connecting';
  const age = Date.now() - slowest;
  return age < 120_000 ? 'live' : 'stale';
}

const FRESHNESS_CONFIG = {
  live:       { color: '#00ff88', label: 'LIVE',       bg: 'rgba(0, 255, 136, 0.15)', border: 'rgba(0, 255, 136, 0.5)' },
  stale:      { color: '#ff3b3b', label: 'STALE',      bg: 'rgba(255, 59, 59, 0.15)',  border: 'rgba(255, 59, 59, 0.5)' },
  connecting: { color: '#ffd700', label: 'CONNECTING', bg: 'rgba(255, 215, 0, 0.15)',  border: 'rgba(255, 215, 0, 0.5)' },
};

const StatusBar: React.FC<StatusBarProps> = ({
  satellites,
  aircraft,
  ships,
  activeConflicts,
  isLoading,
  errors,
  lastRefresh,
  currentTime,
}) => {
  const [clock, setClock] = useState<Date>(currentTime);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const anySyncing = isLoading.satellites || isLoading.aircraft || isLoading.ships || isLoading.gpsJam;
  const hasErrors = !!(errors.satellites || errors.aircraft || errors.ships || errors.gpsJam);
  const freshness = getFreshness(lastRefresh, hasErrors);
  const conf = anySyncing ? { color: '#ffa500', label: 'SYNCING', bg: 'rgba(255, 165, 0, 0.15)', border: 'rgba(255, 165, 0, 0.5)' } : FRESHNESS_CONFIG[freshness];

  return (
    <>
      <style>{STYLES}</style>
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: 0,
          right: 0,
          height: 32,
          zIndex: 1000,
          background: 'rgba(2, 8, 20, 0.95)',
          borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          fontFamily: '"Courier New", Courier, monospace',
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        {/* LEFT -- Title */}
        <span
          style={{
            color: '#00ff88',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          WORLD 4D WAR TRACK
        </span>

        {/* CENTER -- Compact entity counts */}
        <span
          style={{
            color: '#7a9ab0',
            fontSize: 11,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#4da8ff' }}>✈ {aircraft.toLocaleString()}</span>
          <span style={{ color: '#3a5a6a', margin: '0 6px' }}>|</span>
          <span style={{ color: '#ff8c00' }}>🚢 {ships.toLocaleString()}</span>
          <span style={{ color: '#3a5a6a', margin: '0 6px' }}>|</span>
          <span style={{ color: '#00ff88' }}>🛰 {satellites.toLocaleString()}</span>
          <span style={{ color: '#3a5a6a', margin: '0 6px' }}>|</span>
          <span style={{ color: '#ff3b3b' }}>⚔ {activeConflicts}</span>
        </span>

        {/* RIGHT -- Clock + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#7a9ab0', fontSize: 10 }}>
            {formatDate(clock)}
          </span>
          <span style={{ color: '#e0f0ff', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
            {formatUTC(clock)} UTC
          </span>
          {/* Status badge */}
          <span
            style={{
              background: conf.bg,
              border: `1px solid ${conf.border}`,
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '1px 5px',
              borderRadius: 3,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: conf.color,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            {conf.label}
          </span>
        </div>
      </div>
    </>
  );
};

export default StatusBar;
