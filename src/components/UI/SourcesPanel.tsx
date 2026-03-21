import React, { useEffect, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SourcesPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface DataSource {
  icon: string;
  category: string;
  source: string;
  url?: string;
  refresh?: string;
  coverage?: string;
  license?: string;
  notes?: string;
}

// ── Source Data ───────────────────────────────────────────────────────────────

const DATA_SOURCES: DataSource[] = [
  {
    icon: '\u2708',
    category: 'Aircraft (ADS-B)',
    source: 'OpenSky Network',
    url: 'https://opensky-network.org',
    refresh: 'Every 15 seconds',
    coverage: 'Global, 1,200+ aircraft',
    license: 'Free tier / CC-BY-SA',
  },
  {
    icon: '\uD83D\uDEA2',
    category: 'Vessels (AIS)',
    source: 'AISHub / Simulated fallback',
    url: 'https://www.aishub.net',
    refresh: 'Every 60 seconds',
    coverage: 'Major shipping lanes',
  },
  {
    icon: '\uD83D\uDEF0',
    category: 'Satellites (TLE)',
    source: 'CelesTrak / NORAD',
    url: 'https://celestrak.org',
    refresh: 'Every 5 minutes',
    license: 'Public domain',
  },
  {
    icon: '\u2694',
    category: 'Conflict Data',
    source: 'ACLED (Armed Conflict Location & Event Data)',
    url: 'https://acleddata.com',
    refresh: 'Static / Daily updates',
    notes: 'Casualties: UN OHCHR, WHO, OSINT aggregates',
  },
  {
    icon: '\uD83D\uDCE1',
    category: 'GPS Jamming',
    source: 'GPSJam.org / OSINT',
    url: 'https://gpsjam.org',
    refresh: 'Static hotspots',
  },
  {
    icon: '\u2622',
    category: 'Nuclear Facilities',
    source: 'IAEA PRIS Database',
    url: 'https://pris.iaea.org',
  },
  {
    icon: '\uD83C\uDFAF',
    category: 'Military Bases',
    source: 'OSINT / Public records',
    notes: 'Locations compiled from open-source intelligence',
  },
  {
    icon: '\u26A1',
    category: 'Energy Infrastructure',
    source: 'IEA / EIA / OSINT',
    notes: 'International Energy Agency, US Energy Information Administration',
  },
  {
    icon: '\uD83C\uDFF4\u200D\u2620\uFE0F',
    category: 'Piracy Data',
    source: 'IMB Piracy Reporting Centre',
    url: 'https://www.icc-ccs.org',
  },
  {
    icon: '\uD83C\uDF0A',
    category: 'Submarine Cables',
    source: 'TeleGeography Submarine Cable Map',
    url: 'https://www.submarinecablemap.com',
  },
  {
    icon: '\uD83D\uDE80',
    category: 'Weapon Ranges',
    source: 'CSIS Missile Defense Project / IISS',
    notes: 'Center for Strategic & International Studies',
  },
  {
    icon: '\uD83C\uDF10',
    category: 'Cyber Threats',
    source: 'Mandiant / CrowdStrike / CISA',
    notes: 'Aggregated threat intelligence feeds',
  },
  {
    icon: '\uD83D\uDCB0',
    category: 'Arms Flows',
    source: 'SIPRI Arms Transfers Database',
    url: 'https://www.sipri.org',
    notes: 'Stockholm International Peace Research Institute',
  },
  {
    icon: '\uD83D\uDC65',
    category: 'Refugee Data',
    source: 'UNHCR Operational Data Portal',
    url: 'https://data.unhcr.org',
    notes: 'UN High Commissioner for Refugees',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

const SourcesPanel: React.FC<SourcesPanelProps> = ({ visible, onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) onCloseRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]);

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
        .sources-panel-card::-webkit-scrollbar {
          width: 4px;
        }
        .sources-panel-card::-webkit-scrollbar-track {
          background: rgba(5, 15, 30, 0.5);
        }
        .sources-panel-card::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 136, 0.3);
          border-radius: 2px;
        }
        .source-card:hover {
          background: rgba(0, 255, 136, 0.06) !important;
          border-color: rgba(0, 255, 136, 0.35) !important;
        }
        .source-link {
          color: #4488cc;
          text-decoration: none;
          font-size: 10px;
          word-break: break-all;
          transition: color 0.15s;
        }
        .source-link:hover {
          color: #66aaee;
          text-decoration: underline;
        }
      `}</style>

      {/* Card */}
      <div
        className="sources-panel-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '580px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: 'rgba(5, 15, 30, 0.95)',
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
            DATA SOURCES
          </h2>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '10px',
              color: 'rgba(150, 180, 170, 0.6)',
              letterSpacing: '1px',
            }}
          >
            Every data point is traceable to its origin
          </p>
        </div>

        {/* Source cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DATA_SOURCES.map((src, i) => (
            <div
              key={`source-${i}`}
              className="source-card"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(0, 255, 136, 0.12)',
                borderRadius: '4px',
                padding: '10px 12px',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {/* Category header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{src.icon}</span>
                <span
                  style={{
                    color: '#d0dce8',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    flex: 1,
                  }}
                >
                  {src.category}
                </span>
                {src.refresh && (
                  <span
                    style={{
                      color: 'rgba(0, 255, 136, 0.5)',
                      fontSize: '8px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      background: 'rgba(0, 255, 136, 0.08)',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      border: '1px solid rgba(0, 255, 136, 0.15)',
                      flexShrink: 0,
                    }}
                  >
                    {src.refresh}
                  </span>
                )}
              </div>

              {/* Details grid */}
              <div style={{ paddingLeft: '22px' }}>
                {/* Source name */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                  <span
                    style={{
                      color: 'rgba(150, 180, 170, 0.5)',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      width: '52px',
                      flexShrink: 0,
                    }}
                  >
                    SOURCE
                  </span>
                  <span style={{ color: '#b0c0cc', fontSize: '10px' }}>
                    {src.source}
                  </span>
                </div>

                {/* URL */}
                {src.url && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                    <span
                      style={{
                        color: 'rgba(150, 180, 170, 0.5)',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        width: '52px',
                        flexShrink: 0,
                      }}
                    >
                      URL
                    </span>
                    <a
                      className="source-link"
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {src.url}
                    </a>
                  </div>
                )}

                {/* Coverage */}
                {src.coverage && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                    <span
                      style={{
                        color: 'rgba(150, 180, 170, 0.5)',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        width: '52px',
                        flexShrink: 0,
                      }}
                    >
                      COVER
                    </span>
                    <span style={{ color: 'rgba(180, 200, 190, 0.65)', fontSize: '10px' }}>
                      {src.coverage}
                    </span>
                  </div>
                )}

                {/* License */}
                {src.license && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                    <span
                      style={{
                        color: 'rgba(150, 180, 170, 0.5)',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        width: '52px',
                        flexShrink: 0,
                      }}
                    >
                      LICENSE
                    </span>
                    <span style={{ color: 'rgba(180, 200, 190, 0.65)', fontSize: '10px' }}>
                      {src.license}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {src.notes && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        color: 'rgba(150, 180, 170, 0.5)',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        width: '52px',
                        flexShrink: 0,
                      }}
                    >
                      NOTE
                    </span>
                    <span style={{ color: 'rgba(180, 200, 190, 0.55)', fontSize: '10px', fontStyle: 'italic' }}>
                      {src.notes}
                    </span>
                  </div>
                )}
              </div>
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
              fontSize: '10px',
              color: '#555',
              letterSpacing: '1px',
            }}
          >
            All data is aggregated from public sources for informational purposes.
          </span>
          <br />
          <span
            style={{
              fontSize: '10px',
              color: '#444',
              letterSpacing: '1px',
            }}
          >
            Press ESC or U to close
          </span>
        </div>
      </div>
    </div>
  );
};

export default SourcesPanel;
