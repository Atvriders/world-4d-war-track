import React, { useState } from 'react';
import { COMMODITIES, TRADE_DISRUPTIONS, CommodityImpact } from '../../data/economyData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EconomyPanelProps {
  visible: boolean;
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "+8.2%" or "+180%" into a number */
function parseChangePercent(s: string): number {
  return parseFloat(s.replace(/[^0-9.\-+]/g, '')) || 0;
}

function trendArrow(trend: CommodityImpact['trend']): string {
  if (trend === 'up') return '\u25B2';   // black up-pointing triangle
  if (trend === 'down') return '\u25BC'; // black down-pointing triangle
  return '\u25C6'; // diamond (stable)
}

function trendColor(trend: CommodityImpact['trend']): string {
  if (trend === 'up') return '#ff4444';
  if (trend === 'down') return '#22cc66';
  return '#e6c200';
}

function changeColor(trend: CommodityImpact['trend']): string {
  // red for up (costs more), green for down (savings)
  if (trend === 'up') return '#ff4444';
  if (trend === 'down') return '#22cc66';
  return '#e6c200';
}

// Max bar width is relative to the largest % change
const maxChange = Math.max(...COMMODITIES.map(c => Math.abs(parseChangePercent(c.priceChange))));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EconomyPanel: React.FC<EconomyPanelProps> = ({ visible, onToggle }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!visible) return null;

  // ── Styles ──────────────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '120px',
    left: '300px',
    width: '380px',
    maxWidth: 'calc(100vw - 240px)',
    maxHeight: 'calc(100vh - 140px)',
    zIndex: 1200,
    fontFamily: '"Share Tech Mono", "Courier New", monospace',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.97)',
    border: '1px solid rgba(255, 180, 40, 0.45)',
    borderBottom: collapsed ? undefined : '1px solid rgba(255, 180, 40, 0.18)',
    borderRadius: collapsed ? '6px' : '6px 6px 0 0',
    padding: '7px 11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const bodyStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.95)',
    border: '1px solid rgba(255, 180, 40, 0.45)',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 8px 6px 8px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255, 180, 40, 0.22) transparent',
    flex: 1,
    minHeight: 0,
  };

  // Total GDP loss estimate
  const gdpLoss = '$1.7T';

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle} onClick={() => setCollapsed(c => !c)} title="Toggle Economy Panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'rgba(255, 200, 80, 0.95)',
              letterSpacing: '0.06em',
            }}
          >
            GLOBAL ECONOMY IMPACT
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              background: 'rgba(255, 80, 40, 0.55)',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 6px',
              minWidth: '18px',
              textAlign: 'center',
            }}
          >
            -{gdpLoss} GDP
          </span>
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(140, 170, 200, 0.45)',
              letterSpacing: '0.04em',
            }}
          >
            [Y]
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <button
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              background: 'rgba(255, 180, 40, 0.10)',
              border: '1px solid rgba(255, 180, 40, 0.30)',
              color: 'rgba(255, 200, 120, 0.75)',
              borderRadius: '3px',
              padding: '1px 6px',
              fontSize: '10px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 180, 40, 0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 180, 40, 0.10)')}
            title="Hide panel"
          >
            X
          </button>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(120, 170, 220, 0.5)',
              lineHeight: 1,
              transition: 'transform 0.2s',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          >
            ^
          </span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={bodyStyle}>
          {/* Subtitle */}
          <div
            style={{
              fontSize: '9px',
              color: 'rgba(255, 180, 80, 0.60)',
              letterSpacing: '0.10em',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            CONFLICT-AFFECTED COMMODITIES &amp; TRADE ROUTES
          </div>

          {/* Commodity cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {COMMODITIES.map((commodity, idx) => {
              const pctAbs = Math.abs(parseChangePercent(commodity.priceChange));
              const barWidth = maxChange > 0 ? (pctAbs / maxChange) * 100 : 0;
              const isExpanded = expandedIdx === idx;

              return (
                <div
                  key={`commodity-${commodity.name}`}
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  style={{
                    background: 'rgba(8, 20, 45, 0.85)',
                    border: '1px solid rgba(255, 180, 40, 0.18)',
                    borderLeft: `3px solid ${changeColor(commodity.trend)}`,
                    borderRadius: '4px',
                    padding: '8px 10px 7px 10px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Top row: icon + name + price + change */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>{commodity.icon}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'rgba(220, 235, 255, 0.95)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {commodity.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'rgba(200, 220, 240, 0.85)',
                        }}
                      >
                        {commodity.globalPrice}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: changeColor(commodity.trend),
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span style={{ fontSize: '8px' }}>{trendArrow(commodity.trend)}</span>
                        {commodity.priceChange}
                      </span>
                    </div>
                  </div>

                  {/* Mini bar chart */}
                  <div
                    style={{
                      marginTop: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '8px', color: 'rgba(140, 170, 200, 0.50)', width: '36px', flexShrink: 0 }}>
                      {commodity.unit}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: '5px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(barWidth, 100)}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${trendColor(commodity.trend)}88, ${trendColor(commodity.trend)})`,
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Affected-by tags */}
                  <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {commodity.affectedBy.map(conflict => (
                      <span
                        key={conflict}
                        style={{
                          fontSize: '8px',
                          color: 'rgba(255, 180, 120, 0.70)',
                          background: 'rgba(255, 120, 40, 0.12)',
                          border: '1px solid rgba(255, 120, 40, 0.20)',
                          borderRadius: '2px',
                          padding: '1px 4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conflict}
                      </span>
                    ))}
                  </div>

                  {/* Expandable details */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '6px 8px',
                        background: 'rgba(255, 180, 40, 0.05)',
                        border: '1px solid rgba(255, 180, 40, 0.15)',
                        borderRadius: '3px',
                        fontSize: '9px',
                        color: 'rgba(180, 200, 230, 0.75)',
                        lineHeight: 1.5,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {commodity.details}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Separator */}
          <div
            style={{
              borderTop: '1px solid rgba(255, 180, 40, 0.25)',
              margin: '10px 0 8px 0',
            }}
          />

          {/* Trade Route Disruptions */}
          <div
            style={{
              fontSize: '9px',
              color: 'rgba(255, 180, 80, 0.60)',
              letterSpacing: '0.10em',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            TRADE ROUTE DISRUPTIONS
          </div>

          <div
            style={{
              background: 'rgba(8, 20, 45, 0.85)',
              border: '1px solid rgba(255, 180, 40, 0.18)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 0.7fr 0.7fr 0.7fr',
                gap: '4px',
                padding: '5px 8px',
                background: 'rgba(255, 180, 40, 0.08)',
                borderBottom: '1px solid rgba(255, 180, 40, 0.15)',
              }}
            >
              {['Route', 'Normal', 'Current', 'Cost'].map(h => (
                <span
                  key={h}
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    color: 'rgba(255, 200, 120, 0.65)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Table rows */}
            {TRADE_DISRUPTIONS.map((td, i) => {
              const isSuspended = td.currentTransit === 'Suspended' || td.currentTransit === 'Destroyed';
              return (
                <div
                  key={td.route}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 0.7fr 0.7fr 0.7fr',
                    gap: '4px',
                    padding: '5px 8px',
                    borderBottom: i < TRADE_DISRUPTIONS.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'rgba(220, 235, 255, 0.90)',
                        lineHeight: 1.3,
                      }}
                    >
                      {td.route}
                    </span>
                    <span
                      style={{
                        fontSize: '8px',
                        color: 'rgba(255, 120, 80, 0.55)',
                      }}
                    >
                      {td.cause} | {td.volumeAffected}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'rgba(140, 170, 200, 0.60)',
                      alignSelf: 'center',
                    }}
                  >
                    {td.normalTransit}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: isSuspended ? '#ff2222' : '#ff8c00',
                      alignSelf: 'center',
                    }}
                  >
                    {td.currentTransit}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: td.addedCost === 'N/A' ? 'rgba(140, 170, 200, 0.50)' : '#ff4444',
                      alignSelf: 'center',
                    }}
                  >
                    {td.addedCost}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div
            style={{
              marginTop: '8px',
              background: 'rgba(255, 180, 40, 0.05)',
              border: '1px solid rgba(255, 180, 40, 0.20)',
              borderRadius: '3px',
              padding: '5px 8px',
              fontSize: '9px',
              color: 'rgba(255, 180, 100, 0.55)',
              lineHeight: 1.4,
              letterSpacing: '0.02em',
            }}
          >
            Prices approximate. Conflict-driven changes since baseline. Click commodity for details.
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomyPanel;
