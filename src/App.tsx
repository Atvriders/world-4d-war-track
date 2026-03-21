import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from './store';

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
  const [showMiniRadar, setShowMiniRadar] = useState(true);
  const [showHotspots, setShowHotspots] = useState(false);
  const [showWatchList, setShowWatchList] = useState(false);
  const [showEventFeed, setShowEventFeed] = useState(false);
  const [watchedEntities, setWatchedEntities] = useState<Array<{ type: 'aircraft' | 'ship' | 'satellite'; id: string; label: string; addedAt: number }>>([]);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [globeSettings, setGlobeSettings] = useState<LocalGlobeSettings>(DEFAULT_GLOBE_SETTINGS);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ── Globe ref ───────────────────────────────────────────────────────────────
  const globeRef = useRef<any>(null);

  const handleFlyTo = useCallback((lat: number, lng: number, altitude = 1.0) => {
    globeRef.current?.pointOfView({ lat, lng, altitude }, 1500);
  }, []);

  // ── Clock tick ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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

  // ── Initial data load with progress ────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoadingStatus('Loading conflict zones...');
      setLoadingProgress(10);
      store.setConflictZones(CONFLICT_ZONES as any);

      setLoadingStatus('Loading GPS interference data...');
      setLoadingProgress(20);
      const jamCells = getStaticGpsJamHotspots();
      store.setGpsJamCells(jamCells as any);

      // Generate initial alerts from jam cells
      const jamAlerts = getActiveJammingAlerts(jamCells as any);
      if (Array.isArray(jamAlerts)) {
        jamAlerts.forEach((a: any) => store.addAlert(a));
      }

      setLoadingStatus('Connecting to ADS-B network...');
      setLoadingProgress(40);
      try {
        const ac = await fetchAircraft();
        store.setAircraft(ac as any);
        store.setLastRefresh('aircraft');
      } catch (e) {
        console.error('ADS-B fetch failed', e);
        store.setError('aircraft', String(e));
      }

      setLoadingStatus('Loading vessel tracking data...');
      setLoadingProgress(60);
      try {
        const ships = await fetchShips();
        store.setShips(ships as any);
        store.setLastRefresh('ships');
      } catch (e) {
        console.error('AIS fetch failed', e);
        store.setError('ships', String(e));
      }

      setLoadingStatus('Loading satellite orbital data...');
      setLoadingProgress(80);
      try {
        const sats = await fetchAllSatellites();
        store.setSatellites(sats as any);
        store.setLastRefresh('satellites');
      } catch (e) {
        console.error('Satellite fetch failed', e);
        store.setError('satellites', String(e));
      }

      setLoadingStatus('System ready.');
      setLoadingProgress(100);
      setTimeout(() => setIsLoaded(true), 800);
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic refresh ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const aircraftTimer = setInterval(async () => {
      try {
        store.setAircraft(await fetchAircraft() as any);
        store.setLastRefresh('aircraft');
      } catch (e) {
        store.setError('aircraft', String(e));
      }
    }, 15000);

    const shipTimer = setInterval(async () => {
      try {
        store.setShips(await fetchShips() as any);
        store.setLastRefresh('ships');
      } catch (e) {
        store.setError('ships', String(e));
      }
    }, 60000);

    const satTimer = setInterval(async () => {
      try {
        store.setSatellites(await fetchAllSatellites() as any);
        store.setLastRefresh('satellites');
      } catch (e) {
        store.setError('satellites', String(e));
      }
    }, 300000);

    const gpsJamTimer = setInterval(() => {
      try {
        const cells = getStaticGpsJamHotspots();
        store.setGpsJamCells(cells as any);
        store.setLastRefresh('gpsJam');
        const alerts = getActiveJammingAlerts(cells as any);
        if (Array.isArray(alerts)) {
          alerts.forEach((a: any) => store.addAlert(a));
        }
      } catch (e) {
        store.setError('gpsJam', String(e));
      }
    }, 600000);

    return () => {
      clearInterval(aircraftTimer);
      clearInterval(shipTimer);
      clearInterval(satTimer);
      clearInterval(gpsJamTimer);
    };
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case 's': store.toggleLayer('satellites'); break;
        case 'a': store.toggleLayer('aircraft'); break;
        case 'v': store.toggleLayer('ships'); break;
        case 'w': store.toggleLayer('warZones'); break;
        case 'j': store.toggleLayer('gpsJam'); break;
        case 'o': store.toggleLayer('satelliteOrbits'); break;
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
        background: '#000',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <LoadingScreen
        progress={loadingProgress}
        status={loadingStatus}
        isVisible={!isLoaded}
      />

      {isLoaded && (
        <>
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
          />

          {/* Search bar */}
          <SearchBar
            aircraft={aircraft}
            ships={ships}
            satellites={satellites}
            conflictZones={conflictZones}
            onSelect={handleEntitySelect}
            onFlyTo={handleFlyTo}
          />

          {/* Main globe */}
          <div style={{ position: 'absolute', inset: 0 }}>
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
            />
          </div>

          {/* Left panel */}
          <FilterPanel
            layers={layers}
            onToggleLayer={(k) => store.toggleLayer(k as any)}
            counts={counts}
          />

          {/* Right panel — conflict sidebar */}
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

          {/* Time control */}
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

          {/* Alert panel */}
          <AlertPanel
            alerts={alerts}
            onDismiss={(id) => store.dismissAlert(id)}
            onFlyTo={handleFlyTo}
          />

          {/* Quick navigation */}
          <QuickNav
            onFlyTo={handleFlyTo}
            conflictZones={conflictZones}
          />

          {/* Legend */}
          <Legend />

          {/* Mini radar */}
          <MiniRadar
            aircraft={aircraft}
            ships={ships}
            satellites={satellites}
            conflictZones={conflictZones}
            visible={showMiniRadar}
            onToggle={() => setShowMiniRadar(v => !v)}
          />

          {/* Stats overlay */}
          <StatsOverlay
            aircraft={aircraft}
            ships={ships}
            satellites={satellites}
            conflictZones={conflictZones}
            gpsJamCells={gpsJamCells}
          />

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
                ? aircraft.find(a => a.icao24 === id)?.callsign ?? id
                : t === 'ship'
                ? ships.find(s => s.mmsi === id)?.name ?? id
                : satellites.find(s => s.id === id)?.name ?? id;
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

          {/* Keyboard help */}
          <KeyboardHelp
            visible={showKeyboardHelp}
            onClose={() => setShowKeyboardHelp(v => !v)}
          />

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
              zIndex: 100,
            }}
          >
            ⌨ ?
          </button>
        </>
      )}
    </div>
  );
}
