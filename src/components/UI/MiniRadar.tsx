import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MiniRadarProps {
  aircraft: Array<{ lat: number; lng: number; isMilitary: boolean }>;
  ships: Array<{ lat: number; lng: number; type: string }>;
  satellites: Array<{ lat: number; lng: number; category: string }>;
  conflictZones: Array<{ geoJSON: { geometry: { coordinates: unknown; type: string } }; intensity: string }>;
  visible: boolean;
  onToggle: () => void;
}

const CANVAS_SIZE = 140;
const CENTER = CANVAS_SIZE / 2;
const RADIUS = CENTER - 4;

// Simplified world coastline approximation as line segments [lng, lat]
// A minimal set of points to suggest continental outlines
const WORLD_OUTLINE_SEGMENTS: Array<Array<[number, number]>> = [
  // North America west coast
  [[-168, 60], [-166, 64], [-162, 60], [-155, 59], [-138, 57], [-130, 48], [-124, 46], [-120, 34], [-117, 32], [-105, 20], [-90, 15], [-83, 8]],
  // North America east coast
  [[-67, 45], [-70, 42], [-74, 40], [-75, 38], [-77, 34], [-80, 32], [-82, 30], [-81, 25]],
  // South America west
  [[-77, 8], [-80, 0], [-80, -5], [-77, -10], [-75, -15], [-72, -20], [-70, -25], [-70, -30], [-72, -40], [-75, -45], [-72, -50], [-68, -55]],
  // South America east
  [[-35, -5], [-38, -12], [-40, -20], [-43, -23], [-48, -28], [-50, -30], [-52, -34], [-54, -38], [-57, -40], [-64, -42], [-66, -55]],
  // Europe west
  [[0, 51], [-2, 49], [-5, 48], [-9, 44], [-9, 38], [-5, 36]],
  // Europe north
  [[5, 58], [8, 56], [10, 56], [12, 55], [14, 55], [18, 60], [20, 63], [25, 65], [28, 70], [30, 69]],
  // Scandinavia
  [[5, 57], [6, 58], [5, 60], [6, 63], [8, 63], [14, 66], [18, 69], [20, 70], [28, 71]],
  // Africa west
  [[-5, 36], [-6, 33], [-8, 28], [-13, 24], [-17, 15], [-15, 10], [-14, 5], [-8, 5], [0, 5]],
  // Africa east
  [[38, 12], [42, 10], [45, 11], [50, 12], [48, 8], [45, 2], [40, -4], [40, -10], [38, -18], [35, -25], [32, -30], [27, -35]],
  // Africa south
  [[27, -35], [20, -34], [18, -34], [16, -32], [17, -28], [12, -17], [9, -5], [5, 4]],
  // Middle East / Arabian Peninsula
  [[35, 36], [36, 30], [38, 22], [40, 16], [43, 12], [48, 12], [55, 22], [58, 22], [60, 24], [58, 26], [56, 24]],
  // South Asia
  [[60, 24], [62, 22], [65, 22], [68, 22], [72, 20], [77, 8], [80, 8], [80, 11], [78, 14], [80, 16], [82, 14], [85, 22], [88, 22], [92, 22], [95, 22]],
  // Southeast Asia
  [[95, 22], [100, 14], [100, 4], [104, 2], [106, 2], [108, 4], [110, 8], [115, 5], [118, 5], [120, 8], [122, 12]],
  // China/East Asia coast
  [[110, 18], [112, 22], [116, 24], [120, 26], [122, 28], [122, 32], [120, 32], [118, 34], [120, 36], [120, 38], [122, 38], [122, 42], [125, 44], [130, 48]],
  // Japan
  [[130, 31], [132, 33], [134, 34], [135, 35], [136, 36], [137, 37], [136, 38], [140, 38], [141, 40], [142, 42], [143, 44], [142, 45]],
  // Russia/Siberia outline (simplified)
  [[30, 70], [35, 70], [40, 68], [50, 68], [60, 68], [70, 68], [80, 68], [90, 68], [100, 68], [110, 68], [120, 68], [130, 66], [135, 62], [140, 58], [142, 52], [142, 48], [140, 46], [132, 44], [130, 42]],
  // Australia
  [[115, -22], [114, -26], [114, -30], [116, -34], [118, -36], [122, -34], [126, -34], [130, -32], [135, -35], [138, -36], [142, -38], [148, -40], [150, -38], [152, -28], [154, -24], [152, -22], [148, -18], [144, -14], [140, -12], [136, -12], [130, -12], [126, -14], [122, -18], [118, -20], [116, -22]],
  // Greenland (simplified)
  [[-20, 60], [-18, 64], [-16, 68], [-18, 72], [-22, 76], [-30, 78], [-40, 82], [-50, 80], [-55, 76], [-52, 72], [-44, 68], [-44, 64], [-42, 60], [-38, 58], [-32, 58], [-25, 60], [-20, 60]],
];

function latLngToCanvas(lat: number, lng: number): { x: number; y: number } {
  // Map lat/lng to a rectangular [0..1] space, then project onto circle
  const nx = (lng + 180) / 360; // 0..1
  const ny = (90 - lat) / 180;  // 0..1

  // Map to [-1..1] centered
  const cx = nx * 2 - 1;
  const cy = ny * 2 - 1;

  // Scale to fit inside radar radius
  const x = CENTER + cx * RADIUS;
  const y = CENTER + cy * RADIUS;

  return { x, y };
}

function isInsideCircle(x: number, y: number): boolean {
  const dx = x - CENTER;
  const dy = y - CENTER;
  return Math.sqrt(dx * dx + dy * dy) <= RADIUS;
}

function drawRadar(
  ctx: CanvasRenderingContext2D,
  aircraft: MiniRadarProps['aircraft'],
  ships: MiniRadarProps['ships'],
  satellites: MiniRadarProps['satellites'],
  conflictZones: MiniRadarProps['conflictZones']
) {
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Background circle fill
  ctx.save();
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#010d1f';
  ctx.fill();
  ctx.restore();

  // Clip everything to the radar circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  ctx.clip();

  // Draw world outline segments
  ctx.strokeStyle = 'rgba(0, 180, 100, 0.25)';
  ctx.lineWidth = 0.6;
  for (const segment of WORLD_OUTLINE_SEGMENTS) {
    if (segment.length < 2) continue;
    ctx.beginPath();
    let started = false;
    for (const [lng, lat] of segment) {
      const { x, y } = latLngToCanvas(lat, lng);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  // Draw conflict zones
  for (const zone of conflictZones) {
    try {
      const geo = zone.geoJSON?.geometry;
      if (!geo) continue;
      const isHigh = zone.intensity === 'high';
      const color = isHigh ? 'rgba(255, 30, 30, 0.25)' : 'rgba(255, 140, 0, 0.18)';

      if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
        const [lng, lat] = geo.coordinates as number[];
        const { x, y } = latLngToCanvas(lat, lng);
        if (isInsideCircle(x, y)) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      } else if (
        (geo.type === 'Polygon' || geo.type === 'MultiPolygon') &&
        Array.isArray(geo.coordinates)
      ) {
        // Compute centroid from first ring
        let coords: number[][] = [];
        if (geo.type === 'Polygon') {
          coords = (geo.coordinates as number[][][])[0] ?? [];
        } else {
          coords = ((geo.coordinates as number[][][][])[0]?.[0]) ?? [];
        }
        if (coords.length > 0) {
          let sumLng = 0, sumLat = 0;
          for (const c of coords) { sumLng += c[0]; sumLat += c[1]; }
          const avgLng = sumLng / coords.length;
          const avgLat = sumLat / coords.length;
          const { x, y } = latLngToCanvas(avgLat, avgLng);
          if (isInsideCircle(x, y)) {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
          }
        }
      }
    } catch {
      // skip malformed zone
    }
  }

  // Draw ships
  for (const ship of ships) {
    const { x, y } = latLngToCanvas(ship.lat, ship.lng);
    if (!isInsideCircle(x, y)) continue;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8c00';
    ctx.fill();
  }

  // Draw aircraft
  for (const ac of aircraft) {
    const { x, y } = latLngToCanvas(ac.lat, ac.lng);
    if (!isInsideCircle(x, y)) continue;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = ac.isMilitary ? '#ff3333' : '#3399ff';
    ctx.fill();
  }

  // Draw satellites - hidden
  // for (const sat of satellites) {
  //   const { x, y } = latLngToCanvas(sat.lat, sat.lng);
  //   if (!isInsideCircle(x, y)) continue;
  //   const isMilSat = sat.category?.toLowerCase().includes('mil') ||
  //                    sat.category?.toLowerCase().includes('recon') ||
  //                    sat.category?.toLowerCase().includes('spy') ||
  //                    sat.category?.toLowerCase().includes('surveillance');
  //   ctx.beginPath();
  //   ctx.arc(x, y, 1.2, 0, Math.PI * 2);
  //   ctx.fillStyle = isMilSat ? '#ff3333' : '#00cc44';
  //   ctx.fill();
  // }

  ctx.restore(); // end clip

  // Draw concentric range rings
  ctx.save();
  const ringCount = 4;
  for (let i = 1; i <= ringCount; i++) {
    const r = (RADIUS / ringCount) * i;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
    ctx.strokeStyle = i === ringCount ? 'rgba(0, 220, 100, 0.55)' : 'rgba(0, 220, 100, 0.18)';
    ctx.lineWidth = i === ringCount ? 1.2 : 0.6;
    ctx.stroke();
  }
  ctx.restore();

  // Draw crosshair lines
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 220, 100, 0.15)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  // Horizontal
  ctx.beginPath();
  ctx.moveTo(CENTER - RADIUS, CENTER);
  ctx.lineTo(CENTER + RADIUS, CENTER);
  ctx.stroke();
  // Vertical
  ctx.beginPath();
  ctx.moveTo(CENTER, CENTER - RADIUS);
  ctx.lineTo(CENTER, CENTER + RADIUS);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Tick marks on outer ring
  ctx.save();
  const tickCount = 36;
  for (let i = 0; i < tickCount; i++) {
    const angle = (i / tickCount) * Math.PI * 2;
    const isMajor = i % 9 === 0;
    const innerR = isMajor ? RADIUS - 5 : RADIUS - 3;
    const x1 = CENTER + Math.cos(angle) * innerR;
    const y1 = CENTER + Math.sin(angle) * innerR;
    const x2 = CENTER + Math.cos(angle) * RADIUS;
    const y2 = CENTER + Math.sin(angle) * RADIUS;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = isMajor ? 'rgba(0, 220, 100, 0.7)' : 'rgba(0, 220, 100, 0.35)';
    ctx.lineWidth = isMajor ? 1.2 : 0.6;
    ctx.stroke();
  }
  ctx.restore();

  // Center dot
  ctx.save();
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 220, 100, 0.8)';
  ctx.fill();
  ctx.restore();
}

const MiniRadar: React.FC<MiniRadarProps> = ({
  aircraft,
  ships,
  satellites,
  conflictZones,
  visible,
  onToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [sweepAngle, setSweepAngle] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const lastDrawRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawRadar(ctx, aircraft, ships, satellites, conflictZones);
  }, [aircraft, ships, satellites, conflictZones]);

  // Sweep animation + periodic redraw
  useEffect(() => {
    if (minimized || !visible) return;

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Rotate sweep every frame (~12 seconds per full rotation)
      const angle = ((elapsed % 12000) / 12000) * 360;
      setSweepAngle(angle);

      // Redraw canvas every 2 seconds
      if (timestamp - lastDrawRef.current > 2000) {
        draw();
        lastDrawRef.current = timestamp;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Initial draw immediately
    draw();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [minimized, visible, draw]);

  const handleToggle = () => {
    setMinimized((prev) => !prev);
    onToggle();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        width: 160,
        userSelect: 'none',
      }}
    >
      {/* Header bar */}
      <div
        onClick={handleToggle}
        style={{
          background: 'rgba(8, 14, 28, 0.8)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(60, 180, 255, 0.15)',
          borderBottom: minimized ? '1px solid rgba(60, 180, 255, 0.15)' : 'none',
          borderRadius: minimized ? 8 : '8px 8px 0 0',
          padding: '3px 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            color: '#3CB8FF',
            fontSize: 9,
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Radar Overview
        </span>
        <span
          style={{
            color: 'rgba(60, 184, 255, 0.7)',
            fontSize: 9,
            fontFamily: "'Rajdhani', sans-serif",
            lineHeight: 1,
          }}
        >
          {minimized ? '▲' : '▼'}
        </span>
      </div>

      {/* Radar body */}
      {!minimized && (
        <div
          style={{
            width: 160,
            height: 160,
            background: 'rgba(8, 14, 28, 0.8)',
            border: '1px solid rgba(60, 180, 255, 0.15)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Canvas layer */}
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{
              position: 'absolute',
              top: (160 - CANVAS_SIZE) / 2,
              left: (160 - CANVAS_SIZE) / 2,
              borderRadius: '50%',
            }}
          />

          {/* Sweep overlay — CSS conic gradient rotating */}
          <div
            style={{
              position: 'absolute',
              top: (160 - CANVAS_SIZE) / 2,
              left: (160 - CANVAS_SIZE) / 2,
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              borderRadius: '50%',
              background: `conic-gradient(
                from ${sweepAngle}deg,
                rgba(0, 220, 100, 0.18) 0deg,
                rgba(0, 220, 100, 0.06) 20deg,
                transparent 40deg,
                transparent 360deg
              )`,
              pointerEvents: 'none',
            }}
          />

          {/* Outer bezel overlay ring */}
          <div
            style={{
              position: 'absolute',
              top: (160 - CANVAS_SIZE) / 2,
              left: (160 - CANVAS_SIZE) / 2,
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              borderRadius: '50%',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8), 0 0 8px rgba(0, 220, 100, 0.15)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Legend */}
      {!minimized && (
        <div
          style={{
            background: 'rgba(8, 14, 28, 0.8)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(60, 180, 255, 0.15)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '4px 8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '3px 8px',
          }}
        >
          {[
            { color: '#3399ff', label: 'Civil AC' },
            { color: '#ff3333', label: 'Mil AC' },
            { color: '#ff8c00', label: 'Ships' },
            // { color: '#00cc44', label: 'Sat' },        // hidden
            // { color: '#ff3333', label: 'Mil Sat', dashed: true },  // hidden
          ].map(({ color, label }) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: 3 }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: color,
                  opacity: 1,
                  boxShadow: undefined,
                }}
              />
              <span
                style={{
                  color: '#8BA4BE',
                  fontSize: 8,
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MiniRadar;
