import React, { useState } from 'react';
import { useStore } from '../../store';

const IMAGERY_URLS = {
  satellite: '/img/earth-blue-marble.jpg',
  dark: '/img/earth-dark.jpg',
  terrain: '/img/earth-day.jpg',
};

const ATMOSPHERE_COLORS = [
  { label: 'Blue',   value: '#4488ff' },
  { label: 'Teal',   value: '#00cccc' },
  { label: 'Purple', value: '#aa44ff' },
  { label: 'Green',  value: '#00ff88' },
  { label: 'Red',    value: '#ff4444' },
];

function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 36,
        height: 18,
        borderRadius: 9,
        background: value ? '#3CB8FF' : 'rgba(60, 180, 255, 0.15)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 18 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }}
      />
    </div>
  );
}

interface GlobeSettingsProps {
  settings: {
    atmosphereColor: string;
    showGraticules: boolean;
    showTerminator: boolean;
    imageryStyle: 'satellite' | 'dark' | 'terrain';
    autoRotate: boolean;
    autoRotateSpeed: number;
  };
  onUpdate: (settings: Partial<GlobeSettingsProps['settings']>) => void;
  onReset: () => void;
  visible: boolean;
  onToggle: () => void;
}

export default function GlobeSettings({
  settings,
  onUpdate,
  onReset,
  visible,
  onToggle,
}: GlobeSettingsProps) {
  const [resetHover, setResetHover] = useState(false);
  const { performanceMode, setPerformanceMode } = useStore();

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "'Rajdhani', sans-serif",
    letterSpacing: 2,
    color: '#4A6480',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  };

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontFamily: "'Rajdhani', sans-serif",
    color: '#8BA4BE',
    flex: 1,
    paddingRight: 8,
  };

  const divider: React.CSSProperties = {
    borderTop: '1px solid rgba(60, 180, 255, 0.08)',
    margin: '12px 0',
  };

  return (
    <>
      {/* Gear toggle button */}
      <button
        onClick={onToggle}
        title="Globe Settings"
        style={{
          position: 'fixed',
          top: 62,
          right: 16,
          zIndex: 1100,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: visible ? 'rgba(8, 14, 28, 0.85)' : 'rgba(8, 14, 28, 0.7)',
          backdropFilter: 'blur(14px)',
          border: `1px solid ${visible ? 'rgba(60, 180, 255, 0.5)' : 'rgba(60, 180, 255, 0.15)'}`,
          color: visible ? '#3CB8FF' : '#4A6480',
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s, border-color 0.2s, color 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        ⚙️
      </button>

      {/* Settings panel */}
      {visible && (
        <div
          style={{
            position: 'fixed',
            top: 96,
            right: 16,
            zIndex: 1200,
            width: 240,
            background: 'rgba(8, 14, 28, 0.85)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(60, 180, 255, 0.15)',
            borderRadius: 8,
            padding: '14px 16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
            fontFamily: "'Rajdhani', sans-serif",
            color: '#ccc',
          }}
        >
          {/* Panel title */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Rajdhani', sans-serif",
              letterSpacing: '0.1em',
              color: '#3CB8FF',
              textTransform: 'uppercase',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            Globe Settings
          </div>

          {/* PERFORMANCE */}
          <div style={sectionLabel}>Performance</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['high', 'low'] as const).map((mode) => {
                const isActive = performanceMode === mode;
                const activeColor = mode === 'high' ? '#00cc66' : '#E5A835';
                const activeBg = mode === 'high' ? 'rgba(0, 204, 102, 0.1)' : 'rgba(229, 168, 53, 0.1)';
                const activeBorder = mode === 'high' ? 'rgba(0, 204, 102, 0.4)' : 'rgba(229, 168, 53, 0.4)';
                return (
                  <button
                    key={mode}
                    onClick={() => setPerformanceMode(mode)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: 10,
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      borderRadius: 3,
                      border: `1px solid ${isActive ? activeBorder : 'rgba(60, 180, 255, 0.1)'}`,
                      background: isActive ? activeBg : 'rgba(60, 180, 255, 0.04)',
                      color: isActive ? activeColor : '#4A6480',
                      transition: 'all 0.15s',
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "'Rajdhani', sans-serif",
                color: '#6AAED4',
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              Low: reduces markers, paths, and effects for better FPS
            </div>
          </div>

          <div style={divider} />

          {/* GLOBE DISPLAY */}
          <div style={sectionLabel}>Globe Display</div>

          {/* Imagery style toggle group */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Imagery</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['satellite', 'dark', 'terrain'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => onUpdate({ imageryStyle: style })}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: 10,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    borderRadius: 3,
                    border: `1px solid ${settings.imageryStyle === style ? 'rgba(60, 180, 255, 0.5)' : 'rgba(60, 180, 255, 0.1)'}`,
                    background: settings.imageryStyle === style ? 'rgba(60, 180, 255, 0.1)' : 'rgba(60, 180, 255, 0.04)',
                    color: settings.imageryStyle === style ? '#3CB8FF' : '#4A6480',
                    transition: 'all 0.15s',
                  }}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Show Graticules */}
          <div style={row}>
            <span style={labelStyle}>Show Graticules</span>
            <Switch
              value={settings.showGraticules}
              onChange={(v) => onUpdate({ showGraticules: v })}
            />
          </div>

          {/* Show Terminator */}
          <div style={row}>
            <span style={labelStyle}>Day/Night Terminator</span>
            <Switch
              value={settings.showTerminator}
              onChange={(v) => onUpdate({ showTerminator: v })}
            />
          </div>

          <div style={divider} />

          {/* CAMERA */}
          <div style={sectionLabel}>Camera</div>

          {/* Auto Rotate */}
          <div style={row}>
            <span style={labelStyle}>Auto Rotate</span>
            <Switch
              value={settings.autoRotate}
              onChange={(v) => onUpdate({ autoRotate: v })}
            />
          </div>

          {/* Rotation Speed */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...row, marginBottom: 4 }}>
              <span style={labelStyle}>Rotation Speed</span>
              <span
                style={{
                  fontSize: 11,
                  color: '#3CB8FF',
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                  minWidth: 32,
                  textAlign: 'right',
                }}
              >
                {settings.autoRotateSpeed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.1}
              value={settings.autoRotateSpeed}
              disabled={!settings.autoRotate}
              onChange={(e) => onUpdate({ autoRotateSpeed: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                accentColor: '#3CB8FF',
                cursor: settings.autoRotate ? 'pointer' : 'not-allowed',
                opacity: settings.autoRotate ? 1 : 0.4,
              }}
            />
          </div>

          <div style={divider} />

          {/* ATMOSPHERE */}
          <div style={sectionLabel}>Atmosphere</div>

          {/* Atmosphere Color Swatches */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Atmosphere Color</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ATMOSPHERE_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => onUpdate({ atmosphereColor: c.value })}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: c.value,
                    border: `2px solid ${
                      settings.atmosphereColor === c.value ? '#fff' : 'transparent'
                    }`,
                    cursor: 'pointer',
                    padding: 0,
                    outline: settings.atmosphereColor === c.value
                      ? `2px solid rgba(60, 180, 255, 0.5)`
                      : 'none',
                    outlineOffset: 1,
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={divider} />

          {/* RESET */}
          <button
            onClick={onReset}
            style={{
              width: '100%',
              padding: '7px 0',
              fontSize: 11,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: 4,
              border: resetHover ? '1px solid rgba(255, 68, 68, 0.6)' : '1px solid rgba(255, 68, 68, 0.15)',
              background: resetHover ? 'rgba(255, 68, 68, 0.12)' : 'rgba(255, 68, 68, 0.05)',
              color: '#ff6666',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={() => setResetHover(true)}
            onMouseLeave={() => setResetHover(false)}
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </>
  );
}
