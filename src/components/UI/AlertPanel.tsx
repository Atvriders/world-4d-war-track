import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Alert } from '../../types';

export type { Alert };

interface AlertPanelProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

const TYPE_ICONS: Record<Alert['type'], string> = {
  'gps-jam': '📡',
  'military-aircraft': '✈️',
  'warship': '🚢',
  'conflict-event': '⚔️',
  'satellite-pass': '🛰️',
  'emergency-squawk': '🚨',
  'system': 'ℹ️',
};

const SEVERITY_COLORS: Record<Alert['severity'], string> = {
  critical: '#ff2222',
  warning: '#ff8c00',
  info: '#1e90ff',
};

const SEVERITY_LABELS: Record<Alert['severity'], string> = {
  critical: 'CRITICAL',
  warning: 'WARNING',
  info: 'INFO',
};

const RED_ICON_TYPES = new Set<Alert['type']>(['military-aircraft', 'warship']);

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs) || diffMs < 0) return 'just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return diffSec <= 5 ? 'just now' : `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const SLIDE_IN_KEYFRAMES = `
@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(60px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes criticalPulse {
  0%, 100% {
    background-color: rgba(255, 34, 34, 0.06);
  }
  50% {
    background-color: rgba(255, 34, 34, 0.18);
  }
}
`;

function injectStyles() {
  const id = 'alert-panel-keyframes';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = SLIDE_IN_KEYFRAMES;
    document.head.appendChild(style);
  }
}

interface AlertCardProps {
  alert: Alert;
  isNew: boolean;
  onDismiss: (id: string) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, isNew, onDismiss, onFlyTo }) => {
  const borderColor = SEVERITY_COLORS[alert.severity];
  const isCritical = alert.severity === 'critical';
  const icon = TYPE_ICONS[alert.type];
  const iconRed = RED_ICON_TYPES.has(alert.type);
  const hasFlyTo = alert.lat !== undefined && alert.lng !== undefined;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    borderLeft: `3px solid ${borderColor}`,
    background: isCritical
      ? undefined
      : 'rgba(10, 22, 42, 0.85)',
    backgroundColor: isCritical ? undefined : undefined,
    animation: isNew
      ? `alertSlideIn 0.32s cubic-bezier(0.22,1,0.36,1) both${isCritical ? ', criticalPulse 1.8s ease-in-out infinite' : ''}`
      : isCritical
      ? 'criticalPulse 1.8s ease-in-out infinite'
      : undefined,
    borderRadius: '4px',
    padding: '9px 10px 8px 12px',
    marginBottom: '6px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
    minWidth: 0,
  };

  if (isCritical && !isNew) {
    cardStyle.animationName = 'criticalPulse';
    cardStyle.animationDuration = '1.8s';
    cardStyle.animationTimingFunction = 'ease-in-out';
    cardStyle.animationIterationCount = 'infinite';
  }

  return (
    <div style={cardStyle}>
      {/* Top row: icon + severity badge + dismiss */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span
          style={{
            fontSize: '14px',
            lineHeight: 1,
            filter: iconRed ? 'sepia(1) saturate(8) hue-rotate(0deg)' : undefined,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: borderColor,
            background: `${borderColor}22`,
            border: `1px solid ${borderColor}55`,
            borderRadius: '2px',
            padding: '1px 5px',
            flexShrink: 0,
          }}
        >
          {SEVERITY_LABELS[alert.severity]}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(160, 185, 220, 0.55)',
            marginLeft: 'auto',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {formatTimeAgo(alert.timestamp)}
        </span>
      </div>

      {/* Message */}
      <div
        style={{
          fontSize: '12px',
          color: 'rgba(200, 220, 245, 0.92)',
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}
      >
        {alert.message}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
        {hasFlyTo && (
          <button
            onClick={() => onFlyTo(alert.lat!, alert.lng!)}
            style={{
              background: 'rgba(30, 144, 255, 0.15)',
              border: '1px solid rgba(30, 144, 255, 0.4)',
              color: 'rgba(120, 190, 255, 0.9)',
              borderRadius: '3px',
              padding: '3px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30, 144, 255, 0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30, 144, 255, 0.15)')}
          >
            📍 Fly To
          </button>
        )}
        <button
          onClick={() => onDismiss(alert.id)}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'rgba(180, 200, 225, 0.65)',
            borderRadius: '3px',
            padding: '3px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 80, 80, 0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  );
};

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onDismiss, onFlyTo }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set());
  const prevAlertIdsRef = useRef<Set<string>>(new Set());
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Inject CSS keyframes once
  useEffect(() => {
    injectStyles();
  }, []);

  // Track new alert ids for slide-in animation
  useEffect(() => {
    const activeIds = new Set(alerts.filter(a => !a.dismissed).map(a => a.id));
    const incoming = new Set<string>();
    activeIds.forEach(id => {
      if (!prevAlertIdsRef.current.has(id)) {
        incoming.add(id);
      }
    });
    prevAlertIdsRef.current = activeIds;

    if (incoming.size > 0) {
      setNewAlertIds(prev => {
        const next = new Set(prev);
        incoming.forEach(id => next.add(id));
        return next;
      });

      // Auto-expand if a new critical alert arrives
      const hasCritical = alerts.some(a => incoming.has(a.id) && a.severity === 'critical');
      if (hasCritical) {
        setCollapsed(false);
      }

      // Remove "new" flag after animation completes
      const timer = setTimeout(() => {
        setNewAlertIds(prev => {
          const next = new Set(prev);
          incoming.forEach(id => next.delete(id));
          return next;
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [alerts]);

  // Auto-dismiss info alerts after 30s
  useEffect(() => {
    const infoAlerts = alerts.filter(a => !a.dismissed && a.severity === 'info');

    infoAlerts.forEach(alert => {
      if (!dismissTimersRef.current.has(alert.id)) {
        const timer = setTimeout(() => {
          onDismiss(alert.id);
          dismissTimersRef.current.delete(alert.id);
        }, 30000);
        dismissTimersRef.current.set(alert.id, timer);
      }
    });

    // Clear timers for dismissed or removed alerts
    dismissTimersRef.current.forEach((timer, id) => {
      const still = alerts.find(a => a.id === id && !a.dismissed && a.severity === 'info');
      if (!still) {
        clearTimeout(timer);
        dismissTimersRef.current.delete(id);
      }
    });
  }, [alerts, onDismiss]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      dismissTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const activeAlerts = alerts.filter(a => !a.dismissed).slice(0, 8);
  const totalCount = activeAlerts.length;

  const handleDismissAll = useCallback(() => {
    activeAlerts.forEach(a => onDismiss(a.id));
  }, [activeAlerts, onDismiss]);

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '126px',
    right: '8px',
    width: collapsed ? 'auto' : '320px',
    maxWidth: 'calc(100vw - 48px)',
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    fontFamily: '"Share Tech Mono", "Courier New", monospace',
    transition: 'width 0.2s ease',
  };

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;

  const headerStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.97)',
    border: '1px solid rgba(255, 100, 0, 0.4)',
    borderBottom: collapsed ? undefined : '1px solid rgba(255, 100, 0, 0.22)',
    borderRadius: collapsed ? '6px' : '6px 6px 0 0',
    padding: collapsed ? '6px 12px' : '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const bodyStyle: React.CSSProperties = {
    background: 'rgba(5, 15, 30, 0.93)',
    border: '1px solid rgba(255, 100, 0, 0.4)',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    maxHeight: '400px',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 8px 4px 8px',
    display: 'flex',
    flexDirection: 'column',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255, 100, 0, 0.3) transparent',
  };

  return (
    <div style={panelStyle}>
      {/* Header / collapsed badge */}
      <div style={headerStyle} onClick={() => setCollapsed(c => !c)}>
        {collapsed ? (
          /* Compact badge when collapsed */
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: totalCount > 0 ? 'rgba(255, 160, 60, 0.95)' : 'rgba(120, 150, 190, 0.6)', letterSpacing: '0.06em' }}>
              ⚠ {totalCount} {totalCount === 1 ? 'alert' : 'alerts'}
            </span>
            {criticalCount > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  background: 'rgba(255, 34, 34, 0.8)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '1px 6px',
                }}
              >
                {criticalCount} critical
              </span>
            )}
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(160, 185, 220, 0.5)',
                lineHeight: 1,
                transform: 'rotate(-90deg)',
                display: 'inline-block',
                marginLeft: '4px',
              }}
            >
              ▼
            </span>
          </div>
        ) : (
          /* Full header when expanded */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255, 160, 60, 0.95)', letterSpacing: '0.06em' }}>
                ⚠ ALERTS
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: totalCount > 0 ? 'rgba(255, 60, 60, 0.8)' : 'rgba(80, 110, 150, 0.5)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  minWidth: '20px',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                }}
              >
                {totalCount}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {totalCount > 0 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    activeAlerts.forEach(a => onDismiss(a.id));
                  }}
                  style={{
                    background: 'rgba(255, 80, 60, 0.12)',
                    border: '1px solid rgba(255, 80, 60, 0.3)',
                    color: 'rgba(255, 140, 120, 0.85)',
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 80, 60, 0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 80, 60, 0.12)')}
                >
                  Clear All
                </button>
              )}
              <span
                style={{
                  fontSize: '12px',
                  color: 'rgba(160, 185, 220, 0.5)',
                  lineHeight: 1,
                  transition: 'transform 0.2s',
                  transform: 'rotate(0deg)',
                  display: 'inline-block',
                }}
              >
                ▼
              </span>
            </div>
          </>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={bodyStyle}>
          {totalCount === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(120, 150, 190, 0.45)',
                fontSize: '12px',
                padding: '24px 0',
                letterSpacing: '0.04em',
              }}
            >
              No active alerts
            </div>
          ) : (
            activeAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isNew={newAlertIds.has(alert.id)}
                onDismiss={onDismiss}
                onFlyTo={onFlyTo}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
