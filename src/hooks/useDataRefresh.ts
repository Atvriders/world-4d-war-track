/**
 * useDataRefresh.ts — Custom hooks for polling, alert generation, and globe time
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { fetchAircraft } from '../services/adsb';
import { fetchShips } from '../services/ais';
import { fetchSatellitePositions, propagateSatellite, getSatelliteGroundTrack, getFootprintRadius } from '../services/satellite';
import { fetchLiveGpsJamData } from '../services/gpsJam';
import { RateLimitError } from '../services/rateLimitError';
import { distanceKm, pointNearConflictZone } from '../utils/geoMath';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AIRCRAFT_INTERVAL = 60_000;       // 60 s — OpenSky free tier limit
const SHIP_INTERVAL = 60_000;           // 60 s — AISHub is OK with this
const SATELLITE_INTERVAL = 3_600_000;   // 60 min — CelesTrak fair use
const GPS_JAM_INTERVAL = 600_000;       // 10 min — static data anyway
const RETRY_BACKOFF = [10_000, 20_000, 40_000, 60_000]; // exponential backoff, capped at 60s
const ALERT_CHECK_INTERVAL = 30_000;    // 30 s
const ALERTED_KEYS_CLEANUP_MS = 3_600_000; // 1 hour

const AIRCRAFT_CONFLICT_RADIUS_KM = 200;
const SHIP_CONFLICT_RADIUS_KM = 300;
const SATELLITE_MAX_ALT_KM = 600;
const GPS_JAM_CRITICAL_LEVEL = 0.9;

// ---------------------------------------------------------------------------
// Hook 1: useDataRefresh
// ---------------------------------------------------------------------------

export function useDataRefresh(): { refresh: () => void } {
  const {
    setAircraft,
    setShips,
    setSatellites,
    setGpsJamCells,
    setLoading,
    setError,
    setLastRefresh,
  } = useStore();

  // Track retry timeouts so they can be cleared on unmount
  const retryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Track retry counts per source to prevent unbounded retries
  const retryCounts = useRef<Record<string, number>>({
    aircraft: 0,
    ships: 0,
    satellites: 0,
    gpsJam: 0,
  });
  // Prevent duplicate simultaneous requests per source
  const inFlight = useRef<Record<string, boolean>>({ aircraft: false, ships: false, satellites: false, gpsJam: false });

  /** Schedule a retry with exponential backoff — never gives up.
   *  If retryAfterMs is provided (from a 429 Retry-After header), use that instead. */
  const scheduleRetry = useCallback((source: string, fn: () => void, retryAfterMs?: number) => {
    const attempt = retryCounts.current[source];
    const backoffDelay = RETRY_BACKOFF[Math.min(attempt, RETRY_BACKOFF.length - 1)];
    const delay = retryAfterMs != null ? Math.max(retryAfterMs, backoffDelay) : backoffDelay;
    retryCounts.current[source]++;
    console.warn(`[useDataRefresh] ${source}: retrying in ${delay / 1000}s... (attempt ${attempt + 1})${retryAfterMs != null ? ' [429 rate-limited]' : ''}`);
    retryTimers.current.push(setTimeout(fn, delay));
  }, []);

  // Stable fetch functions so interval callbacks don't capture stale closures

  const fetchAircraftData = useCallback(async () => {
    if (inFlight.current.aircraft) return;
    inFlight.current.aircraft = true;
    setLoading('aircraft', true);
    setError('aircraft', null);
    try {
      const data = await fetchAircraft();
      if (data.length > 0) { setAircraft(data); setLastRefresh('aircraft'); }
      retryCounts.current.aircraft = 0;
      // Dismiss offline alert if it was active
      const store = useStore.getState();
      const offlineAlert = store.alerts?.find(a => a.id === 'offline-aircraft');
      if (offlineAlert && !offlineAlert.dismissed) {
        store.dismissAlert('offline-aircraft');
        store.addAlert({
          id: `online-aircraft-${Date.now()}`,
          type: 'system',
          severity: 'info',
          message: 'ADS-B aircraft feed connected — live data flowing',
          timestamp: new Date().toISOString(),
          dismissed: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useDataRefresh] aircraft fetch failed:', message);
      setError('aircraft', message);
      useStore.getState().addAlert({
        id: 'offline-aircraft',
        type: 'system',
        severity: 'warning',
        message: 'ADS-B aircraft feed offline — retrying with backoff',
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
      const retryAfterMs = err instanceof RateLimitError ? err.retryAfterMs : undefined;
      scheduleRetry('aircraft', () => { fetchAircraftData(); }, retryAfterMs);
    } finally {
      inFlight.current.aircraft = false;
      setLoading('aircraft', false);
    }
  }, [setAircraft, setLoading, setError, setLastRefresh, scheduleRetry]);

  const fetchShipData = useCallback(async () => {
    if (inFlight.current.ships) return;
    inFlight.current.ships = true;
    setLoading('ships', true);
    setError('ships', null);
    try {
      const data = await fetchShips();
      if (data.length > 0) { setShips(data); setLastRefresh('ships'); }
      retryCounts.current.ships = 0;
      // Dismiss offline alert if it was active
      const store = useStore.getState();
      const offlineAlert = store.alerts?.find(a => a.id === 'offline-ships');
      if (offlineAlert && !offlineAlert.dismissed) {
        store.dismissAlert('offline-ships');
        store.addAlert({
          id: `online-ships-${Date.now()}`,
          type: 'system',
          severity: 'info',
          message: 'AIS vessel feed connected — live data flowing',
          timestamp: new Date().toISOString(),
          dismissed: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useDataRefresh] ships fetch failed:', message);
      setError('ships', message);
      useStore.getState().addAlert({
        id: 'offline-ships',
        type: 'system',
        severity: 'warning',
        message: 'AIS vessel feed offline — retrying every 60s',
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
      const retryAfterMs = err instanceof RateLimitError ? err.retryAfterMs : undefined;
      scheduleRetry('ships', () => { fetchShipData(); }, retryAfterMs);
    } finally {
      inFlight.current.ships = false;
      setLoading('ships', false);
    }
  }, [setShips, setLoading, setError, setLastRefresh, scheduleRetry]);

  const fetchSatelliteData = useCallback(async () => {
    if (inFlight.current.satellites) return;
    inFlight.current.satellites = true;
    setLoading('satellites', true);
    setError('satellites', null);
    try {
      const data = await fetchSatellitePositions();
      // Skip overwriting satellites when user is time-scrubbing (viewing historical positions)
      const currentTimeOffset = useStore.getState().timeOffset;
      if (data.length > 0 && currentTimeOffset === 0) { setSatellites(data); setLastRefresh('satellites'); }
      retryCounts.current.satellites = 0;
      // Dismiss offline alert if it was active
      const store = useStore.getState();
      const offlineAlert = store.alerts?.find(a => a.id === 'offline-satellites');
      if (offlineAlert && !offlineAlert.dismissed) {
        store.dismissAlert('offline-satellites');
        store.addAlert({
          id: `online-satellites-${Date.now()}`,
          type: 'system',
          severity: 'info',
          message: 'Satellite TLE feed connected — live data flowing',
          timestamp: new Date().toISOString(),
          dismissed: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useDataRefresh] satellites fetch failed:', message);
      setError('satellites', message);
      useStore.getState().addAlert({
        id: 'offline-satellites',
        type: 'system',
        severity: 'warning',
        message: 'Satellite TLE feed offline — retrying with backoff',
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
      const retryAfterMs = err instanceof RateLimitError ? err.retryAfterMs : undefined;
      scheduleRetry('satellites', () => { fetchSatelliteData(); }, retryAfterMs);
    } finally {
      inFlight.current.satellites = false;
      setLoading('satellites', false);
    }
  }, [setSatellites, setLoading, setError, setLastRefresh, scheduleRetry]);

  const fetchGpsJamData = useCallback(async () => {
    if (inFlight.current.gpsJam) return;
    inFlight.current.gpsJam = true;
    setLoading('gpsJam', true);
    setError('gpsJam', null);
    try {
      const data = await fetchLiveGpsJamData();
      setGpsJamCells(data);
      setLastRefresh('gpsJam');
      retryCounts.current.gpsJam = 0;
      // Dismiss offline alert if it was active
      const store = useStore.getState();
      const offlineAlert = store.alerts?.find(a => a.id === 'offline-gpsjam');
      if (offlineAlert && !offlineAlert.dismissed) {
        store.dismissAlert('offline-gpsjam');
        store.addAlert({
          id: `online-gpsjam-${Date.now()}`,
          type: 'system',
          severity: 'info',
          message: 'GPS jamming feed connected — live data flowing',
          timestamp: new Date().toISOString(),
          dismissed: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useDataRefresh] gpsJam fetch failed:', message);
      setError('gpsJam', message);
      useStore.getState().addAlert({
        id: 'offline-gpsjam',
        type: 'system',
        severity: 'info',
        message: 'GPS jamming feed offline — using static OSINT data',
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
      const retryAfterMs = err instanceof RateLimitError ? err.retryAfterMs : undefined;
      scheduleRetry('gpsJam', () => { fetchGpsJamData(); }, retryAfterMs);
    } finally {
      inFlight.current.gpsJam = false;
      setLoading('gpsJam', false);
    }
  }, [setGpsJamCells, setLoading, setError, setLastRefresh, scheduleRetry]);

  // Public manual-refresh trigger — fetches all sources immediately
  const refresh = useCallback(() => {
    // Reset retry counts on manual refresh
    retryCounts.current = { aircraft: 0, ships: 0, satellites: 0, gpsJam: 0 };
    fetchAircraftData();
    fetchShipData();
    fetchSatelliteData();
    fetchGpsJamData();
  }, [fetchAircraftData, fetchShipData, fetchSatelliteData, fetchGpsJamData]);

  useEffect(() => {
    // Immediate initial fetch
    refresh();

    // Periodic intervals
    const aircraftTimer = setInterval(fetchAircraftData, AIRCRAFT_INTERVAL);
    const shipTimer = setInterval(fetchShipData, SHIP_INTERVAL);
    const satelliteTimer = setInterval(fetchSatelliteData, SATELLITE_INTERVAL);
    const gpsJamTimer = setInterval(fetchGpsJamData, GPS_JAM_INTERVAL);

    return () => {
      clearInterval(aircraftTimer);
      clearInterval(shipTimer);
      clearInterval(satelliteTimer);
      clearInterval(gpsJamTimer);
      // Clear any pending retry timeouts
      retryTimers.current.forEach((t) => clearTimeout(t));
      retryTimers.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { refresh };
}

// ---------------------------------------------------------------------------
// Hook 2: useAlertGenerator
// ---------------------------------------------------------------------------

export function useAlertGenerator(): void {
  const aircraft = useStore((s) => s.aircraft);
  const ships = useStore((s) => s.ships);
  const satellites = useStore((s) => s.satellites);
  const gpsJamCells = useStore((s) => s.gpsJamCells);
  const conflictZones = useStore((s) => s.conflictZones);
  const addAlert = useStore((s) => s.addAlert);

  // Tracks which alert keys have already fired this session to deduplicate
  const alertedKeys = useRef(new Set<string>());

  /** Emit an alert only if its dedup key is unseen */
  const maybeAlert = useCallback(
    (
      key: string,
      alert: Parameters<typeof addAlert>[0]
    ) => {
      if (alertedKeys.current.has(key)) return;
      alertedKeys.current.add(key);
      addAlert(alert);
    },
    [addAlert]
  );

  /** Generate a simple unique id for an alert */
  const newId = () =>
    `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // ----- Alert check --------------------------------------------------------

  const runChecks = useCallback(() => {
    const now = new Date().toISOString();

    // 1. Military aircraft near conflict zone (within 200 km)
    for (const ac of aircraft) {
      if (!ac.isMilitary) continue;
      if (ac.onGround) continue;

      for (const zone of conflictZones) {
        const near = pointNearConflictZone(ac.lat, ac.lng, zone, AIRCRAFT_CONFLICT_RADIUS_KM);
        if (!near) continue;

        const key = `military-aircraft-${ac.icao24}-${zone.id}`;
        maybeAlert(key, {
          id: newId(),
          type: 'military-aircraft',
          severity: 'warning',
          message: `Military aircraft ${ac.callsign || ac.icao24} detected near ${zone.name}`,
          lat: ac.lat,
          lng: ac.lng,
          entityId: ac.icao24,
          timestamp: now,
          dismissed: false,
        });
      }
    }

    // 2. Warship in contested waters (within 300 km of conflict zone)
    for (const ship of ships) {
      const isWarship = ship.type === 'warship' || ship.type === 'military';
      if (!isWarship) continue;

      for (const zone of conflictZones) {
        const near = pointNearConflictZone(ship.lat, ship.lng, zone, SHIP_CONFLICT_RADIUS_KM);
        if (!near) continue;

        const key = `warship-${ship.mmsi}-${zone.id}`;
        maybeAlert(key, {
          id: newId(),
          type: 'warship',
          severity: 'info',
          message: `Warship ${ship.name || ship.mmsi} operating near ${zone.name}`,
          lat: ship.lat,
          lng: ship.lng,
          entityId: ship.mmsi,
          timestamp: now,
          dismissed: false,
        });
      }
    }

    // 3. GPS jamming at critical level (>= 0.9)
    for (const cell of gpsJamCells) {
      if (cell.level < GPS_JAM_CRITICAL_LEVEL) continue;

      const location = `${cell.lat.toFixed(4)}, ${cell.lng.toFixed(4)}`;
      const key = `gps-jam-${cell.lat.toFixed(4)}-${cell.lng.toFixed(4)}`;
      maybeAlert(key, {
        id: newId(),
        type: 'gps-jam',
        severity: 'critical',
        message: `CRITICAL GPS jamming/spoofing active: ${location}`,
        lat: cell.lat,
        lng: cell.lng,
        timestamp: now,
        dismissed: false,
      });
    }

    // 4. Emergency squawk codes
    const EMERGENCY_SQUAWKS: Record<string, { label: string; severity: 'critical' | 'warning' }> = {
      '7500': { label: 'HIJACK', severity: 'critical' },
      '7600': { label: 'RADIO FAILURE', severity: 'warning' },
      '7700': { label: 'GENERAL EMERGENCY', severity: 'critical' },
    };

    for (const ac of aircraft) {
      if (!ac.squawk) continue;
      const info = EMERGENCY_SQUAWKS[ac.squawk];
      if (!info) continue;

      const key = `emergency-squawk-${ac.icao24}-${ac.squawk}`;
      const flightLevel = Math.round(ac.altitude / 100)
        .toString()
        .padStart(3, '0');
      const callsign = ac.callsign || ac.icao24;
      const country = ac.country || 'unknown location';

      maybeAlert(key, {
        id: newId(),
        type: 'emergency-squawk',
        severity: info.severity,
        message: `EMERGENCY: ${callsign} squawking ${ac.squawk} (${info.label}) over ${country} at FL${flightLevel}`,
        lat: ac.lat,
        lng: ac.lng,
        entityId: ac.icao24,
        timestamp: now,
        dismissed: false,
      });
    }

    // 5. Satellite passing over conflict zone (alt < 600 km, within footprint)
    for (const sat of satellites) {
      if (sat.alt >= SATELLITE_MAX_ALT_KM) continue;

      for (const zone of conflictZones) {
        // Use footprintRadius as the buffer — satellite covers ground within that radius
        const near = pointNearConflictZone(sat.lat, sat.lng, zone, sat.footprintRadius);
        if (!near) continue;

        // Distance check: satellite sub-point must be within footprintRadius
        // We refine with a simple distance check to the zone centroid area;
        // pointNearConflictZone already does a bbox+buffer check, which is sufficient.
        const key = `satellite-pass-${sat.id}-${zone.id}`;
        maybeAlert(key, {
          id: newId(),
          type: 'satellite-pass',
          severity: 'info',
          message: `Satellite ${sat.name} passing over ${zone.name}`,
          lat: sat.lat,
          lng: sat.lng,
          entityId: sat.id,
          timestamp: now,
          dismissed: false,
        });
      }
    }
  }, [aircraft, ships, satellites, gpsJamCells, conflictZones, maybeAlert]);

  // Periodically clear alertedKeys to prevent unbounded memory growth
  useEffect(() => {
    const cleanup = setInterval(() => {
      alertedKeys.current.clear();
    }, ALERTED_KEYS_CLEANUP_MS);
    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    // Run immediately on mount / data change
    runChecks();

    // Periodic re-check
    const timer = setInterval(runChecks, ALERT_CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, [runChecks]);
}

// ---------------------------------------------------------------------------
// Hook 3: useSatelliteTimePropagation — 4D time-travel for satellite positions
// ---------------------------------------------------------------------------

/**
 * Watches `timeOffset` and re-propagates all satellite positions, ground
 * tracks, and footprints so they reflect the adjusted time.  This runs
 * entirely client-side using already-fetched TLE data stored on each entity.
 *
 * Debounced to avoid hammering the CPU while the user scrubs the slider.
 */
export function useSatelliteTimePropagation(): void {
  const satellites = useStore((s) => s.satellites);
  const timeOffset = useStore((s) => s.timeOffset);
  const setSatellites = useStore((s) => s.setSatellites);

  // Keep a ref to satellites so we don't re-trigger the effect when
  // setSatellites updates the array (we only want to react to timeOffset).
  const satellitesRef = useRef(satellites);
  satellitesRef.current = satellites;

  // Track the last timeOffset we propagated for so we skip the initial 0.
  const lastPropagatedOffset = useRef<number>(0);

  useEffect(() => {
    // Skip if offset hasn't actually changed (avoids work on initial mount
    // or when other state changes trigger a re-render).
    if (timeOffset === lastPropagatedOffset.current) return;

    const debounceTimer = setTimeout(() => {
      const sats = satellitesRef.current;
      if (sats.length === 0) return;

      const adjustedNow = Date.now() + timeOffset * 60_000;
      const adjustedDate = new Date(adjustedNow);

      const updated = sats.map((sat) => {
        const pos = propagateSatellite(sat.name, sat.tle1, sat.tle2, adjustedDate);
        if (!pos) return sat; // keep previous position if propagation fails

        const groundTrack = getSatelliteGroundTrack(sat.tle1, sat.tle2, 90, 2, adjustedNow);
        const footprintRadius = getFootprintRadius(pos.alt);

        return {
          ...sat,
          lat: pos.lat,
          lng: pos.lng,
          alt: pos.alt,
          velocity: pos.velocity,
          heading: pos.heading,
          groundTrack,
          footprintRadius,
          lastUpdated: adjustedNow,
        };
      });

      lastPropagatedOffset.current = timeOffset;
      setSatellites(updated);
    }, 80); // 80ms debounce — responsive but not excessive

    return () => clearTimeout(debounceTimer);
  }, [timeOffset, setSatellites]);
}

// ---------------------------------------------------------------------------
// Hook 4: useGlobeTime
// ---------------------------------------------------------------------------

interface GlobeTimeResult {
  currentTime: Date;
  displayTime: string;
}

export function useGlobeTime(): GlobeTimeResult {
  const timeOffset = useStore((s) => s.timeOffset);
  const isPlaying = useStore((s) => s.isPlaying);
  const playSpeed = useStore((s) => s.playSpeed);
  const setTimeOffset = useStore((s) => s.setTimeOffset);

  // Derive the adjusted Date from timeOffset (minutes from now)
  const currentTime = new Date(Date.now() + timeOffset * 60 * 1000);

  // Format for display as "HH:MM UTC, DD Mon YYYY"
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const displayTime = [
    `${pad(currentTime.getUTCHours())}:${pad(currentTime.getUTCMinutes())} UTC,`,
    `${pad(currentTime.getUTCDate())} ${months[currentTime.getUTCMonth()]} ${currentTime.getUTCFullYear()}`,
  ].join(' ');

  // Use refs for timeOffset and playSpeed inside the interval to avoid
  // recreating it every tick or when playSpeed changes mid-play
  const timeOffsetRef = useRef(timeOffset);
  timeOffsetRef.current = timeOffset;

  const playSpeedRef = useRef(playSpeed);
  playSpeedRef.current = playSpeed;

  // When playing, auto-increment timeOffset at rate of playSpeed min/s
  useEffect(() => {
    if (!isPlaying) return;

    const TICK_MS = 1000; // update every real second
    const timer = setInterval(() => {
      setTimeOffset(timeOffsetRef.current + playSpeedRef.current);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [isPlaying, setTimeOffset]);

  return { currentTime, displayTime };
}
