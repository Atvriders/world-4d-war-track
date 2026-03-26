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
  { label: 'Flights',    icon: '✈',  key: 'aircraft',      color: '#00e5ff' },
  { label: 'Satellites',  icon: '🛰', key: 'satellites',    color: '#4caf50' },
  { label: 'Maritime',   icon: '🚢', key: 'ships',         color: '#2196f3' },
  { label: 'War Zones',  icon: '⚔',  key: 'warZones',      color: '#f44336' },
  { label: 'GPS Jam',    icon: '📡', key: 'gpsJam',        color: '#ff9800' },
  { label: 'Nuclear',    icon: '☢',  key: 'nuclearSites',  color: '#ffeb3b' },
  { label: 'Bases',      icon: '🎯', key: 'militaryBases', color: '#e0e0e0' },
  { label: 'Energy',     icon: '⚡', key: 'energyInfra',   color: '#ffab40' },
  { label: 'Cables',     icon: '🌊', key: 'seaCables',     color: '#26a69a' },
];

export default function LayerBar({ layers, onToggleLayer, counts, isMobile }: LayerBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 0 : 86,
        left: isMobile ? 0 : '50%',
        right: isMobile ? 0 : undefined,
        transform: isMobile ? 'none' : 'translateX(-50%)',
        display: 'flex',
        gap: isMobile ? 4 : 6,
        padding: isMobile ? '6px 8px' : '5px 10px',
        background: 'rgba(5, 10, 20, 0.75)',
        backdropFilter: 'blur(6px)',
        borderRadius: isMobile ? 0 : 16,
        border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
        borderTop: isMobile ? '1px solid rgba(255,255,255,0.08)' : undefined,
        zIndex: 1300,
        alignItems: 'center',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        justifyContent: isMobile ? 'flex-start' : 'center',
        overflowX: isMobile ? 'auto' : undefined,
        overflowY: isMobile ? 'hidden' : undefined,
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
            title={`${label} (${active ? 'ON' : 'OFF'})${hasCount ? ` — ${count} loaded` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              height: isMobile ? 36 : 28,
              minHeight: isMobile ? 36 : 28,
              padding: isMobile ? '0 10px' : '0 8px',
              border: `1px solid ${active ? (dimmed ? `${color}66` : color) : 'rgba(255,255,255,0.25)'}`,
              borderRadius: 14,
              background: active
                ? (dimmed ? `${color}0d` : `${color}22`)
                : 'rgba(255,255,255,0.08)',
              color: active ? (dimmed ? `${color}88` : color) : 'rgba(255,255,255,0.6)',
              fontFamily: "'Courier New', monospace",
              fontSize: isMobile ? 11 : 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              outline: 'none',
              filter: 'brightness(1)',
              opacity: dimmed ? 0.7 : 1,
              boxShadow: active && !dimmed ? `0 0 6px ${color}44` : 'none',
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
