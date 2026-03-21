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
    title: 'NAVIGATION',
    rows: [
      { key: 'G', action: 'Fly to Global view' },
      { key: 'E', action: 'Fly to Europe' },
      { key: 'M', action: 'Fly to Middle East' },
      { key: 'U', action: 'Fly to Ukraine' },
      { key: 'I', action: 'Fly to Israel/Gaza' },
      { key: 'R', action: 'Fly to Red Sea/Yemen' },
      { key: 'T', action: 'Fly to Taiwan Strait' },
      { key: 'Ctrl+K', action: 'Search' },
    ],
  },
  {
    title: 'LAYERS',
    rows: [
      { key: 'S', action: 'Toggle Satellites' },
      { key: 'A', action: 'Toggle Aircraft' },
      { key: 'V', action: 'Toggle Ships (Vessels)' },
      { key: 'W', action: 'Toggle War Zones' },
      { key: 'J', action: 'Toggle GPS Jamming' },
      { key: 'O', action: 'Toggle Orbital Paths' },
    ],
  },
  {
    title: 'TIME CONTROL',
    rows: [
      { key: 'Space', action: 'Play/Pause time' },
      { key: '← / →', action: '-15 / +15 minutes' },
      { key: '0', action: 'Reset to Now (live)' },
      { key: '+ / -', action: 'Speed up / slow down' },
    ],
  },
  {
    title: 'INTERFACE',
    rows: [
      { key: '? or H', action: 'Show this help' },
      { key: 'Escape', action: 'Close panel / deselect' },
      { key: 'F', action: 'Toggle fullscreen' },
      { key: 'P', action: 'Screenshot (placeholder)' },
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Courier New", Courier, monospace',
      }}
    >
      <style>{`
        .kb-help-card::-webkit-scrollbar {
          width: 4px;
        }
        .kb-help-card::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .kb-help-card::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 136, 0.3);
          border-radius: 2px;
        }
        .kb-section-title {
          font-variant: small-caps;
          letter-spacing: 2px;
          font-size: 11px;
          color: #00ff88;
          margin: 0 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(0, 255, 136, 0.2);
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
          backgroundColor: '#0d0d0d',
          border: '1px solid rgba(0, 255, 136, 0.5)',
          borderRadius: '6px',
          boxShadow: '0 0 30px rgba(0, 255, 136, 0.15), 0 0 60px rgba(0, 0, 0, 0.8)',
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
            borderBottom: '1px solid rgba(0, 255, 136, 0.3)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              color: '#00ff88',
              letterSpacing: '3px',
              fontWeight: 'bold',
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
                            background: 'rgba(0, 255, 136, 0.15)',
                            border: '1px solid rgba(0, 255, 136, 0.4)',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            fontSize: '11px',
                            color: '#00ff88',
                            fontFamily: '"Courier New", Courier, monospace',
                            display: 'inline-block',
                          }}
                        >
                          {row.key}
                        </kbd>
                      </td>
                      <td
                        style={{
                          paddingBottom: '6px',
                          color: '#aaa',
                          fontSize: '12px',
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
            borderTop: '1px solid rgba(0, 255, 136, 0.2)',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#555',
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
