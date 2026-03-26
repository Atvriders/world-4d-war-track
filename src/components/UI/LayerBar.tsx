import type { LayerVisibility } from '../../types';

interface LayerBarProps {
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  counts?: Partial<Record<keyof LayerVisibility, number>>;
  isMobile?: boolean;
}

const LAYER_BUTTONS: {
  label: string;
  icon: string;
  key: keyof LayerVisibility;
  color: string;
}[] = [
  { label: 'FLT',  icon: '✈',  key: 'aircraft',      color: '#00e5ff' },
  // { label: 'SAT',  icon: '🛰', key: 'satellites',    color: '#4caf50' },  // hidden
  { label: 'MAR',  icon: '🚢', key: 'ships',         color: '#2196f3' },
  { label: 'WAR',  icon: '⚔',  key: 'warZones',      color: '#f44336' },
  { label: 'GPS',  icon: '📡', key: 'gpsJam',        color: '#ff9800' },
  { label: 'NUC',  icon: '☢',  key: 'nuclearSites',  color: '#ffeb3b' },
  { label: 'BASE', icon: '🎯', key: 'militaryBases', color: '#e0e0e0' },
  { label: 'NRG',  icon: '⚡', key: 'energyInfra',   color: '#ffab40' },
  { label: 'CBL',  icon: '🌊', key: 'seaCables',     color: '#26a69a' },
];

const FULL_NAMES: Record<string, string> = {
  aircraft: 'Flights', satellites: 'Satellites', ships: 'Maritime',
  warZones: 'War Zones', gpsJam: 'GPS Jamming', nuclearSites: 'Nuclear',
  militaryBases: 'Bases', energyInfra: 'Energy', seaCables: 'Cables',
};

export default function LayerBar({ layers, onToggleLayer, counts, isMobile }: LayerBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 0 : 42,
        left: isMobile ? 0 : '50%',
        right: isMobile ? 0 : undefined,
        transform: isMobile ? 'none' : 'translateX(-50%)',
        display: 'flex',
        gap: isMobile ? 4 : 6,
        padding: isMobile ? '6px 8px' : '5px 10px',
        background: 'rgba(8, 14, 28, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: isMobile ? 0 : 20,
        border: isMobile ? 'none' : '1px solid rgba(60, 180, 255, 0.1)',
        borderTop: isMobile ? '1px solid rgba(60, 180, 255, 0.1)' : undefined,
        zIndex: 1300,
        alignItems: 'center',
        flexWrap: 'nowrap',
        justifyContent: isMobile ? 'flex-start' : 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch' as any,
      }}
    >
      {LAYER_BUTTONS.map(({ label, icon, key, color }) => {
        const active = layers[key];
        const count = counts?.[key];
        const hasCount = count !== undefined;
        const isEmpty = hasCount && count === 0;
        const dimmed = isEmpty && active;
        return (
          <button
            key={key}
            onClick={() => onToggleLayer(key)}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
            title={`${FULL_NAMES[key] || label} (${active ? 'ON' : 'OFF'})${hasCount ? ` — ${count} loaded` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              height: isMobile ? 36 : 28,
              minHeight: isMobile ? 36 : 28,
              padding: isMobile ? '0 10px' : '0 6px',
              border: `1px solid ${active ? (dimmed ? 'rgba(60, 180, 255, 0.15)' : 'rgba(60, 180, 255, 0.3)') : 'rgba(60, 180, 255, 0.08)'}`,
              borderRadius: 14,
              background: active
                ? (dimmed ? 'rgba(60, 180, 255, 0.08)' : 'rgba(60, 180, 255, 0.15)')
                : 'transparent',
              color: active ? (dimmed ? '#4A6480' : '#3CB8FF') : '#4A6480',
              fontFamily: "'Rajdhani', 'Courier New', sans-serif",
              fontSize: isMobile ? 11 : 10,
              fontWeight: 500,
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              outline: 'none',
              filter: 'brightness(1)',
              opacity: dimmed ? 0.7 : 1,
              boxShadow: active && !dimmed ? '0 0 8px rgba(60, 180, 255, 0.2)' : 'none',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13 }}>{icon}</span>
            {isMobile ? '' : label}
            {!isMobile && hasCount && (
              <span style={{
                fontSize: 9,
                opacity: count > 0 ? 0.9 : 0.4,
                marginLeft: 1,
              }}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
