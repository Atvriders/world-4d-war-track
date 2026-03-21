import React, { useState, useEffect, useMemo, useRef } from 'react';

interface AlertLike {
  severity: 'info' | 'warning' | 'critical';
  dismissed: boolean;
}

interface GpsJamCellLike {
  level: number;
}

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
  alerts?: AlertLike[];
  gpsJamCells?: GpsJamCellLike[];
  onRetry?: () => void;
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
  @keyframes blinkRed {
    0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(255,59,59,0.8); }
    50% { opacity: 0.3; box-shadow: 0 0 0px rgba(255,59,59,0); }
  }
  @keyframes dataFlash {
    0% { background: #00ff88; box-shadow: 0 0 6px rgba(0,255,136,0.9); }
    100% { background: #00ff88; box-shadow: 0 0 0px rgba(0,255,136,0); }
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

/** Determine data freshness: 'live' (<30s), 'delayed' (<2min), 'stale' (>=2min) */
function getFreshness(slowestMs: number): 'live' | 'delayed' | 'stale' {
  const age = Date.now() - slowestMs;
  if (age < 30_000) return 'live';
  if (age < 120_000) return 'delayed';
  return 'stale';
}

/** Polling intervals must match useDataRefresh.ts */
const POLLING_INTERVALS: Record<string, number> = {
  aircraft: 60_000,
  ships: 60_000,
  satellites: 3_600_000,
  gpsJam: 600_000,
};

const DATA_SOURCE_NAMES: Record<string, string> = {
  aircraft: 'OpenSky Network (60s polling, free tier)',
  ships: 'AISHub (60s polling)',
  satellites: 'CelesTrak (60min polling, fair use)',
  gpsJam: 'Static OSINT / GPSJam.org',
};

type DataSourceKey = 'aircraft' | 'ships' | 'satellites' | 'gpsJam';

function buildTooltip(
  key: DataSourceKey,
  lastRefreshMs: number,
  error: string | null,
): string {
  const now = Date.now();
  const ageSec = Math.max(0, Math.floor((now - lastRefreshMs) / 1000));
  const intervalSec = POLLING_INTERVALS[key] / 1000;
  const nextRefreshSec = Math.max(0, Math.round(intervalSec - ageSec));

  const ageStr = ageSec < 60
    ? `${ageSec} seconds ago`
    : ageSec < 3600
      ? `${Math.floor(ageSec / 60)} minutes ago`
      : `${Math.floor(ageSec / 3600)} hours ago`;

  const lines = [
    `Last updated: ${ageStr}`,
    `Next refresh in: ${nextRefreshSec} seconds`,
    `Source: ${DATA_SOURCE_NAMES[key]}`,
  ];

  if (error) {
    lines.push(`Error: ${error}. Retrying in ${nextRefreshSec} seconds...`);
  }

  return lines.join('\n');
}

const FRESHNESS_CONFIG = {
  live:    { color: '#00ff88', label: 'LIVE',    bg: 'rgba(0, 255, 136, 0.15)', border: 'rgba(0, 255, 136, 0.5)' },
  delayed: { color: '#ffd700', label: 'DELAYED', bg: 'rgba(255, 215, 0, 0.15)', border: 'rgba(255, 215, 0, 0.5)' },
  stale:   { color: '#ff3b3b', label: 'STALE',   bg: 'rgba(255, 59, 59, 0.15)', border: 'rgba(255, 59, 59, 0.5)' },
};

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

const RetryButton: React.FC<{ onClick: () => void; loading: boolean }> = ({ onClick, loading }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title="Retry"
    style={{
      background: 'none',
      border: '1px solid rgba(255, 59, 59, 0.5)',
      borderRadius: 3,
      color: '#ff3b3b',
      fontSize: 11,
      lineHeight: 1,
      padding: '1px 3px',
      marginLeft: 3,
      cursor: 'pointer',
      verticalAlign: 'middle',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: loading ? 'spin 1s linear infinite' : 'none',
    }}
  >
    ↻
  </button>
);

/** Blinking red dot for military items */
const MilDot: React.FC = () => (
  <span
    style={{
      display: 'inline-block',
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#ff3b3b',
      marginLeft: 4,
      marginRight: 2,
      verticalAlign: 'middle',
      animation: 'blinkRed 1s ease-in-out infinite',
    }}
  />
);

/** Small 8px auto-refresh indicator: spinning ring when loading, green flash on data arrival, steady dot when idle */
const DataFlowIndicator: React.FC<{ anyLoading: boolean; lastRefresh: StatusBarProps['lastRefresh'] }> = ({
  anyLoading,
  lastRefresh,
}) => {
  const [flashing, setFlashing] = useState(false);
  const prevRefreshRef = useRef<string>('');

  useEffect(() => {
    const key = `${lastRefresh.satellites}-${lastRefresh.aircraft}-${lastRefresh.ships}-${lastRefresh.gpsJam}`;
    if (prevRefreshRef.current && prevRefreshRef.current !== key) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 500);
      return () => clearTimeout(timer);
    }
    prevRefreshRef.current = key;
  }, [lastRefresh.satellites, lastRefresh.aircraft, lastRefresh.ships, lastRefresh.gpsJam]);

  if (anyLoading) {
    return (
      <span
        title="Fetching data..."
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,165,0,0.3)',
          borderTopColor: '#ffa500',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
    );
  }

  if (flashing) {
    return (
      <span
        title="Data received"
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#00ff88',
          animation: 'dataFlash 0.5s ease-out forwards',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span
      title="Data stream idle"
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#00ff88',
        opacity: 0.6,
        flexShrink: 0,
      }}
    />
  );
};

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
  alerts = [],
  gpsJamCells = [],
  onRetry,
}) => {
  const [clock, setClock] = useState<Date>(currentTime);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const anySyncing = isLoading.satellites || isLoading.aircraft || isLoading.ships || isLoading.gpsJam;
  const slowest = getSlowestRefresh(lastRefresh);

  // Derived: alert severity breakdown (only non-dismissed)
  const alertStats = useMemo(() => {
    const active = alerts.filter(a => !a.dismissed);
    return {
      total: active.length,
      critical: active.filter(a => a.severity === 'critical').length,
      warning: active.filter(a => a.severity === 'warning').length,
      info: active.filter(a => a.severity === 'info').length,
    };
  }, [alerts]);

  // Derived: average GPS interference level (0-100%)
  const gpsInterference = useMemo(() => {
    if (gpsJamCells.length === 0) return 0;
    const sum = gpsJamCells.reduce((acc, c) => acc + c.level, 0);
    return Math.round((sum / gpsJamCells.length) * 100);
  }, [gpsJamCells]);

  // Civilian counts
  const civilianAircraft = aircraft - militaryAircraft;
  const commercialShips = ships - warships;

  // Data freshness
  const freshness = getFreshness(slowest);
  const freshnessConf = FRESHNESS_CONFIG[freshness];

  // Hover tooltips for each data source (memoized to avoid recalculating every tick)
  const aircraftTooltip = useMemo(() => buildTooltip('aircraft', lastRefresh.aircraft, errors.aircraft), [lastRefresh.aircraft, errors.aircraft, clock]);
  const shipsTooltip = useMemo(() => buildTooltip('ships', lastRefresh.ships, errors.ships), [lastRefresh.ships, errors.ships, clock]);
  const satellitesTooltip = useMemo(() => buildTooltip('satellites', lastRefresh.satellites, errors.satellites), [lastRefresh.satellites, errors.satellites, clock]);
  const gpsJamTooltip = useMemo(() => buildTooltip('gpsJam', lastRefresh.gpsJam, errors.gpsJam), [lastRefresh.gpsJam, errors.gpsJam, clock]);

  return (
    <>
      <style>{STYLES}</style>
      <div
        style={{
          position: 'fixed',
          top: 24,
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
        {/* LEFT -- Title */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 170 }}>
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

        {/* CENTER -- Counters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {/* AIRCRAFT */}
          <CounterBlock
            icon="✈️"
            label="AIRCRAFT"
            loading={isLoading.aircraft}
            error={errors.aircraft}
            onRetry={onRetry}
            tooltip={aircraftTooltip}
          >
            <span style={{ color: '#4da8ff', fontSize: 15, fontWeight: 700 }}>
              {aircraft.toLocaleString()}
            </span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 3 }}>
              ({civilianAircraft.toLocaleString()} civ)
            </span>
            <MilDot />
            <span style={{ color: '#ff3b3b', fontSize: 13, fontWeight: 700 }}>
              {militaryAircraft.toLocaleString()}
            </span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 2 }}>mil</span>
          </CounterBlock>

          <Divider />

          {/* MARITIME */}
          <CounterBlock
            icon="🚢"
            label="MARITIME"
            loading={isLoading.ships}
            error={errors.ships}
            onRetry={onRetry}
            tooltip={shipsTooltip}
          >
            <span style={{ color: '#ff8c00', fontSize: 15, fontWeight: 700 }}>
              {ships.toLocaleString()}
            </span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 3 }}>
              ({commercialShips.toLocaleString()} comm)
            </span>
            <MilDot />
            <span style={{ color: '#ff3b3b', fontSize: 13, fontWeight: 700 }}>
              {warships.toLocaleString()}
            </span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 2 }}>warships</span>
          </CounterBlock>

          <Divider />

          {/* SATELLITES */}
          <CounterBlock
            icon="🛰️"
            label="SATELLITES"
            loading={isLoading.satellites}
            error={errors.satellites}
            onRetry={onRetry}
            tooltip={satellitesTooltip}
          >
            <span style={{ color: '#00ff88', fontSize: 15, fontWeight: 700 }}>
              {satellites.toLocaleString()}
            </span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 3 }}>tracked</span>
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
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 3 }}>active</span>
          </CounterBlock>

          <Divider />

          {/* GPS INTERFERENCE */}
          <CounterBlock
            icon="📡"
            label="GPS INTRF"
            loading={isLoading.gpsJam}
            error={errors.gpsJam}
            onRetry={onRetry}
            tooltip={gpsJamTooltip}
          >
            <span
              style={{
                color: gpsInterference > 70 ? '#ff3b3b' : gpsInterference > 40 ? '#ffd700' : '#00ff88',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {gpsInterference}%
            </span>
            <span style={{ color: '#7a9ab0', fontSize: 9, marginLeft: 3 }}>
              ({gpsJamZones} zones)
            </span>
          </CounterBlock>

          <Divider />

          {/* ALERTS */}
          <CounterBlock
            icon="⚠️"
            label="ALERTS"
            loading={false}
            error={null}
          >
            <span
              style={{
                color: alertStats.critical > 0 ? '#ff3b3b' : alertStats.warning > 0 ? '#ffd700' : '#7a9ab0',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {alertStats.total}
            </span>
            {alertStats.total > 0 && (
              <span style={{ fontSize: 9, marginLeft: 4, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                {alertStats.critical > 0 && (
                  <span style={{ color: '#ff3b3b' }}>{alertStats.critical}C</span>
                )}
                {alertStats.warning > 0 && (
                  <span style={{ color: '#ffd700' }}>{alertStats.warning}W</span>
                )}
                {alertStats.info > 0 && (
                  <span style={{ color: '#8ab4f8' }}>{alertStats.info}I</span>
                )}
              </span>
            )}
          </CounterBlock>
        </div>

        {/* RIGHT -- Clock / Status / Freshness */}
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
            {/* Freshness / SYNCING badge */}
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
                  background: freshnessConf.bg,
                  border: `1px solid ${freshnessConf.border}`,
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
                    background: freshnessConf.color,
                    animation: freshness === 'live'
                      ? 'pulse 1.8s ease-in-out infinite'
                      : freshness === 'stale'
                        ? 'blink 1s step-start infinite'
                        : 'pulse 1.2s ease-in-out infinite',
                  }}
                />
                {freshnessConf.label}
              </span>
            )}
            {/* Auto-refresh data flow indicator */}
            <DataFlowIndicator anyLoading={anySyncing} lastRefresh={lastRefresh} />
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

/* -- Helper sub-components ------------------------------------------------- */

interface CounterBlockProps {
  icon: string;
  label: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  onRetry?: () => void;
  tooltip?: string;
}

const CounterBlock: React.FC<CounterBlockProps> = ({ icon, label, loading, error, children, onRetry, tooltip }) => (
  <div title={tooltip} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, cursor: tooltip ? 'help' : undefined }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ color: '#7a9ab0', fontSize: 9, letterSpacing: '0.1em' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
      {children}
      {loading && <LoadingDot />}
      {error && <ErrorIcon title={error} />}
      {error && !loading && onRetry && <RetryButton onClick={onRetry} loading={loading} />}
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
