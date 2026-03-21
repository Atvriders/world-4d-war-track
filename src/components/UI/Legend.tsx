import React, { useState } from 'react';

// ── Swatch ─────────────────────────────────────────────────────────────────────

interface SwatchProps {
  color: string;
  shape?: 'circle' | 'square' | 'line' | 'dashed';
}

function Swatch({ color, shape = 'circle' }: SwatchProps) {
  if (shape === 'line') {
    return (
      <div
        style={{
          width: 20,
          height: 12,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 20,
            height: 2,
            background: color,
            borderRadius: 1,
          }}
        />
      </div>
    );
  }

  if (shape === 'dashed') {
    return (
      <div
        style={{
          width: 20,
          height: 12,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 20,
            height: 2,
            flexShrink: 0,
            backgroundImage: `repeating-linear-gradient(to right, ${color} 0px, ${color} 4px, transparent 4px, transparent 7px)`,
          }}
        />
      </div>
    );
  }

  if (shape === 'square') {
    return (
      <div
        style={{
          width: 12,
          height: 12,
          flexShrink: 0,
          background: color,
          borderRadius: 1,
        }}
      />
    );
  }

  // circle (default)
  return (
    <div
      style={{
        width: 10,
        height: 10,
        flexShrink: 0,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 4px ${color}88`,
      }}
    />
  );
}

// ── Ring swatch (coverage footprint) ──────────────────────────────────────────

function RingSwatch({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        flexShrink: 0,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        background: 'transparent',
      }}
    />
  );
}

// ── LegendItem ─────────────────────────────────────────────────────────────────

interface LegendItemProps {
  swatch: React.ReactNode;
  label: string;
}

function LegendItem({ swatch, label }: LegendItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '2px 0',
      }}
    >
      <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {swatch}
      </div>
      <span
        style={{
          color: 'rgba(180, 200, 190, 0.75)',
          fontSize: 10,
          fontFamily: "'Courier New', Courier, monospace",
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── SectionHead ────────────────────────────────────────────────────────────────

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: 'rgba(0, 200, 80, 0.55)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase' as const,
        fontFamily: "'Courier New', Courier, monospace",
        marginTop: 8,
        marginBottom: 3,
        paddingBottom: 2,
        borderBottom: '1px solid rgba(0, 255, 100, 0.1)',
      }}
    >
      {children}
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────

const Legend: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 1000,
        fontFamily: "'Courier New', Courier, monospace",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        pointerEvents: 'none',
      }}
    >
      {/* Expanded card */}
      {open && (
        <div
          style={{
            width: 220,
            background: 'rgba(8, 12, 18, 0.97)',
            border: '1px solid rgba(0, 255, 100, 0.2)',
            borderRadius: 4,
            padding: '10px 12px 12px',
            marginBottom: 6,
            boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'all',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}
        >
          {/* Card header */}
          <div
            style={{
              color: 'rgba(0, 255, 100, 0.9)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              marginBottom: 4,
              borderBottom: '1px solid rgba(0, 255, 100, 0.2)',
              paddingBottom: 5,
            }}
          >
            Map Key
          </div>

          {/* SATELLITES */}
          <SectionHead>Satellites</SectionHead>
          <LegendItem swatch={<Swatch color="#00ffcc" />} label="ISS" />
          <LegendItem swatch={<Swatch color="#ff4444" />} label="Military" />
          <LegendItem swatch={<Swatch color="#ff8800" />} label="Spy / Recon" />
          <LegendItem swatch={<Swatch color="#00cc44" />} label="Navigation GPS/GNSS" />
          <LegendItem swatch={<Swatch color="#ffee44" />} label="Weather" />
          <LegendItem swatch={<Swatch color="#bb99ff" />} label="Starlink" />
          <LegendItem swatch={<Swatch color="rgba(180, 210, 200, 0.7)" shape="dashed" />} label="Orbital path" />
          <LegendItem swatch={<RingSwatch color="rgba(150, 200, 180, 0.6)" />} label="Coverage footprint" />
          <LegendItem swatch={<Swatch color="rgba(100, 180, 220, 0.65)" shape="line" />} label="Ground connection" />

          {/* AIRCRAFT */}
          <SectionHead>Aircraft</SectionHead>
          <LegendItem swatch={<Swatch color="#ff4444" shape="square" />} label="Military aircraft" />
          <LegendItem swatch={<Swatch color="#4499ff" shape="square" />} label="Civilian aircraft" />

          {/* MARITIME */}
          <SectionHead>Maritime</SectionHead>
          <LegendItem swatch={<Swatch color="#ff4444" shape="square" />} label="Warship" />
          <LegendItem swatch={<Swatch color="#ff8800" shape="square" />} label="Tanker" />
          <LegendItem swatch={<Swatch color="#ffcc00" shape="square" />} label="Cargo" />

          {/* CONFLICT ZONES */}
          <SectionHead>Conflict Zones</SectionHead>
          <LegendItem
            swatch={<Swatch color="rgba(140, 10, 10, 0.85)" shape="square" />}
            label="Critical (dark red)"
          />
          <LegendItem
            swatch={<Swatch color="rgba(160, 55, 0, 0.85)" shape="square" />}
            label="High intensity (dark orange)"
          />
          <LegendItem
            swatch={<Swatch color="rgba(140, 100, 0, 0.85)" shape="square" />}
            label="Medium intensity (dark yellow)"
          />
          <LegendItem
            swatch={<Swatch color="rgba(220, 220, 80, 0.9)" shape="line" />}
            label="Front lines"
          />

          {/* GPS INTERFERENCE */}
          <SectionHead>GPS Interference</SectionHead>
          <LegendItem
            swatch={
              <div
                style={{
                  width: 12,
                  height: 12,
                  flexShrink: 0,
                  background: 'rgba(220, 200, 30, 0.35)',
                  border: '1px solid rgba(220, 200, 30, 0.5)',
                  borderRadius: 1,
                }}
              />
            }
            label="Low spoofing (yellow tint)"
          />
          <LegendItem
            swatch={
              <div
                style={{
                  width: 12,
                  height: 12,
                  flexShrink: 0,
                  background: 'rgba(220, 50, 30, 0.45)',
                  border: '1px solid rgba(220, 50, 30, 0.6)',
                  borderRadius: 1,
                }}
              />
            }
            label="High jamming (red tint)"
          />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          pointerEvents: 'all',
          background: open ? 'rgba(0, 255, 100, 0.12)' : 'rgba(8, 12, 18, 0.93)',
          border: '1px solid rgba(0, 255, 100, 0.3)',
          borderRadius: 4,
          color: 'rgba(0, 255, 100, 0.9)',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          padding: '5px 10px',
          cursor: 'pointer',
          userSelect: 'none',
          textTransform: 'uppercase' as const,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 100, 0.18)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 255, 100, 0.55)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = open
            ? 'rgba(0, 255, 100, 0.12)'
            : 'rgba(8, 12, 18, 0.93)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 255, 100, 0.3)';
        }}
        title={open ? 'Collapse map key' : 'Expand map key'}
        aria-label={open ? 'Collapse map key' : 'Expand map key'}
      >
        {open ? 'MAP KEY ▲' : 'MAP KEY ▼'}
      </button>
    </div>
  );
};

export default Legend;
