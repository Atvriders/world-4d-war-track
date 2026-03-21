import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from './store';
import { useDataRefresh, useAlertGenerator, useSatelliteTimePropagation, useGlobeTime } from './hooks';

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
import { fetchAllSatellites } from './services/satellite';
import { getStaticGpsJamHotspots, getActiveJammingAlerts } from './services/gpsJam';
import { CONFLICT_ZONES } from './data/conflicts';

import type { SatelliteEntity, ConflictZone } from './store';

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
  const [showLegend, setShowLegend] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [showTimeControl, setShowTimeControl] = useState(false);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [watchedEntities, setWatchedEntities] = useState<Array<{ type: 'aircraft' | 'ship' | 'satellite'; id: string; label: string; addedAt: number }>>([]);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [globeSettings, setGlobeSettings] = useState<LocalGlobeSettings>(DEFAULT_GLOBE_SETTINGS);

  // ── Custom hooks for data refresh, alert generation, and globe time ───────
  const { refresh } = useDataRefresh();
  useAlertGenerator();
  useSatelliteTimePropagation();
  const { currentTime } = useGlobeTime();

  // ── Globe ref ───────────────────────────────────────────────────────────────
  const globeRef = useRef<any>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleFlyTo = useCallback((lat: number, lng: number, altitude = 1.0) => {
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
        fetchAircraft().then(ac => { store.setAircraft(ac as any); store.setLastRefresh('aircraft'); })
          .catch(e => store.setError('aircraft', String(e))),
        fetchShips().then(ships => { store.setShips(ships as any); store.setLastRefresh('ships'); })
          .catch(e => store.setError('ships', String(e))),
        fetchAllSatellites().then(sats => { store.setSatellites(sats as any); store.setLastRefresh('satellites'); })
          .catch(e => store.setError('satellites', String(e))),
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
        case 's': store.toggleLayer('satellites'); break;
        case 'a': store.toggleLayer('aircraft'); break;
        case 'v': store.toggleLayer('ships'); break;
        case 'w': store.toggleLayer('warZones'); break;
        case 'j': store.toggleLayer('gpsJam'); break;
        case 'o': store.toggleLayer('satelliteOrbits'); break;
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
          setShowEventFeed(v => !v);
          break;
        case '7':
          setShowWatchList(v => !v);
          break;
        case '8':
          setShowHotspots(v => !v);
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
        background: '#000011',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* Globe always renders (behind loading screen) so WebGL initializes immediately */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
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
          />

          {/* Server connectivity banner */}
          <ServerStatus errors={errors} lastRefresh={lastRefresh} />

          {/* Search bar */}
          <SearchBar
            aircraft={aircraft}
            ships={ships}
            satellites={satellites}
            conflictZones={conflictZones}
            onSelect={handleEntitySelect}
            onFlyTo={handleFlyTo}
          />

          {/* Left panel */}
          <FilterPanel
            layers={layers}
            onToggleLayer={(k) => store.toggleLayer(k as any)}
            counts={counts}
          />

          {/* Right panel — conflict sidebar (starts collapsed) */}
          <ConflictSidebar
            conflictZones={conflictZones}
            selectedConflictId={selectedConflictId}
            onSelect={handleConflictSelect}
            onFlyTo={handleFlyTo}
          />

          {/* Selected entity info panel */}
          {selectedEntity && (
            <InfoPanel
              selectedEntity={selectedEntity}
              onClose={() => store.setSelectedEntity(null)}
              onFlyTo={handleFlyTo}
            />
          )}

          {/* Bottom — conflict ticker */}
          <ConflictTicker
            conflictZones={conflictZones}
            alerts={alerts}
            onEventClick={handleFlyTo}
          />

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

          {/* Satellite panel */}
          <SatellitePanel
            satellites={satellites}
            onSelect={handleSatSelect}
            onFlyTo={handleFlyTo}
            visible={showSatellitePanel}
            onToggle={() => setShowSatellitePanel(v => !v)}
          />

          {/* GPS jam panel */}
          <GpsJamPanel
            gpsJamCells={gpsJamCells}
            onFlyTo={handleFlyTo}
            visible={showGpsJamPanel}
            onToggle={() => setShowGpsJamPanel(v => !v)}
          />

          {/* Hotspots panel */}
          <HotspotsPanel
            aircraft={aircraft}
            ships={ships}
            gpsJamCells={gpsJamCells}
            conflictZones={conflictZones}
            onFlyTo={handleFlyTo}
            visible={showHotspots}
            onToggle={() => setShowHotspots(v => !v)}
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

          {/* Event feed */}
          <EventFeed
            conflictZones={conflictZones}
            onFlyTo={handleFlyTo}
            visible={showEventFeed}
            onToggle={() => setShowEventFeed(v => !v)}
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
          />

          {/* Sources button */}
          <button
            onClick={() => setShowSources(v => !v)}
            style={{
              position: 'fixed',
              bottom: 66,
              right: 16,
              background: 'rgba(5,15,30,0.8)',
              border: '1px solid rgba(0,255,136,0.4)',
              color: '#00ff88',
              padding: '4px 8px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '11px',
              cursor: 'pointer',
              zIndex: 1250,
              letterSpacing: '0.05em',
            }}
            title="View data sources (U)"
          >
            Sources
          </button>

          {/* Help button */}
          <button
            onClick={() => setShowKeyboardHelp(v => !v)}
            style={{
              position: 'fixed',
              bottom: 100,
              right: 16,
              background: 'rgba(5,15,30,0.8)',
              border: '1px solid rgba(0,255,136,0.4)',
              color: '#00ff88',
              padding: '4px 8px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '12px',
              cursor: 'pointer',
              zIndex: 1250,
            }}
          >
            ⌨ ?
          </button>
        </>
      )}
    </div>
  );
}
