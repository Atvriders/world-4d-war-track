import { useState, useEffect } from 'react';

interface ServerStatusProps {
  errors: {
    satellites: string | null;
    aircraft: string | null;
    ships: string | null;
    gpsJam: string | null;
  };
  lastRefresh: {
    satellites: number;
    aircraft: number;
    ships: number;
    gpsJam: number;
  };
}

export default function ServerStatus({ errors, lastRefresh }: ServerStatusProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hasEverFailed, setHasEverFailed] = useState(false);

  const hasErrors = Object.values(errors).some(e => e !== null);
  const hasAnyData = Object.values(lastRefresh).some(t => t > 0);

  // Track if we've ever seen an error
  useEffect(() => {
    if (hasErrors) setHasEverFailed(true);
  }, [hasErrors]);

  // Auto-dismiss when data starts flowing after errors
  useEffect(() => {
    if (hasAnyData && hasEverFailed && !hasErrors) {
      setDismissed(true);
    }
  }, [hasAnyData, hasEverFailed, hasErrors]);

  // Reset dismissed state if errors come back
  useEffect(() => {
    if (hasErrors) setDismissed(false);
  }, [hasErrors]);

  if (!hasEverFailed || dismissed || !hasErrors) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 76,
        left: 0,
        right: 0,
        zIndex: 1050,
        background: 'rgba(8, 14, 28, 0.8)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(60, 180, 255, 0.15)',
        borderRadius: 0,
        color: '#8BA4BE',
        fontFamily: "'Rajdhani', 'Share Tech Mono', sans-serif",
        fontSize: '11px',
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        letterSpacing: '0.03em',
      }}
    >
      <span>
        ⚠ Data feeds offline — retrying automatically. Start server for live data:{' '}
        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 2 }}>
          npm run dev:all
        </code>
        <span style={{ display: 'block', marginTop: 2 }}>
          <span>✈ Aircraft: <span style={{ color: errors.aircraft ? '#ff6b6b' : '#69db7c' }}>{errors.aircraft ? 'OFFLINE' : 'ONLINE'}</span></span>
          {' | '}
          <span>🚢 Ships: <span style={{ color: errors.ships ? '#ff6b6b' : '#69db7c' }}>{errors.ships ? 'OFFLINE' : 'ONLINE'}</span></span>
          {' | '}
          <span>🛰 Satellites: <span style={{ color: errors.satellites ? '#ff6b6b' : '#69db7c' }}>{errors.satellites ? 'OFFLINE' : 'ONLINE'}</span></span>
          {' | '}
          <span>📡 GPS: <span style={{ color: errors.gpsJam ? '#ffd43b' : '#69db7c' }}>{errors.gpsJam ? 'STATIC' : 'ONLINE'}</span></span>
        </span>
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0 4px',
          opacity: 0.8,
          lineHeight: 1,
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
