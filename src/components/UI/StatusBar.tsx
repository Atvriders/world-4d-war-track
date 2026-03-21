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
}

const STYLES = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

function formatSecondsAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function getSlowestRefresh(lastRefresh: StatusBarProps['lastRefresh']): number {
  return Math.min(lastRefresh.satellites, lastRefresh.aircraft, lastRefresh.ships, lastRefresh.gpsJam);
}

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

const LoadingDot: React.FC = () => (
  <span
    style={{
      display: 'inline-block',
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#00ff88',
      marginLeft: 4,
      verticalAlign: 'middle',
      animation: 'pulse 1s ease-in-out infinite',
    }}
  />
);

const ErrorIcon: React.FC<{ title: string }> = ({ title }) => (
  <span
    title={title}
    style={{
      color: '#ff3b3b',
      fontSize: 11,
      marginLeft: 4,
      cursor: 'help',
      verticalAlign: 'middle',
    }}
  >
    ⚠
  </span>
);

const StatusBar: React.FC<StatusBarProps> = ({
  satellites,
  aircraft,
  militaryAircraft,
  ships,
  warships,
  activeConflicts,
  gpsJamZones,
  isLoading,
  errors,
  lastRefresh,
  currentTime,
}) => {
  const [clock, setClock] = useState<Date>(currentTime);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const anySyncing = isLoading.satellites || isLoading.aircraft || isLoading.ships || isLoading.gpsJam;
  const slowest = getSlowestRefresh(lastRefresh);

  return (
    <>
      <style>{STYLES}</style>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          zIndex: 1000,
          background: 'rgba(2, 8, 20, 0.95)',
          borderBottom: '1px solid rgba(0, 255, 136, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontFamily: '"Courier New", Courier, monospace',
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        {/* LEFT — Title */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 180 }}>
          <span
            style={{
              color: '#00ff88',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.08em',
              lineHeight: 1.2,
            }}
          >
            🌍 WORLD 4D WAR TRACK
          </span>
          <span
            style={{
              color: '#3a5a6a',
              fontSize: 9,
              letterSpacing: '0.12em',
              lineHeight: 1.2,
            }}
          >
            GLOBAL CONFLICT INTELLIGENCE
          </span>
        </div>

        {/* CENTER — Counters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {/* SATELLITES */}
          <CounterBlock
            icon="🛰️"
            label="SATELLITES"
            loading={isLoading.satellites}
            error={errors.satellites}
          >
            <span style={{ color: '#00ff88', fontSize: 15, fontWeight: 700 }}>{satellites.toLocaleString()}</span>
          </CounterBlock>

          <Divider />

          {/* AIRCRAFT */}
          <CounterBlock
            icon="✈️"
            label="AIRCRAFT"
            loading={isLoading.aircraft}
            error={errors.aircraft}
          >
            <span style={{ color: '#4da8ff', fontSize: 15, fontWeight: 700 }}>{aircraft.toLocaleString()}</span>
            <span style={{ color: '#7a9ab0', fontSize: 10, margin: '0 3px' }}>/</span>
            <span style={{ color: '#ff3b3b', fontSize: 13, fontWeight: 700 }}>{militaryAircraft.toLocaleString()}</span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 2 }}>MIL</span>
          </CounterBlock>

          <Divider />

          {/* MARITIME */}
          <CounterBlock
            icon="🚢"
            label="MARITIME"
            loading={isLoading.ships}
            error={errors.ships}
          >
            <span style={{ color: '#ff8c00', fontSize: 15, fontWeight: 700 }}>{ships.toLocaleString()}</span>
            <span style={{ color: '#7a9ab0', fontSize: 10, margin: '0 3px' }}>/</span>
            <span style={{ color: '#ff3b3b', fontSize: 13, fontWeight: 700 }}>{warships.toLocaleString()}</span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 2 }}>WARSHIPS</span>
          </CounterBlock>

          <Divider />

          {/* CONFLICTS */}
          <CounterBlock
            icon="⚔️"
            label="CONFLICTS"
            loading={false}
            error={null}
          >
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#ff3b3b',
                marginRight: 5,
                verticalAlign: 'middle',
                animation: 'blink 1.2s step-start infinite',
              }}
            />
            <span style={{ color: '#ff3b3b', fontSize: 15, fontWeight: 700 }}>{activeConflicts}</span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 3 }}>ACTIVE</span>
          </CounterBlock>

          <Divider />

          {/* GPS JAM */}
          <CounterBlock
            icon="📡"
            label="GPS JAM"
            loading={isLoading.gpsJam}
            error={errors.gpsJam}
          >
            <span style={{ color: '#ffd700', fontSize: 15, fontWeight: 700 }}>{gpsJamZones}</span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 3 }}>ZONES</span>
          </CounterBlock>
        </div>

        {/* RIGHT — Clock / Status */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            minWidth: 160,
            gap: 1,
          }}
        >
          {/* Clock row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#e0f0ff', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em' }}>
              {formatUTC(clock)} UTC
            </span>
            {/* LIVE / SYNCING badge */}
            {anySyncing ? (
              <span
                style={{
                  background: 'rgba(255, 165, 0, 0.2)',
                  border: '1px solid rgba(255, 165, 0, 0.6)',
                  color: '#ffa500',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '1px 5px',
                  borderRadius: 3,
                  display: 'flex',
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
                    background: '#ffa500',
                    animation: 'pulse 0.8s ease-in-out infinite',
                  }}
                />
                SYNCING
              </span>
            ) : (
              <span
                style={{
                  background: 'rgba(0, 255, 136, 0.15)',
                  border: '1px solid rgba(0, 255, 136, 0.5)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '1px 5px',
                  borderRadius: 3,
                  display: 'flex',
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
                    background: '#00ff88',
                    animation: 'pulse 1.8s ease-in-out infinite',
                  }}
                />
                LIVE
              </span>
            )}
          </div>

          {/* Date + freshness row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#7a9ab0', fontSize: 10, letterSpacing: '0.08em' }}>
              {formatDate(clock)}
            </span>
            <span style={{ color: '#3a5a6a', fontSize: 9, letterSpacing: '0.04em' }}>
              Updated {formatSecondsAgo(slowest)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Helper sub-components ─────────────────────────────────────────────── */

interface CounterBlockProps {
  icon: string;
  label: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

const CounterBlock: React.FC<CounterBlockProps> = ({ icon, label, loading, error, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ color: '#7a9ab0', fontSize: 9, letterSpacing: '0.1em' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
      {children}
      {loading && <LoadingDot />}
      {error && <ErrorIcon title={error} />}
    </div>
  </div>
);

const Divider: React.FC = () => (
  <div
    style={{
      width: 1,
      height: 28,
      background: 'rgba(0, 255, 136, 0.15)',
      flexShrink: 0,
    }}
  />
);

export default StatusBar;
