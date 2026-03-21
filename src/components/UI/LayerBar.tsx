import type { LayerVisibility } from '../../types';

interface LayerBarProps {
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  counts?: Partial<Record<keyof LayerVisibility, number>>;
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

export default function LayerBar({ layers, onToggleLayer, counts }: LayerBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 42,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
        padding: '5px 10px',
        background: 'rgba(5, 10, 20, 0.75)',
        backdropFilter: 'blur(6px)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1300,
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
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
            title={`${label} (${active ? 'ON' : 'OFF'})${hasCount ? ` — ${count} loaded` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              height: 24,
              padding: '0 8px',
              border: `1px solid ${active ? (dimmed ? `${color}66` : color) : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 12,
              background: active
                ? (dimmed ? `${color}0d` : `${color}22`)
                : 'rgba(255,255,255,0.04)',
              color: active ? (dimmed ? `${color}88` : color) : 'rgba(255,255,255,0.3)',
              fontFamily: "'Courier New', monospace",
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              outline: 'none',
              opacity: dimmed ? 0.5 : 1,
              boxShadow: active && !dimmed ? `0 0 6px ${color}44` : 'none',
            }}
          >
            <span style={{ fontSize: 12 }}>{icon}</span>
            {label}
            {hasCount && (
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
