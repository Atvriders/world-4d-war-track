import React, { useEffect } from 'react';

interface KeyboardHelpProps {
  visible: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  key: string;
  action: string;
}

interface Section {
  title: string;
  rows: ShortcutRow[];
}

const SECTIONS: Section[] = [
  {
    title: 'LAYERS',
    rows: [
      { key: 'S', action: 'Toggle Satellites' },
      { key: 'A', action: 'Toggle Aircraft' },
      { key: 'V', action: 'Toggle Ships (Vessels)' },
      { key: 'W', action: 'Toggle War Zones' },
      { key: 'J', action: 'Toggle GPS Jamming' },
      { key: 'O', action: 'Toggle Orbital Paths' },
      { key: 'N', action: 'Toggle Nuclear Sites' },
      { key: 'B', action: 'Toggle Military Bases' },
      { key: 'C', action: 'Toggle Sea Cables' },
      { key: 'R', action: 'Toggle Refugee Flows' },
      { key: 'P', action: 'Toggle Piracy Zones' },
      { key: 'D', action: 'Toggle Drone Activity' },
      { key: 'T', action: 'Toggle Threat Rings' },
      { key: 'X', action: 'Toggle Cyber Threats' },
      { key: 'K', action: 'Toggle Chokepoints' },
    ],
  },
  {
    title: 'TIME CONTROL',
    rows: [
      { key: 'Space', action: 'Play/Pause time' },
      { key: '← / →', action: '-15 / +15 minutes' },
      { key: '0', action: 'Reset to Now (live)' },
    ],
  },
  {
    title: 'PANELS',
    rows: [
      { key: 'I', action: 'Toggle War Impact Panel' },
      { key: 'Y', action: 'Toggle Economy Panel' },
      { key: 'U', action: 'Toggle Data Sources' },
    ],
  },
  {
    title: 'INTERFACE',
    rows: [
      { key: '? or H', action: 'Show this help' },
      { key: 'Escape', action: 'Close panel / deselect' },
      { key: 'F', action: 'Toggle fullscreen' },
    ],
  },
];

const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ visible, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.key === 'h' && !e.ctrlKey && !e.metaKey)) {
        if (document.activeElement?.tagName !== 'INPUT') {
          onClose();
        }
      }
      if (e.key === 'Escape' && visible) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      <style>{`
        .kb-help-card::-webkit-scrollbar {
          width: 4px;
        }
        .kb-help-card::-webkit-scrollbar-track {
          background: rgba(8, 14, 28, 0.5);
        }
        .kb-help-card::-webkit-scrollbar-thumb {
          background: rgba(60, 180, 255, 0.3);
          border-radius: 2px;
        }
        .kb-section-title {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 600;
          font-variant: small-caps;
          letter-spacing: 2px;
          font-size: 11px;
          color: #3CB8FF;
          margin: 0 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(60, 180, 255, 0.12);
        }
      `}</style>

      {/* Card — stop propagation so clicking inside doesn't close */}
      <div
        className="kb-help-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '500px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: 'rgba(8, 14, 28, 0.9)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(60, 180, 255, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 0 30px rgba(60, 180, 255, 0.08), 0 0 60px rgba(0, 0, 0, 0.8)',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Title */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(60, 180, 255, 0.15)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontFamily: "'Rajdhani', sans-serif",
              color: '#3CB8FF',
              letterSpacing: '3px',
              fontWeight: 700,
            }}
          >
            ⌨ KEYBOARD SHORTCUTS
          </h2>
        </div>

        {/* Sections */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
          }}
        >
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="kb-section-title">{section.title}</p>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}
              >
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.key}>
                      <td
                        style={{
                          paddingBottom: '6px',
                          paddingRight: '12px',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <kbd
                          style={{
                            background: 'rgba(60, 180, 255, 0.1)',
                            border: '1px solid rgba(60, 180, 255, 0.25)',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            fontSize: '11px',
                            color: '#3CB8FF',
                            fontFamily: "'Share Tech Mono', monospace",
                            display: 'inline-block',
                          }}
                        >
                          {row.key}
                        </kbd>
                      </td>
                      <td
                        style={{
                          paddingBottom: '6px',
                          color: '#8BA4BE',
                          fontSize: '12px',
                          fontFamily: "'Rajdhani', sans-serif",
                          verticalAlign: 'middle',
                        }}
                      >
                        {row.action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(60, 180, 255, 0.12)',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontFamily: "'Rajdhani', sans-serif",
              color: '#4A6480',
              letterSpacing: '1px',
            }}
          >
            Press ESC or ? to close
          </span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelp;
