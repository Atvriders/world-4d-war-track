import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from './store';
import { useDataRefresh, useAlertGenerator, useSatelliteTimePropagation, useGlobeTime, useIsMobile } from './hooks';

import Globe from './components/Globe/Globe';
import StatusBar from './components/UI/StatusBar';
import FilterPanel from './components/UI/FilterPanel';
import InfoPanel from './components/UI/InfoPanel';
import AlertPanel from './components/UI/AlertPanel';
import TimeControl from './components/UI/TimeControl';
import ConflictTicker from './components/UI/ConflictTicker';
import Legend from './components/UI/Legend';
import ConflictSidebar from './components/UI/ConflictSidebar';
import GpsJamPanel from './components/UI/GpsJamPanel';
import SatellitePanel from './components/UI/SatellitePanel';
import QuickNav from './components/UI/QuickNav';
import LoadingScreen from './components/UI/LoadingScreen';
import MiniRadar from './components/UI/MiniRadar';
import SearchBar from './components/UI/SearchBar';
import GlobeSettings from './components/UI/GlobeSettings';
import HotspotsPanel from './components/UI/HotspotsPanel';
import StatsOverlay from './components/UI/StatsOverlay';
import KeyboardHelp from './components/UI/KeyboardHelp';
import WatchList from './components/UI/WatchList';
import EventFeed from './components/UI/EventFeed';
import DeathTollBar from './components/UI/DeathTollBar';
import WarImpactPanel from './components/UI/WarImpactPanel';
import EconomyPanel from './components/UI/EconomyPanel';
import SourcesPanel from './components/UI/SourcesPanel';
import ServerStatus from './components/UI/ServerStatus';
import HudOverlay from './components/UI/HudOverlay';
import LayerBar from './components/UI/LayerBar';

import { fetchAircraft } from './services/adsb';
import { fetchShips } from './services/ais';
import { fetchSatellitePositions } from './services/satellite';
import { getStaticGpsJamHotspots, getActiveJammingAlerts } from './services/gpsJam';
import { CONFLICT_ZONES } from './data/conflicts';

import type { SatelliteEntity, ConflictZone } from './store';

// ── Error boundary for WebGL / Globe crashes ────────────────────────────────

class GlobeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GlobeErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#000008', color: '#FF3838',
          fontFamily: "'Rajdhani', sans-serif", textAlign: 'center', padding: 32,
        }}>
          <div>
            <div style={{ fontSize: 18, marginBottom: 12, color: '#3CB8FF', fontFamily: "'Rajdhani', sans-serif" }}>GLOBE RENDER FAILURE</div>
            <div style={{ fontSize: 12, color: '#FF3838', maxWidth: 480, fontFamily: "'Share Tech Mono', monospace" }}>
              {this.state.error || 'WebGL context lost or rendering error.'}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              style={{
                marginTop: 16, padding: '6px 16px', background: 'transparent',
                border: '1px solid #3CB8FF', color: '#3CB8FF', cursor: 'pointer',
                fontFamily: "'Share Tech Mono', monospace", fontSize: 12,
              }}
            >
              RETRY
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Default globe settings (local) ───────────────────────────────────────────

interface LocalGlobeSettings {
  imageryStyle: 'satellite' | 'dark' | 'terrain';
  autoRotate: boolean;
  autoRotateSpeed: number;
  showGraticules: boolean;
  showTerminator: boolean;
  atmosphereColor: string;
}

const DEFAULT_GLOBE_SETTINGS: LocalGlobeSettings = {
  imageryStyle: 'satellite',
  autoRotate: false,
  autoRotateSpeed: 0.5,
  showGraticules: false,
  showTerminator: true,
  atmosphereColor: '#1a3a5c',
};

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const store = useStore();
  const {
    aircraft,
    ships,
    satellites,
    gpsJamCells,
    conflictZones,
    alerts,
    layers,
    selectedEntity,
    timeOffset,
    isPlaying,
    playSpeed,
    isLoading,
    errors,
    lastRefresh,
  } = useStore();

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSatellitePanel, setShowSatellitePanel] = useState(false);
  const [showGpsJamPanel, setShowGpsJamPanel] = useState(false);
  const [showGlobeSettings, setShowGlobeSettings] = useState(false);
  const [showMiniRadar, setShowMiniRadar] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);
  const [showWatchList, setShowWatchList] = useState(false);
  const [showEventFeed, setShowEventFeed] = useState(false);
  const [showWarImpact, setShowWarImpact] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showEconomy, setShowEconomy] = useState(false);
  const [showStatsOverlay, setShowStatsOverlay] = useState(false);
  const [showConflictSidebar, setShowConflictSidebar] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileConflictOpen, setMobileConflictOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [showTimeControl, setShowTimeControl] = useState(false);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [watchedEntities, setWatchedEntities] = useState<Array<{ type: 'aircraft' | 'ship' | 'satellite'; id: string; label: string; addedAt: number }>>([]);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [globeSettings, setGlobeSettings] = useState<LocalGlobeSettings>(DEFAULT_GLOBE_SETTINGS);

  // ── Mutual-exclusivity helpers for right-side specialty panels ────────────
  // Only one of: satellite, gpsJam, hotspots, eventFeed open at a time
  const toggleSpecialtyPanel = useCallback((panel: 'satellite' | 'gpsJam' | 'hotspots' | 'eventFeed') => {
    setShowSatellitePanel(prev => panel === 'satellite' ? !prev : false);
    setShowGpsJamPanel(prev => panel === 'gpsJam' ? !prev : false);
    setShowHotspots(prev => panel === 'hotspots' ? !prev : false);
    setShowEventFeed(prev => panel === 'eventFeed' ? !prev : false);
  }, []);

  // ── Custom hooks for data refresh, alert generation, and globe time ───────
  const { refresh } = useDataRefresh();
  useAlertGenerator();
  // useSatelliteTimePropagation(); // Satellites disabled
  const { currentTime } = useGlobeTime();
  const isMobile = useIsMobile();

  // ── Globe ref ───────────────────────────────────────────────────────────────
  const globeRef = useRef<any>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleFlyTo = useCallback((lat: number, lng: number, altitude = 0.4) => {
    globeRef.current?.pointOfView({ lat, lng, altitude }, 1500);
  }, []);

  // ── Entity click handlers ───────────────────────────────────────────────────
  const handleEntityClick = useCallback((type: string, entity: unknown) => {
    store.setSelectedEntity({
      type: type as any,
      id:
        (entity as any).id ||
        (entity as any).icao24 ||
        (entity as any).mmsi ||
        '',
      data: entity as any,
    });
  }, [store]);

  const handleEntitySelect = useCallback((entity: unknown) => {
    if (!entity) return;
    const e = entity as any;
    const type = e.icao24
      ? 'aircraft'
      : e.mmsi
      ? 'ship'
      : e.tle1
      ? 'satellite'
      : 'conflict';
    store.setSelectedEntity({
      type: type as any,
      id: e.id || e.icao24 || e.mmsi || '',
      data: e,
    });
    if (e.lat != null && e.lng != null) {
      handleFlyTo(e.lat, e.lng);
    }
  }, [store, handleFlyTo]);

  const handleConflictSelect = useCallback((zone: ConflictZone) => {
    setSelectedConflictId(zone.id);
    handleEntityClick('conflict', zone);
  }, [handleEntityClick]);

  const handleSatSelect = useCallback((sat: SatelliteEntity) => {
    handleEntityClick('satellite', sat);
    handleFlyTo(sat.lat, sat.lng, 0.5);
  }, [handleEntityClick, handleFlyTo]);

  // ── Initial data load — static data instant, API calls in background ───────
  useEffect(() => {
    async function loadData() {
      // Load static data immediately (no network)
      store.setConflictZones(CONFLICT_ZONES as any);
      const jamCells = getStaticGpsJamHotspots();
      store.setGpsJamCells(jamCells as any);
      const jamAlerts = getActiveJammingAlerts(jamCells as any);
      if (Array.isArray(jamAlerts)) {
        jamAlerts.forEach((a: any) => store.addAlert(a));
      }

      // Show app immediately — don't wait for API calls
      setLoadingProgress(100);
      setLoadingStatus('System ready.');
      loadTimerRef.current = setTimeout(() => setIsLoaded(true), 300);

      // Fetch live data in background (non-blocking)
      Promise.allSettled([
        fetchAircraft().then(ac => { if (ac.length > 0) { store.setAircraft(ac as any); store.setLastRefresh('aircraft'); } })
          .catch(e => store.setError('aircraft', String(e))),
        fetchShips().then(ships => { if (ships.length > 0) { store.setShips(ships as any); store.setLastRefresh('ships'); } })
          .catch(e => store.setError('ships', String(e))),
        // Satellites disabled
        // fetchSatellitePositions().then(sats => { if (sats.length > 0) { store.setSatellites(sats as any); store.setLastRefresh('satellites'); } })
        //   .catch(e => store.setError('satellites', String(e))),
      ]);
    }
    loadData();
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K: focus search bar (SearchBar handles it too, but prevent 'k' toggling chokepoints)
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        return;
      }
      if (document.activeElement?.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        // case 's': store.toggleLayer('satellites'); break; // Satellites disabled
        case 'a': store.toggleLayer('aircraft'); break;
        case 'v': store.toggleLayer('ships'); break;
        case 'w': store.toggleLayer('warZones'); break;
        case 'j': store.toggleLayer('gpsJam'); break;
        // case 'o': store.toggleLayer('satelliteOrbits'); break; // Satellites disabled
        case 'n': store.toggleLayer('nuclearSites'); break;
        case 'b': store.toggleLayer('militaryBases'); break;
        case 'c': store.toggleLayer('seaCables'); break;
        case 'r': store.toggleLayer('refugeeFlows'); break;
        case 'p': store.toggleLayer('piracyZones'); break;
        case 'd': store.toggleLayer('droneActivity'); break;
        case 't': store.toggleLayer('threatRings'); break;
        case 'x': store.toggleLayer('cyberThreats'); break;
        case 'k': store.toggleLayer('chokepoints'); break;
        case 'g': handleFlyTo(25, 15, 2.5); break;   // Global view
        case 'e': handleFlyTo(50, 15, 1.5); break;   // Europe
        case 'm': handleFlyTo(28, 45, 1.5); break;   // Middle East
        case 'f': document.documentElement.requestFullscreen?.(); break;
        case ' ':
          e.preventDefault();
          store.setIsPlaying(!isPlaying);
          break;
        case 'arrowleft': store.setTimeOffset(timeOffset - 15); break;
        case 'arrowright': store.setTimeOffset(timeOffset + 15); break;
        case '0':
          store.setTimeOffset(0);
          store.setIsPlaying(false);
          break;
        case '?':
        case 'h':
          setShowKeyboardHelp(v => !v);
          break;
        case 'i':
          setShowWarImpact(v => !v);
          break;
        case 'u':
          setShowSources(v => !v);
          break;
        case 'y':
          setShowEconomy(v => !v);
          break;
        case 'l':
          setShowLegend(v => !v);
          break;
        case 'q':
          setShowQuickNav(v => !v);
          break;
        case '1':
          setShowStatsOverlay(v => !v);
          break;
        case '2':
          setShowTimeControl(v => !v);
          break;
        case '3':
          setShowAlertPanel(v => !v);
          break;
        case '4':
          setShowConflictSidebar(v => !v);
          break;
        case '5':
          setShowMiniRadar(v => !v);
          break;
        case '6':
          toggleSpecialtyPanel('eventFeed');
          break;
        case '7':
          setShowWatchList(v => !v);
          break;
        case '8':
          toggleSpecialtyPanel('hotspots');
          break;
        case '9':
          setShowGlobeSettings(v => !v);
          break;
        case 'escape':
          setShowKeyboardHelp(false);
          store.setSelectedEntity(null);
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isPlaying, timeOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed counts ─────────────────────────────────────────────────────────
  const counts = {
    satellites: satellites.length,
    militarySatellites: satellites.filter(s =>
      ['military', 'spy', 'reconnaissance'].includes(s.category)
    ).length,
    aircraft: aircraft.length,
    militaryAircraft: aircraft.filter(a => a.isMilitary).length,
    ships: ships.length,
    warships: ships.filter(s => s.type === 'warship' || s.type === 'military').length,
    conflicts: conflictZones.length,
    gpsJamCells: gpsJamCells.length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000008',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      {/* Globe always renders (behind loading screen) so WebGL initializes immediately */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <GlobeErrorBoundary>
          <Globe
            ref={globeRef}
            satellites={satellites}
            aircraft={aircraft}
            ships={ships}
            conflictZones={conflictZones}
            gpsJamCells={gpsJamCells}
            layers={layers}
            onEntityClick={handleEntityClick}
            timeOffset={timeOffset}
            globeSettings={globeSettings}
          />
        </GlobeErrorBoundary>
      </div>

      <LoadingScreen
        progress={loadingProgress}
        status={loadingStatus}
        isVisible={!isLoaded}
      />

      {/* HUD overlay — always visible over the globe */}
      <HudOverlay globeRef={globeRef} />

      {isLoaded && (
        <>
          {/* Death toll summary bar — always visible at very top */}
          <DeathTollBar
            conflictZones={conflictZones}
            onFlyTo={handleFlyTo}
            onOpenSources={() => setShowSources(true)}
          />

          {/* Status bar */}
          <StatusBar
            satellites={satellites.length}
            aircraft={aircraft.length}
            militaryAircraft={counts.militaryAircraft}
            ships={ships.length}
            warships={counts.warships}
            activeConflicts={conflictZones.length}
            gpsJamZones={gpsJamCells.length}
            isLoading={isLoading}
            errors={errors}
            lastRefresh={lastRefresh}
            currentTime={currentTime}
            alerts={alerts}
            gpsJamCells={gpsJamCells}
            onRetry={refresh}
            isMobile={isMobile}
          />

          {/* Server connectivity banner */}
          <ServerStatus errors={errors} lastRefresh={lastRefresh} />

          {/* Search bar — hide on mobile */}
          {!isMobile && (
            <SearchBar
              aircraft={aircraft}
              ships={ships}
              satellites={satellites}
              conflictZones={conflictZones}
              onSelect={handleEntitySelect}
              onFlyTo={handleFlyTo}
            />
          )}

          {/* Left panel */}
          <FilterPanel
            layers={layers}
            onToggleLayer={(k) => store.toggleLayer(k as any)}
            counts={counts}
            isMobile={isMobile}
            mobileOpen={mobileFilterOpen}
            onMobileClose={() => setMobileFilterOpen(false)}
          />

          {/* Right panel — conflict sidebar (hidden when InfoPanel is open) */}
          {!selectedEntity && (
            <ConflictSidebar
              conflictZones={conflictZones}
              selectedConflictId={selectedConflictId}
              onSelect={handleConflictSelect}
              onFlyTo={handleFlyTo}
              isMobile={isMobile}
              mobileOpen={mobileConflictOpen}
              onMobileClose={() => setMobileConflictOpen(false)}
            />
          )}

          {/* Selected entity info panel */}
          {selectedEntity && (
            <InfoPanel
              selectedEntity={selectedEntity}
              onClose={() => store.setSelectedEntity(null)}
              onFlyTo={handleFlyTo}
              isMobile={isMobile}
            />
          )}

          {/* Bottom — conflict ticker (hidden on mobile) */}
          {!isMobile && (
            <ConflictTicker
              conflictZones={conflictZones}
              alerts={alerts}
              onEventClick={handleFlyTo}
            />
          )}

          {/* Time control — always visible */}
          <TimeControl
            timeOffset={timeOffset}
            isPlaying={isPlaying}
            playSpeed={playSpeed}
            onTimeOffsetChange={(o) => store.setTimeOffset(o)}
            onPlayPause={() => store.setIsPlaying(!isPlaying)}
            onSpeedChange={(s) => store.setPlaySpeed(s)}
            onReset={() => {
              store.setTimeOffset(0);
              store.setIsPlaying(false);
            }}
            isMobile={isMobile}
          />

          {/* Alert panel — starts collapsed */}
          <AlertPanel
            alerts={alerts}
            onDismiss={(id) => store.dismissAlert(id)}
            onFlyTo={handleFlyTo}
          />

          {/* Quick navigation (hidden by default) */}
          {showQuickNav && (
            <QuickNav
              onFlyTo={handleFlyTo}
              conflictZones={conflictZones}
            />
          )}

          {/* Legend (hidden by default) */}
          {showLegend && <Legend />}

          {/* Mini radar */}
          <MiniRadar
            aircraft={aircraft}
            ships={ships}
            satellites={satellites}
            conflictZones={conflictZones}
            visible={showMiniRadar}
            onToggle={() => setShowMiniRadar(v => !v)}
          />

          {/* Stats overlay (hidden by default) */}
          {showStatsOverlay && (
            <StatsOverlay
              aircraft={aircraft}
              ships={ships}
              satellites={satellites}
              conflictZones={conflictZones}
              gpsJamCells={gpsJamCells}
            />
          )}

          {/* Satellite panel (mutually exclusive with other specialty panels) */}
          {false && <SatellitePanel
            satellites={satellites}
            onSelect={handleSatSelect}
            onFlyTo={handleFlyTo}
            visible={showSatellitePanel}
            onToggle={() => toggleSpecialtyPanel('satellite')}
          />}

          {/* GPS jam panel (mutually exclusive with other specialty panels) */}
          <GpsJamPanel
            gpsJamCells={gpsJamCells}
            onFlyTo={handleFlyTo}
            visible={showGpsJamPanel}
            onToggle={() => toggleSpecialtyPanel('gpsJam')}
          />

          {/* Hotspots panel (mutually exclusive with other specialty panels) */}
          <HotspotsPanel
            aircraft={aircraft}
            ships={ships}
            gpsJamCells={gpsJamCells}
            conflictZones={conflictZones}
            onFlyTo={handleFlyTo}
            visible={showHotspots}
            onToggle={() => toggleSpecialtyPanel('hotspots')}
          />

          {/* Globe settings */}
          <GlobeSettings
            settings={globeSettings}
            onUpdate={(s) => setGlobeSettings(prev => ({ ...prev, ...s }))}
            onReset={() => setGlobeSettings(DEFAULT_GLOBE_SETTINGS)}
            visible={showGlobeSettings}
            onToggle={() => setShowGlobeSettings(v => !v)}
          />

          {/* Watch list */}
          <WatchList
            watchedEntities={watchedEntities}
            aircraft={aircraft}
            ships={ships}
            satellites={satellites}
            onFlyTo={handleFlyTo}
            onRemove={(id) => setWatchedEntities(prev => prev.filter(e => e.id !== id))}
            onAdd={(type, id) => {
              const t = type as 'aircraft' | 'ship' | 'satellite';
              if (watchedEntities.some(e => e.id === id)) return;
              const label = t === 'aircraft'
                ? aircraft?.find(a => a.icao24 === id)?.callsign ?? id
                : t === 'ship'
                ? ships?.find(s => s.mmsi === id)?.name ?? id
                : satellites?.find(s => s.id === id)?.name ?? id;
              setWatchedEntities(prev => [...prev, { type: t, id, label, addedAt: Date.now() }]);
            }}
            visible={showWatchList}
            onToggle={() => setShowWatchList(v => !v)}
          />

          {/* Event feed (mutually exclusive with other specialty panels) */}
          <EventFeed
            conflictZones={conflictZones}
            onFlyTo={handleFlyTo}
            visible={showEventFeed}
            onToggle={() => toggleSpecialtyPanel('eventFeed')}
          />

          {/* War impact panel */}
          <WarImpactPanel
            aircraft={aircraft}
            ships={ships}
            conflictZones={conflictZones}
            gpsJamCells={gpsJamCells}
            visible={showWarImpact}
            onToggle={() => setShowWarImpact(v => !v)}
          />

          {/* Economy panel */}
          <EconomyPanel
            visible={showEconomy}
            onToggle={() => setShowEconomy(v => !v)}
          />

          {/* Sources panel */}
          <SourcesPanel
            visible={showSources}
            onClose={() => setShowSources(false)}
          />

          {/* Keyboard help */}
          <KeyboardHelp
            visible={showKeyboardHelp}
            onClose={() => setShowKeyboardHelp(v => !v)}
          />

          {/* Layer quick-toggle bar */}
          <LayerBar
            layers={layers}
            onToggleLayer={(k) => store.toggleLayer(k)}
            counts={{
              aircraft: aircraft.length,
              satellites: satellites.length,
              ships: ships.length,
              warZones: conflictZones.length,
              gpsJam: gpsJamCells.length,
            }}
            isMobile={isMobile}
          />

          {/* Sources button — hide on mobile */}
          {!isMobile && (
            <button
              onClick={() => setShowSources(v => !v)}
              style={{
                position: 'fixed',
                bottom: 72,
                right: 8,
                background: 'rgba(8,14,28,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(60,180,255,0.2)',
                color: '#3CB8FF',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '9px',
                cursor: 'pointer',
                zIndex: 1250,
                letterSpacing: '0.05em',
              }}
              title="View data sources (U)"
            >
              Sources
            </button>
          )}

          {/* Help button — hide on mobile */}
          {!isMobile && (
            <button
              onClick={() => setShowKeyboardHelp(v => !v)}
              style={{
                position: 'fixed',
                bottom: 92,
                right: 8,
                background: 'rgba(8,14,28,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(60,180,255,0.2)',
                color: '#3CB8FF',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '9px',
                cursor: 'pointer',
                zIndex: 1250,
              }}
            >
              ⌨ ?
            </button>
          )}

          {/* Mobile menu buttons */}
          {isMobile && (
            <div
              style={{
                position: 'fixed',
                top: 60,
                right: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                zIndex: 1300,
              }}
            >
              <button
                onClick={() => { setMobileFilterOpen(v => !v); setMobileConflictOpen(false); }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: mobileFilterOpen ? 'rgba(60,184,255,0.2)' : 'rgba(8,14,28,0.7)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(60,180,255,0.3)',
                  color: '#3CB8FF',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Layers & Filters"
              >
                ☰
              </button>
              <button
                onClick={() => { setMobileConflictOpen(v => !v); setMobileFilterOpen(false); }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: mobileConflictOpen ? 'rgba(255,56,56,0.2)' : 'rgba(8,14,28,0.7)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,60,60,0.3)',
                  color: '#FF3838',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Conflicts"
              >
                ⚔
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
