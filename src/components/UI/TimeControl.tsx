import React, { useEffect } from 'react';

interface TimeControlProps {
  timeOffset: number;
  isPlaying: boolean;
  playSpeed: number;
  onTimeOffsetChange: (offset: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 60];
const MIN_OFFSET = -180;
const MAX_OFFSET = 360;

function formatTimeDisplay(offset: number): string {
  if (offset === 0) return 'NOW (LIVE)';

  const absMinutes = Math.abs(offset);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  let timePart = '';
  if (hours > 0 && minutes > 0) {
    timePart = `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    timePart = `${hours}h`;
  } else {
    timePart = `${minutes}m`;
  }

  if (offset > 0) {
    return `NOW + ${timePart}`;
  } else {
    return `T-${timePart} (HISTORICAL)`;
  }
}

const sliderStyles = `
  .time-range-input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    background: linear-gradient(
      to right,
      #22c55e 0%,
      #22c55e var(--fill-pct),
      #374151 var(--fill-pct),
      #374151 100%
    );
  }
  .time-range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #22c55e;
    cursor: pointer;
    border: 2px solid #15803d;
    box-shadow: 0 0 4px rgba(34, 197, 94, 0.6);
  }
  .time-range-input::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #22c55e;
    cursor: pointer;
    border: 2px solid #15803d;
    box-shadow: 0 0 4px rgba(34, 197, 94, 0.6);
  }
  .time-range-input::-webkit-slider-runnable-track {
    border-radius: 2px;
  }
  .time-range-input::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: transparent;
  }
`;

const TimeControl: React.FC<TimeControlProps> = ({
  timeOffset,
  isPlaying,
  playSpeed,
  onTimeOffsetChange,
  onPlayPause,
  onSpeedChange,
  onReset,
}) => {
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onTimeOffsetChange(timeOffset + playSpeed);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, timeOffset, playSpeed]);

  const fillPct =
    ((timeOffset - MIN_OFFSET) / (MAX_OFFSET - MIN_OFFSET)) * 100;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '500px',
    backgroundColor: 'rgba(10, 15, 20, 0.92)',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '10px 14px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 1000,
    boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
    backdropFilter: 'blur(6px)',
    fontFamily: "'Courier New', Courier, monospace",
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnBase: React.CSSProperties = {
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '4px',
    color: '#d1d5db',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '4px 8px',
    lineHeight: 1,
    transition: 'background 0.15s, color 0.15s',
  };

  const playBtnStyle: React.CSSProperties = {
    ...btnBase,
    fontSize: '16px',
    padding: '4px 10px',
    color: isPlaying ? '#22c55e' : '#6b7280',
    borderColor: isPlaying ? '#15803d' : '#374151',
    background: isPlaying ? '#052e16' : '#1f2937',
    boxShadow: isPlaying ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none',
  };

  const timeDisplayStyle: React.CSSProperties = {
    marginLeft: 'auto',
    fontSize: '12px',
    color: timeOffset === 0 ? '#22c55e' : timeOffset > 0 ? '#60a5fa' : '#f59e0b',
    fontWeight: 'bold',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  };

  const noteStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '0px',
    letterSpacing: '0.02em',
  };

  return (
    <div style={containerStyle}>
      <style>{sliderStyles}</style>

      {/* Top row: transport controls + speed + time display */}
      <div style={rowStyle}>
        {/* Reset */}
        <button
          style={btnBase}
          onClick={onReset}
          title="Reset to NOW"
        >
          ⏮
        </button>

        {/* -15m */}
        <button
          style={btnBase}
          onClick={() => onTimeOffsetChange(Math.max(MIN_OFFSET, timeOffset - 15))}
          title="-15 minutes"
        >
          ⏪ -15m
        </button>

        {/* Play / Pause */}
        <button
          style={playBtnStyle}
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* +15m */}
        <button
          style={btnBase}
          onClick={() => onTimeOffsetChange(Math.min(MAX_OFFSET, timeOffset + 15))}
          title="+15 minutes"
        >
          +15m ⏩
        </button>

        {/* Speed selector */}
        <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
          {SPEED_OPTIONS.map((speed) => {
            const isActive = playSpeed === speed;
            return (
              <button
                key={speed}
                style={{
                  ...btnBase,
                  fontSize: '11px',
                  padding: '3px 5px',
                  background: isActive ? '#14532d' : '#1f2937',
                  color: isActive ? '#22c55e' : '#9ca3af',
                  borderColor: isActive ? '#15803d' : '#374151',
                  fontWeight: isActive ? 'bold' : 'normal',
                }}
                onClick={() => onSpeedChange(speed)}
                title={`${speed}x speed`}
              >
                {speed}x
              </button>
            );
          })}
        </div>

        {/* Time display */}
        <span style={timeDisplayStyle}>
          {formatTimeDisplay(timeOffset)}
        </span>
      </div>

      {/* Slider row */}
      <div style={{ padding: '0 2px' }}>
        <input
          type="range"
          className="time-range-input"
          min={MIN_OFFSET}
          max={MAX_OFFSET}
          step={1}
          value={timeOffset}
          style={
            {
              '--fill-pct': `${fillPct.toFixed(2)}%`,
            } as React.CSSProperties
          }
          onChange={(e) => onTimeOffsetChange(Number(e.target.value))}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#4b5563',
            marginTop: '2px',
          }}
        >
          <span>-3h</span>
          <span>NOW</span>
          <span>+6h</span>
        </div>
      </div>

      {/* Warning note */}
      <div style={noteStyle}>
        ⚠ Satellite positions shown for predicted time — ADS-B/AIS always show latest live data
      </div>
    </div>
  );
};

export default TimeControl;
