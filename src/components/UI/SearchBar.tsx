import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Aircraft {
  icao24: string;
  callsign: string;
  country: string;
  lat: number;
  lng: number;
  isMilitary: boolean;
}

interface Ship {
  mmsi: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  type: string;
}

interface Satellite {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  alt: number;
}

interface ConflictZone {
  id: string;
  name: string;
  countries: string[];
  intensity: string;
  geoJSON: { geometry: { coordinates: unknown; type: string } };
}

interface SearchBarProps {
  aircraft: Array<Aircraft>;
  ships: Array<Ship>;
  satellites: Array<Satellite>;
  conflictZones: Array<ConflictZone>;
  onSelect: (type: string, entity: unknown) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

interface SearchResult {
  type: 'aircraft' | 'ship' | 'satellite' | 'conflict';
  entity: Aircraft | Ship | Satellite | ConflictZone;
  score: number;
  lat: number;
  lng: number;
}

function scoreMatch(value: string, query: string): number {
  const v = value.toLowerCase();
  const q = query.toLowerCase();
  if (v === q) return 3;
  if (v.startsWith(q)) return 2;
  if (v.includes(q)) return 1;
  return 0;
}

const SearchBar: React.FC<SearchBarProps> = ({
  aircraft,
  ships,
  satellites,
  conflictZones,
  onSelect,
  onFlyTo,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<number>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const runSearch = useCallback(
    (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      const found: SearchResult[] = [];

      for (const a of aircraft) {
        const s = Math.max(
          scoreMatch(a.callsign, q),
          scoreMatch(a.country, q)
        );
        if (s > 0) {
          found.push({ type: 'aircraft', entity: a, score: s, lat: a.lat, lng: a.lng });
        }
      }

      for (const ship of ships) {
        const s = Math.max(
          scoreMatch(ship.name, q),
          scoreMatch(ship.flag, q)
        );
        if (s > 0) {
          found.push({ type: 'ship', entity: ship, score: s, lat: ship.lat, lng: ship.lng });
        }
      }

      // Satellite search hidden
      // for (const sat of satellites) {
      //   const s = Math.max(
      //     scoreMatch(sat.name, q),
      //     scoreMatch(sat.category, q)
      //   );
      //   if (s > 0) {
      //     found.push({ type: 'satellite', entity: sat, score: s, lat: sat.lat, lng: sat.lng });
      //   }
      // }

      for (const conflict of conflictZones) {
        const nameScore = scoreMatch(conflict.name, q);
        const countryScore = conflict.countries.reduce(
          (best, c) => Math.max(best, scoreMatch(c, q)),
          0
        );
        const s = Math.max(nameScore, countryScore);
        if (s > 0) {
          // Attempt to derive a center point from geoJSON
          let lat = 0;
          let lng = 0;
          try {
            const geo = conflict.geoJSON?.geometry;
            if (geo?.type === 'Point') {
              const coords = geo.coordinates as [number, number];
              lng = coords[0];
              lat = coords[1];
            } else if (geo?.type === 'Polygon') {
              const ring = (geo.coordinates as [number, number][][])[0];
              if (ring && ring.length > 0) {
                lng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
                lat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
              }
            }
          } catch {
            // ignore
          }
          found.push({ type: 'conflict', entity: conflict, score: s, lat, lng });
        }
      }

      found.sort((a, b) => b.score - a.score);
      setResults(found.slice(0, 8));
      setIsOpen(true);
      setActiveIndex(-1);
    },
    [aircraft, ships, satellites, conflictZones]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < results.length) {
        selectResult(results[activeIndex]);
      }
    }
  };

  const selectResult = (result: SearchResult) => {
    clearTimeout(blurTimeoutRef.current);
    onSelect(result.type, result.entity);
    onFlyTo(result.lat, result.lng);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const renderResultLabel = (result: SearchResult): React.ReactNode => {
    if (result.type === 'aircraft') {
      const a = result.entity as Aircraft;
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
          <span>✈️</span>
          <span style={{ fontFamily: 'monospace', color: '#00ff88', fontWeight: 600 }}>
            {a.callsign || a.icao24}
          </span>
          <span style={{ color: '#aaa', fontSize: '11px' }}>– {a.country}</span>
          {a.isMilitary && (
            <span style={styles.badgeMil}>MIL</span>
          )}
        </span>
      );
    }
    if (result.type === 'ship') {
      const s = result.entity as Ship;
      const isWarship = s.type?.toLowerCase().includes('warship') || s.type?.toLowerCase().includes('naval') || s.type?.toLowerCase().includes('military');
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
          <span>🚢</span>
          <span style={{ color: '#00bfff', fontWeight: 600 }}>{s.name}</span>
          <span style={{ color: '#aaa', fontSize: '11px' }}>– Flag: {s.flag} – {s.type}</span>
          {isWarship && (
            <span style={styles.badgeWarship}>WARSHIP</span>
          )}
        </span>
      );
    }
    if (result.type === 'satellite') {
      const s = result.entity as Satellite;
      const altKm = Math.round(s.alt);
      const orbit = altKm < 2000 ? 'LEO' : altKm < 35786 ? 'MEO' : 'GEO';
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
          <span>🛰️</span>
          <span style={{ color: '#c084fc', fontWeight: 600 }}>{s.name}</span>
          <span style={{ color: '#aaa', fontSize: '11px' }}>– {s.category} – {altKm}km {orbit}</span>
        </span>
      );
    }
    if (result.type === 'conflict') {
      const c = result.entity as ConflictZone;
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
          <span>⚔️</span>
          <span style={{ color: '#ff4444', fontWeight: 600 }}>{c.name}</span>
          <span style={{ color: '#aaa', fontSize: '11px' }}>
            – {c.intensity} – {c.countries.slice(0, 2).join(', ')}
          </span>
        </span>
      );
    }
    return null;
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '58px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const inputWrapStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(10, 14, 20, 0.95)',
    border: isFocused ? '1px solid #00ff88' : '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: isOpen && results.length > 0 ? '8px 8px 0 0' : '8px',
    padding: '6px 12px',
    width: isFocused ? '380px' : '350px',
    transition: 'width 0.2s ease, border-color 0.2s ease',
    boxShadow: isFocused
      ? '0 0 12px rgba(0, 255, 136, 0.25)'
      : '0 2px 8px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: '13px',
    width: '100%',
    marginLeft: '8px',
  };

  const dropdownStyle: React.CSSProperties = {
    background: 'rgba(10, 14, 20, 0.98)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    width: isFocused ? '380px' : '350px',
    maxHeight: '320px',
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
  };

  return (
    <div style={containerStyle}>
      <div style={inputWrapStyle}>
        <span style={{ fontSize: '14px', color: '#888', flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (query.length >= 2) setIsOpen(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder="Search aircraft, ships, satellites, conflicts... (Ctrl+K)"
          style={inputStyle}
        />
      </div>

      {isOpen && (
        <div style={dropdownStyle}>
          {results.length === 0 ? (
            <div style={styles.emptyState}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((result, idx) => (
              <div
                key={`${result.type}-${(result as any).entity?.id || (result as any).entity?.icao24 || (result as any).entity?.mmsi || idx}`}
                onMouseDown={() => selectResult(result)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  ...styles.resultItem,
                  background:
                    activeIndex === idx
                      ? 'rgba(0, 255, 136, 0.08)'
                      : 'transparent',
                  borderLeft:
                    activeIndex === idx
                      ? '2px solid #00ff88'
                      : '2px solid transparent',
                }}
              >
                {renderResultLabel(result)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  resultItem: {
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.1s ease',
    display: 'flex',
    alignItems: 'center',
  },
  emptyState: {
    padding: '12px 16px',
    color: '#666',
    fontSize: '12px',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  badgeMil: {
    background: 'rgba(255, 165, 0, 0.2)',
    border: '1px solid rgba(255, 165, 0, 0.6)',
    color: '#ffa500',
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: '3px',
    marginLeft: 'auto',
    letterSpacing: '0.5px',
  },
  badgeWarship: {
    background: 'rgba(255, 40, 40, 0.2)',
    border: '1px solid rgba(255, 40, 40, 0.6)',
    color: '#ff2828',
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: '3px',
    marginLeft: 'auto',
    letterSpacing: '0.5px',
  },
};

export default SearchBar;
