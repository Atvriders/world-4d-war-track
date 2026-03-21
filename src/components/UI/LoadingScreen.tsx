import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  progress: number;
  status: string;
  isVisible: boolean;
}

const LOG_LINES = [
  '> Initializing satellite tracking systems...',
  '> Loading TLE orbital data from CelesTrak...',
  '> Connecting to OpenSky ADS-B network...',
  '> Loading conflict zone database (12 active conflicts)...',
  '> Parsing GPS interference data (15 hotspots)...',
  '> Calibrating geospatial rendering engine...',
  '> System ready.',
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, status, isVisible }) => {
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOG_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setLogLines(prev => [...prev, line]), i * 400));
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000011',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Courier New", Courier, monospace',
      }}
    >
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            text-shadow:
              0 0 8px #00ff41,
              0 0 20px #00ff41,
              0 0 40px #00ff41;
          }
          50% {
            text-shadow:
              0 0 4px #00ff41,
              0 0 10px #00ff41,
              0 0 20px #00ff41;
          }
        }
        @keyframes spinGlobe {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinMeridian {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes progressGlow {
          0%, 100% { box-shadow: 0 0 6px #00ff41, 0 0 12px #00ff41; }
          50% { box-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41; }
        }
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Title block */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '48px',
            color: '#00ff41',
            margin: '0 0 8px 0',
            letterSpacing: '4px',
            animation: 'glowPulse 2s ease-in-out infinite',
          }}
        >
          WORLD 4D WAR TRACK
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#4a4a4a',
            margin: '0 0 6px 0',
            letterSpacing: '3px',
          }}
        >
          GLOBAL CONFLICT INTELLIGENCE SYSTEM
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#cc0000', letterSpacing: '2px' }}>
          CLASSIFICATION: OPEN SOURCE
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '12px',
              backgroundColor: '#cc0000',
              marginLeft: '4px',
              verticalAlign: 'middle',
              animation: 'blink 1s step-end infinite',
            }}
          />
        </p>
      </div>

      {/* Animated globe wireframe */}
      <div
        style={{
          position: 'relative',
          width: '140px',
          height: '140px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer spinning ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#00ff41',
            borderRightColor: '#00ff4155',
            animation: 'spinRing 1.8s linear infinite',
          }}
        />
        {/* Second ring counter-direction */}
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            border: '1px solid transparent',
            borderBottomColor: '#00ff41',
            borderLeftColor: '#00ff4133',
            animation: 'spinRing 2.4s linear infinite reverse',
          }}
        />
        {/* SVG wireframe globe */}
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          style={{ display: 'block' }}
        >
          {/* Outer circle */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#00ff4155" strokeWidth="1" />
          {/* Equator */}
          <ellipse cx="50" cy="50" rx="46" ry="8" fill="none" stroke="#00ff4166" strokeWidth="1" />
          {/* Mid latitudes */}
          <ellipse cx="50" cy="38" rx="38" ry="6" fill="none" stroke="#00ff4144" strokeWidth="0.8" />
          <ellipse cx="50" cy="62" rx="38" ry="6" fill="none" stroke="#00ff4144" strokeWidth="0.8" />
          {/* High latitudes */}
          <ellipse cx="50" cy="26" rx="22" ry="4" fill="none" stroke="#00ff4133" strokeWidth="0.7" />
          <ellipse cx="50" cy="74" rx="22" ry="4" fill="none" stroke="#00ff4133" strokeWidth="0.7" />
          {/* Prime meridian */}
          <ellipse
            cx="50"
            cy="50"
            rx="9"
            ry="46"
            fill="none"
            stroke="#00ff4166"
            strokeWidth="1"
            style={{ transformOrigin: '50px 50px', animation: 'spinGlobe 4s linear infinite' }}
          />
          {/* 90-degree meridian */}
          <ellipse
            cx="50"
            cy="50"
            rx="9"
            ry="46"
            fill="none"
            stroke="#00ff4144"
            strokeWidth="0.8"
            style={{ transformOrigin: '50px 50px', animation: 'spinGlobe 4s linear infinite', animationDelay: '-2s' }}
          />
          {/* Center dot */}
          <circle cx="50" cy="50" r="2" fill="#00ff41" />
        </svg>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '12px', padding: '0 16px', boxSizing: 'border-box' }}>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#00ff41',
              borderRadius: '4px',
              transition: 'width 300ms ease-out',
              animation: 'progressGlow 1.5s ease-in-out infinite',
            }}
          />
        </div>
        <div
          style={{
            textAlign: 'right',
            fontSize: '11px',
            color: '#00ff4199',
            letterSpacing: '1px',
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>

      {/* Status text */}
      <p
        style={{
          fontSize: '13px',
          color: '#555',
          margin: '0 0 24px 0',
          letterSpacing: '1px',
          maxWidth: '400px',
          textAlign: 'center',
          padding: '0 16px',
          minHeight: '20px',
        }}
      >
        {status}
      </p>

      {/* Terminal log */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#050505',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '12px 16px',
          boxSizing: 'border-box',
          marginBottom: '24px',
          minHeight: '140px',
          maxHeight: '160px',
          overflowY: 'auto',
        }}
      >
        {logLines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: '11px',
              color: i === logLines.length - 1 ? '#00ff41' : '#2a5c2a',
              marginBottom: '3px',
              letterSpacing: '0.5px',
              lineHeight: '1.5',
            }}
          >
            {line}
            {i === logLines.length - 1 && (
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '11px',
                  backgroundColor: '#00ff41',
                  marginLeft: '2px',
                  verticalAlign: 'middle',
                  animation: 'blink 1s step-end infinite',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Bottom credits */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: '10px',
            color: '#2a2a2a',
            margin: '0 0 4px 0',
            letterSpacing: '1px',
          }}
        >
          Data: OpenSky Network | CelesTrak | GPSJam.org | ACLED | OSINT
        </p>
        <p
          style={{
            fontSize: '10px',
            color: '#1e1e1e',
            margin: 0,
            letterSpacing: '0.5px',
          }}
        >
          For educational and research purposes only
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
