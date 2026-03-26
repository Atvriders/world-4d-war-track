import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';

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
  isMobile?: boolean;
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
  hasData: boolean,
): 'live' | 'stale' | 'waiting' {
  // Check if ANY source has been refreshed
  const fastest = Math.max(lastRefresh.satellites, lastRefresh.aircraft, lastRefresh.ships, lastRefresh.gpsJam);
  if (fastest === 0 && !hasData) return 'waiting';
  if (fastest === 0 && hasData) return 'live'; // static data (conflicts, GPS jam) loaded
  const age = Date.now() - fastest;
  return age < 1_200_000 ? 'live' : 'stale'; // 20 min threshold (matches polling interval)
}

const FRESHNESS_CONFIG = {
  live:    { color: '#00FF88', label: 'LIVE',    bg: 'rgba(0, 255, 136, 0.12)', border: 'rgba(0, 255, 136, 0.4)' },
  stale:   { color: '#FF3838', label: 'OFFLINE',  bg: 'rgba(255, 56, 56, 0.12)',  border: 'rgba(255, 56, 56, 0.4)' },
  waiting: { color: '#FFB020', label: 'WAITING', bg: 'rgba(255, 176, 32, 0.12)',  border: 'rgba(255, 176, 32, 0.4)' },
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
  isMobile,
}) => {
  const performanceMode = useStore((s: any) => s.performanceMode);
  const [clock, setClock] = useState<Date>(currentTime);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const anySyncing = isLoading.satellites || isLoading.aircraft || isLoading.ships || isLoading.gpsJam;
  const hasData = activeConflicts > 0 || aircraft > 0 || ships > 0 || satellites > 0;
  const freshness = getFreshness(lastRefresh, hasData);
  const conf = anySyncing ? { color: '#FFB020', label: 'SYNCING', bg: 'rgba(255, 176, 32, 0.12)', border: 'rgba(255, 176, 32, 0.4)' } : FRESHNESS_CONFIG[freshness];

  return (
    <>
      <style>{STYLES}</style>
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: 0,
          right: 0,
          height: isMobile ? 28 : 32,
          zIndex: 1000,
          background: 'rgba(8, 14, 28, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(60, 180, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 8px 0 8px' : '0 14px 0 52px',
          fontFamily: "'Rajdhani', sans-serif",
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        {/* LEFT -- Title */}
        <span
          style={{
            color: '#00FF88',
            fontWeight: 700,
            fontSize: isMobile ? 9 : 12,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            fontFamily: "'Rajdhani', sans-serif",
            textTransform: 'uppercase',
          }}
        >
          {isMobile ? 'W4D' : 'WORLD 4D WAR TRACK'}
        </span>

        {/* CENTER -- Compact entity counts */}
        <span
          style={{
            color: '#7a9ab0',
            fontSize: isMobile ? 9 : 11,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            fontFamily: "'Share Tech Mono', monospace",
          }}
        >
          <span style={{ color: '#3CB8FF' }}>✈ {aircraft.toLocaleString()}</span>
          <span style={{ color: 'rgba(60, 184, 255, 0.25)', margin: isMobile ? '0 3px' : '0 6px' }}>|</span>
          <span style={{ color: '#3CB8FF' }}>🚢 {ships.toLocaleString()}</span>
          {/* Satellite count hidden
          {!isMobile && (
            <>
              <span style={{ color: 'rgba(60, 184, 255, 0.25)', margin: '0 6px' }}>|</span>
              <span style={{ color: '#3CB8FF' }}>🛰 {satellites.toLocaleString()}</span>
            </>
          )}
          */}
          <span style={{ color: 'rgba(60, 184, 255, 0.25)', margin: isMobile ? '0 3px' : '0 6px' }}>|</span>
          <span style={{ color: '#FF3838' }}>⚔ {activeConflicts}</span>
        </span>

        {/* RIGHT -- Clock + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, whiteSpace: 'nowrap' }}>
          {!isMobile && (
            <span style={{ color: 'rgba(160, 200, 230, 0.6)', fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }}>
              {formatDate(clock)}
            </span>
          )}
          <span style={{ color: '#e0f0ff', fontSize: isMobile ? 9 : 12, fontWeight: 700, letterSpacing: '0.06em', fontFamily: "'Share Tech Mono', monospace" }}>
            {formatUTC(clock)}
          </span>
          {performanceMode === 'low' && (
            <span
              style={{
                color: '#FFB020',
                fontSize: isMobile ? 7 : 9,
                fontWeight: 700,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                fontFamily: "'Rajdhani', sans-serif",
              }}
            >
              ⚡ LOW PERF
            </span>
          )}
          {/* Status badge */}
          <span
            style={{
              background: conf.bg,
              border: `1px solid ${conf.border}`,
              color: '#fff',
              fontSize: isMobile ? 8 : 9,
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '1px 5px',
              borderRadius: 3,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: "'Rajdhani', sans-serif",
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
