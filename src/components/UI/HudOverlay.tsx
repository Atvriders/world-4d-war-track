import { useState, useEffect, useCallback } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert decimal degrees to DMS string */
function toDMS(dd: number, isLat: boolean): string {
  const dir = isLat ? (dd >= 0 ? 'N' : 'S') : (dd >= 0 ? 'E' : 'W');
  const abs = Math.abs(dd);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(2);
  const dStr = isLat ? String(d).padStart(2, '0') : String(d).padStart(3, '0');
  return `${dStr}°${String(m).padStart(2, '0')}'${s.padStart(5, '0')}"${dir}`;
}

/** Format a Date as UTC timestamp string */
function fmtUTC(d: Date): string {
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, '0');
  const D = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}Z`;
}

// ── Shared styles ────────────────────────────────────────────────────────────

const BASE: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  zIndex: 1100,
  letterSpacing: '0.06em',
  userSelect: 'none',
};

// ── Component ────────────────────────────────────────────────────────────────

interface HudOverlayProps {
  /** Globe ref — used to read current point-of-view */
  globeRef?: React.RefObject<any>;
}

export default function HudOverlay({ globeRef }: HudOverlayProps) {
  const [now, setNow] = useState(() => new Date());
  const [dotVisible, setDotVisible] = useState(true);
  const [lat, setLat] = useState(38);
  const [lng, setLng] = useState(35);

  // ── 1-second tick for timestamp + blinking dot ──────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setDotVisible(v => !v);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── 5-second tick for coordinate refresh (reduces re-renders) ──────────
  useEffect(() => {
    const id = setInterval(() => {
      if (globeRef?.current) {
        try {
          const pov = globeRef.current.pointOfView?.();
          if (pov && typeof pov.lat === 'number') {
            setLat(pov.lat);
            setLng(pov.lng);
          }
        } catch {
          // Globe may not expose getter — keep last known coords
        }
      }
    }, 5000);
    return () => clearInterval(id);
  }, [globeRef]);

  return (
    <>
      {/* ── Top-left: title block (below DeathTollBar 24px + StatusBar 32px = 56px) */}
      <div
        style={{
          ...BASE,
          top: 60,
          left: 52,
          fontSize: '9px',
          lineHeight: '1.4',
          color: 'rgba(60, 180, 255, 0.5)',
          textShadow: '0 0 4px rgba(60, 180, 255, 0.15)',
        }}
      >
        <div style={{ fontFamily: "'Rajdhani', 'Courier New', sans-serif", fontWeight: 700 }}>REAL-TIME INTELLIGENCE</div>
      </div>

      {/* ── Bottom-left: MGRS-style coordinates — moved above ticker/layerbar stack */}
      <div
        style={{
          ...BASE,
          bottom: 114,
          left: 52,
          fontSize: '10px',
          lineHeight: '1.6',
          color: '#3CB8FF',
          opacity: 0.85,
          textShadow: '0 0 6px rgba(60, 184, 255, 0.35)',
        }}
      >
        <div>LAT: {toDMS(lat, true)}</div>
        <div>LNG: {toDMS(lng, false)}</div>
      </div>

      {/* ── Top-right: recording timestamp ─────────────────────────────── */}
      <div
        style={{
          ...BASE,
          top: 60,
          right: 52,
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: '9px',
          color: 'rgba(60, 180, 255, 0.6)',
          textShadow: '0 0 4px rgba(60, 180, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            color: '#ff3333',
            fontSize: '13px',
            lineHeight: 1,
            opacity: dotVisible ? 1 : 0.15,
            transition: 'opacity 0.35s ease',
            textShadow: '0 0 6px rgba(255,50,50,0.6)',
          }}
        >
          ●
        </span>
        <span>REC {fmtUTC(now)}</span>
      </div>
    </>
  );
}
