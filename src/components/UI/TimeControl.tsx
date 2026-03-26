import React, { useEffect } from 'react';

interface TimeControlProps {
  timeOffset: number;
  isPlaying: boolean;
  playSpeed: number;
  onTimeOffsetChange: (offset: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  isMobile?: boolean;
}

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
  isMobile,
}) => {
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onTimeOffsetChange(timeOffset + playSpeed);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, timeOffset, playSpeed, onTimeOffsetChange]);

  const fillPct =
    ((timeOffset - MIN_OFFSET) / (MAX_OFFSET - MIN_OFFSET)) * 100;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: isMobile ? '62px' : '82px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: isMobile ? 'calc(100vw - 16px)' : '350px',
    maxWidth: isMobile ? '100%' : '350px',
    backgroundColor: 'rgba(10, 15, 20, 0.55)',
    border: '1px solid rgba(31, 41, 55, 0.5)',
    borderRadius: '6px',
    padding: isMobile ? '4px 8px 3px' : '6px 10px 4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    zIndex: 1000,
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(6px)',
    fontFamily: "'Courier New', Courier, monospace",
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnBase: React.CSSProperties = {
    background: 'rgba(31, 41, 55, 0.7)',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '3px',
    color: '#d1d5db',
    cursor: 'pointer',
    fontSize: isMobile ? '14px' : '11px',
    padding: isMobile ? '4px 10px' : '2px 6px',
    height: isMobile ? '32px' : '20px',
    minWidth: isMobile ? '32px' : undefined,
    lineHeight: 1,
    transition: 'background 0.15s, color 0.15s',
  };

  const playBtnStyle: React.CSSProperties = {
    ...btnBase,
    fontSize: isMobile ? '14px' : '12px',
    padding: isMobile ? '4px 12px' : '2px 8px',
    height: isMobile ? '32px' : '20px',
    color: isPlaying ? '#22c55e' : '#6b7280',
    borderColor: isPlaying ? '#15803d' : 'rgba(55, 65, 81, 0.5)',
    background: isPlaying ? 'rgba(5, 46, 22, 0.7)' : 'rgba(31, 41, 55, 0.7)',
    boxShadow: isPlaying ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none',
  };

  const timeDisplayStyle: React.CSSProperties = {
    marginLeft: 'auto',
    fontSize: isMobile ? '10px' : '12px',
    color: timeOffset === 0 ? '#22c55e' : timeOffset > 0 ? '#60a5fa' : '#f59e0b',
    fontWeight: 'bold',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle}>
      <style>{sliderStyles}</style>

      {/* Compact row: reset + play/pause + slider + time display */}
      <div style={rowStyle}>
        <button
          style={btnBase}
          onClick={onReset}
          title="Reset to NOW"
        >
          ⏮
        </button>

        <button
          style={playBtnStyle}
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

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
              flex: 1,
            } as React.CSSProperties
          }
          onChange={(e) => onTimeOffsetChange(Number(e.target.value))}
        />

        <span style={timeDisplayStyle}>
          {formatTimeDisplay(timeOffset)}
        </span>
      </div>
    </div>
  );
};

export default TimeControl;
