import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import * as satellite from 'satellite.js';

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// DATA HUB — Background fetch stores latest data in memory.
// Browser requests are served instantly from these stores.
// ═══════════════════════════════════════════════════════════════════════════════

// ── In-memory data stores ────────────────────────────────────────────────────
let latestAdsb = { time: 0, states: [] };
let latestAdsbUpdated = 0;
let adsbRateLimitedUntil = 0; // epoch ms — skip fetches until this time

let latestAis = [];
let latestAisUpdated = 0;
let aisRateLimitedUntil = 0;

let latestSatPositions = { satellites: [], time: 0, count: 0 };
let latestSatPositionsUpdated = 0;

// TLE text per group (used by satellite position computation)
const latestTle = {}; // group → { text, updated }

// ── TLE URLs ─────────────────────────────────────────────────────────────────
const TLE_URLS = {
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  gps:      'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
  military: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle',
  weather:  'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle',
  starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  active:   'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
};

const SAT_GROUPS = [
  { group: 'stations',  category: 'iss',        country: 'International' },
  { group: 'gps',       category: 'navigation',  country: 'USA' },
  { group: 'military',  category: 'military',    country: 'USA' },
  { group: 'weather',   category: 'weather',     country: 'Various' },
  { group: 'starlink',  category: 'starlink',    country: 'USA', limit: 50 },
];

const UA = 'World4DWarTrack/1.0 (github.com/Atvriders/world-4d-war-track)';

// ═══════════════════════════════════════════════════════════════════════════════
// SATELLITE HELPERS (unchanged logic, extracted for background use)
// ═══════════════════════════════════════════════════════════════════════════════

/** Parse 3-line TLE text into [{name, tle1, tle2}] */
function parseTLEText(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = [];
  let i = 0;
  while (i < lines.length) {
    const name = lines[i], line1 = lines[i + 1], line2 = lines[i + 2];
    if (name && line1 && line2 &&
        line1.startsWith('1 ') && line2.startsWith('2 ') &&
        line1.length >= 69 && line2.length >= 69) {
      results.push({ name, tle1: line1, tle2: line2 });
      i += 3;
    } else {
      i += 1;
    }
  }
  return results;
}

/** Categorize satellite by name */
function categorizeSat(name) {
  const u = name.toUpperCase();
  if (u === 'ISS (ZARYA)' || u === 'ISS') return 'iss';
  if (u.includes('STARLINK')) return 'starlink';
  if (u.includes('GPS') || u.includes('GLONASS') || u.includes('GALILEO') || u.includes('BEIDOU')) return 'navigation';
  if (u.includes('NOAA') || u.includes('GOES') || u.includes('METEOSAT')) return 'weather';
  if (u.includes('USA-') || u.includes('KH-') || u.includes('LACROSSE') || u.includes('MENTOR')) return 'spy';
  return 'other';
}

/** Compute footprint radius in km from altitude */
function footprintRadiusKm(altKm) {
  const R = 6371;
  return Math.acos(R / (R + altKm)) * R;
}

/** Compute ground track: array of [lat, lng] for next 90 min at 2 min steps */
function computeGroundTrack(satrec, baseTime) {
  const track = [];
  for (let m = 0; m <= 90; m += 2) {
    const d = new Date(baseTime + m * 60_000);
    const pv = satellite.propagate(satrec, d);
    if (!pv || typeof pv.position === 'boolean') continue;
    const gmst = satellite.gstime(d);
    const gd = satellite.eciToGeodetic(pv.position, gmst);
    track.push([
      Math.round(satellite.degreesLat(gd.latitude) * 1e4) / 1e4,
      Math.round(satellite.degreesLong(gd.longitude) * 1e4) / 1e4,
    ]);
  }
  return track;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND FETCH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Fetch ADS-B data from OpenSky — runs every 60s */
async function refreshAdsb() {
  // Skip if we're in a rate-limit backoff period
  if (Date.now() < adsbRateLimitedUntil) {
    const waitMin = Math.round((adsbRateLimitedUntil - Date.now()) / 60000);
    console.log(`[bg] ADS-B rate limited, skipping (${waitMin}min remaining)`);
    return;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch('https://opensky-network.org/api/states/all', {
      signal: controller.signal,
      headers: { 'User-Agent': UA },
    });
    if (res.status === 429) {
      adsbRateLimitedUntil = Date.now() + 30 * 60_000; // back off 30 minutes
      console.warn('[bg] ADS-B rate limited (429), backing off 30 minutes');
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      const data = await res.json();
      // Only replace if we got actual data
      if (data.states && data.states.length > 0) {
        latestAdsb = data;
        latestAdsbUpdated = Date.now();
        console.log(`[bg] ADS-B refreshed: ${data.states.length} aircraft`);
      } else {
        console.warn(`[bg] ADS-B API returned empty, keeping ${latestAdsb.states?.length || 0} aircraft from previous fetch`);
      }
    }
  } catch (err) {
    console.warn(`[bg] ADS-B refresh failed: ${err.message}, keeping ${latestAdsb.states?.length || 0} aircraft from previous fetch`);
  } finally {
    clearTimeout(timeoutId);
  }

}

/** Fetch AIS vessel data from AISHub — runs every 60s */
async function refreshAis() {
  if (Date.now() < aisRateLimitedUntil) {
    console.log(`[bg] AIS rate limited, skipping (${Math.round((aisRateLimitedUntil - Date.now()) / 60000)}min remaining)`);
    return;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      'http://data.aishub.net/ws.php?username=0&format=1&output=json&compress=0',
      { signal: controller.signal, headers: { 'User-Agent': UA } }
    );
    if (res.status === 429) {
      aisRateLimitedUntil = Date.now() + 15 * 60_000; // back off 15 minutes
      console.warn('[bg] AIS rate limited (429), backing off 15 minutes');
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 1) {
        latestAis = data;
        latestAisUpdated = Date.now();
        console.log(`[bg] AIS refreshed: ${data.length} vessels`);
      } else {
        console.warn(`[bg] AIS API returned empty, keeping ${latestAis.length} vessels from previous fetch`);
      }
    }
  } catch (err) {
    console.warn(`[bg] AIS refresh failed: ${err.message}, keeping ${latestAis.length} vessels from previous fetch`);
  } finally {
    clearTimeout(timeoutId);
  }

}

/** Fetch TLE data for a single group from CelesTrak */
async function fetchTleGroup(group) {
  const url = TLE_URLS[group];
  if (!url) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      latestTle[group] = { text, updated: Date.now() };
      return text;
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // Fallback: try celestrak.com mirror
  try {
    const fbGroup = group === 'gps' ? 'gps-ops' : group;
    const fbUrl = `https://celestrak.com/NORAD/elements/gp.php?GROUP=${fbGroup}&FORMAT=tle`;
    const ctrl2 = new AbortController();
    const tid2 = setTimeout(() => ctrl2.abort(), 10_000);
    const fb = await fetch(fbUrl, { signal: ctrl2.signal, headers: { 'User-Agent': UA } });
    clearTimeout(tid2);
    if (fb.ok) {
      const text = await fb.text();
      latestTle[group] = { text, updated: Date.now() };
      console.log(`[bg] TLE fallback celestrak.com succeeded for "${group}"`);
      return text;
    }
  } catch { /* both failed */ }

  return null;
}

/** Refresh all TLE data and recompute satellite positions — runs every 60min */
async function refreshSatellites() {
  try {
    // Fetch TLE for all groups in parallel
    await Promise.allSettled(
      Object.keys(TLE_URLS).map(group => fetchTleGroup(group))
    );

    // Now compute positions from whatever TLE data we have
    const now = new Date();
    const nowMs = now.getTime();
    const allSats = [];
    const seen = new Set();

    for (const cfg of SAT_GROUPS) {
      const tleEntry = latestTle[cfg.group];
      if (!tleEntry || !tleEntry.text) continue;

      let parsed = parseTLEText(tleEntry.text);
      if (cfg.limit) parsed = parsed.slice(0, cfg.limit);

      for (const { name, tle1, tle2 } of parsed) {
        const noradId = tle1.substring(2, 7).trim();
        if (seen.has(noradId)) continue;
        seen.add(noradId);

        try {
          const satrec = satellite.twoline2satrec(tle1, tle2);
          if (satrec.error !== 0) continue;
          const pv = satellite.propagate(satrec, now);
          if (!pv || typeof pv.position === 'boolean' || typeof pv.velocity === 'boolean') continue;

          const posEci = pv.position;
          const velEci = pv.velocity;
          const gmst = satellite.gstime(now);
          const gd = satellite.eciToGeodetic(posEci, gmst);

          const lat = satellite.degreesLat(gd.latitude);
          const lng = satellite.degreesLong(gd.longitude);
          const alt = gd.height;
          const velocity = Math.sqrt(velEci.x ** 2 + velEci.y ** 2 + velEci.z ** 2);

          // ECI to ENU heading
          const sinLat = Math.sin(gd.latitude), cosLat = Math.cos(gd.latitude);
          const sinLng = Math.sin(gd.longitude), cosLng = Math.cos(gd.longitude);
          const vE = -sinLng * velEci.x + cosLng * velEci.y;
          const vN = -sinLat * cosLng * velEci.x - sinLat * sinLng * velEci.y + cosLat * velEci.z;
          let heading = Math.atan2(vE, vN) * (180 / Math.PI);
          if (heading < 0) heading += 360;

          const detectedCat = categorizeSat(name);
          const fp = footprintRadiusKm(alt);
          const groundTrack = computeGroundTrack(satrec, nowMs);

          allSats.push({
            id: noradId,
            name,
            category: detectedCat !== 'other' ? detectedCat : cfg.category,
            country: cfg.country,
            lat: Math.round(lat * 1e4) / 1e4,
            lng: Math.round(lng * 1e4) / 1e4,
            alt: Math.round(alt * 100) / 100,
            velocity: Math.round(velocity * 1000) / 1000,
            heading: Math.round(heading * 10) / 10,
            tle1,
            tle2,
            footprintRadius: Math.round(fp * 10) / 10,
            isActive: true,
            groundTrack,
            lastUpdated: nowMs,
          });
        } catch {
          continue;
        }
      }
    }

    // Only replace if we got actual data (don't overwrite seed with empty)
    if (allSats.length > 0) {
      latestSatPositions = { satellites: allSats, time: nowMs, count: allSats.length };
      latestSatPositionsUpdated = nowMs;
      console.log(`[bg] Satellites refreshed: ${allSats.length} positions computed`);
    } else {
      console.warn(`[bg] Satellites API returned empty, keeping ${latestSatPositions.count || 0} satellites from previous fetch`);
    }
  } catch (err) {
    console.error(`[bg] Satellite refresh failed: ${err.message}, keeping ${latestSatPositions.count || 0} satellites from previous fetch`);
  }

}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS — Serve instantly from memory
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    dataAge: {
      adsb: latestAdsbUpdated ? `${Math.round((Date.now() - latestAdsbUpdated) / 1000)}s ago` : 'never',
      ais: latestAisUpdated ? `${Math.round((Date.now() - latestAisUpdated) / 1000)}s ago` : 'never',
      satellites: latestSatPositionsUpdated ? `${Math.round((Date.now() - latestSatPositionsUpdated) / 1000)}s ago` : 'never',
    },
  });
});

// ── GET /api/adsb/states ─────────────────────────────────────────────────────
// Instant response from memory — no proxy delay
app.get('/api/adsb/states', (req, res) => {
  res.json(latestAdsb);
});

// ── GET /api/satellites/tle ──────────────────────────────────────────────────
// Serves cached TLE text from memory
app.get('/api/satellites/tle', (req, res) => {
  const group = req.query.group || 'active';
  if (!TLE_URLS[group]) {
    return res.status(400).type('text/plain').send('Unknown group');
  }

  const tleEntry = latestTle[group];
  if (tleEntry && tleEntry.text) {
    return res.type('text/plain').send(tleEntry.text);
  }

  // No data yet — return empty (background fetch will populate it)
  res.type('text/plain').send('');
});

// ── GET /api/satellites/positions ────────────────────────────────────────────
// Instant response from memory — no SGP4 computation on request
app.get('/api/satellites/positions', (req, res) => {
  res.json(latestSatPositions);
});

// ── GET /api/ais/vessels ─────────────────────────────────────────────────────
// Instant response from memory
app.get('/api/ais/vessels', (req, res) => {
  res.json(latestAis);
});

// ── GET /api/gpsjam/current ──────────────────────────────────────────────────
app.get('/api/gpsjam/current', (req, res) => {
  res.status(503).json({ error: 'GPSJam API not available, using static data' });
});

// ── Serve static frontend in production ──────────────────────────────────────
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER + BACKGROUND FETCH INTERVALS
// ═══════════════════════════════════════════════════════════════════════════════

async function initialFetch() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[boot] Initial data fetch attempt ${attempt}/3...`);
    await refreshAdsb();
    await refreshAis();
    await refreshSatellites();

    const hasData = (latestAdsb.states?.length > 0) ||
                    (latestAis.length > 0) ||
                    (latestSatPositions.count > 0);
    if (hasData) {
      console.log(`[boot] Data loaded: ${latestAdsb.states?.length || 0} aircraft, ${latestAis.length} vessels, ${latestSatPositions.count} satellites`);
      break;
    }
    if (attempt < 3) {
      console.log(`[boot] No data yet, retrying in 10s...`);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] World4DWarTrack server listening on port ${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/health`);
  console.log(`  Frontend: http://localhost:${PORT}/`);
  console.log('  Starting background data fetching...');

  // Kick off initial fetches with retry logic
  initialFetch();

  // Schedule recurring background fetches
  setInterval(refreshAdsb, 900_000);       // every 15 minutes (OpenSky free: ~100 req/day)
  setInterval(refreshAis, 300_000);        // every 5 minutes (AISHub is more lenient)
  setInterval(refreshSatellites, 3_600_000); // every 60 minutes (CelesTrak fair use)
});
