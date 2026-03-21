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

// In-memory cache
const cache = new Map(); // key → { data, expires }
function getCached(key) {
  // Evict oldest entries if cache grows too large
  if (cache.size > 100) {
    const entriesToDelete = [...cache.entries()]
      .sort((a, b) => a[1].expires - b[1].expires)
      .slice(0, cache.size - 100);
    for (const [k] of entriesToDelete) {
      cache.delete(k);
    }
  }
  const c = cache.get(key);
  if (!c) return null;
  if (c.expires <= Date.now()) {
    cache.delete(key); // clean up expired entries so cache.has() is accurate
    return null;
  }
  return c.data;
}
function setCached(key, data, ttlMs) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// Middleware
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

// ── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── GET /api/adsb/states ─────────────────────────────────────────────────────
// OpenSky allows ~4 req/hour for unauthenticated users → cache 60s
let adsbFetchInFlight = false;

app.get('/api/adsb/states', async (req, res) => {
  const CACHE_KEY = 'adsb:states';
  const TTL_MS = 60_000; // 60 seconds

  const cached = getCached(CACHE_KEY);
  if (cached === null && cache.has(CACHE_KEY)) {
    // Cache entry exists but data is null → rate-limited backoff
    return res.status(429).json({ error: 'Rate limited', retryAfter: 600 });
  }
  if (cached) {
    return res.json(cached);
  }

  // If a request is already in flight, return empty fallback to avoid pile-up
  if (adsbFetchInFlight) {
    return res.json({ time: Date.now() / 1000, states: [] });
  }

  adsbFetchInFlight = true;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://opensky-network.org/api/states/all', {
      headers: { 'User-Agent': 'World4DWarTrack/1.0 (github.com/Atvriders/world-4d-war-track)' },
      signal: controller.signal,
    });
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const backoffMs = retryAfter ? parseInt(retryAfter) * 1000 : 600_000; // 10 min default
      setCached(CACHE_KEY, null, backoffMs);
      return res.status(429).json({ error: 'Rate limited', retryAfter: backoffMs / 1000 });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    setCached(CACHE_KEY, data, TTL_MS);
    res.json(data);
  } catch (err) {
    console.error('[adsb] fetch error:', err.message);
    res.status(502).json({ time: Date.now() / 1000, states: [] });
  } finally {
    clearTimeout(timeoutId);
    adsbFetchInFlight = false;
  }
});

// ── GET /api/satellites/tle ──────────────────────────────────────────────────
const TLE_URLS = {
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  gps:      'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
  military: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle',
  weather:  'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle',
  starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  active:   'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
};

app.get('/api/satellites/tle', async (req, res) => {
  const group = req.query.group || 'active';
  const url = TLE_URLS[group];

  if (!url) {
    return res.status(400).type('text/plain').send('Unknown group');
  }

  const CACHE_KEY = `tle:${group}`;
  const TTL_MS = 3_600_000; // 60 minutes — CelesTrak fair use is ~1 req per 2 hours

  const cached = getCached(CACHE_KEY);
  if (cached === null && cache.has(CACHE_KEY)) {
    return res.status(429).type('text/plain').send('Rate limited');
  }
  if (cached) {
    return res.type('text/plain').send(cached);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'World4DWarTrack/1.0 (github.com/Atvriders/world-4d-war-track)' },
      signal: controller.signal,
    });
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const backoffMs = retryAfter ? parseInt(retryAfter) * 1000 : 600_000;
      setCached(CACHE_KEY, null, backoffMs);
      return res.status(429).type('text/plain').send('Rate limited');
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    setCached(CACHE_KEY, text, TTL_MS);
    res.type('text/plain').send(text);
  } catch (err) {
    console.error(`[satellites] fetch error for group "${group}":`, err.message);
    res.status(502).type('text/plain').send('');
  } finally {
    clearTimeout(timeoutId);
  }
});

// ── GET /api/satellites/positions ────────────────────────────────────────────
// Pre-computes satellite positions server-side using SGP4 propagation.
// The browser receives ready-to-render positions — no satellite.js math needed.
// Returns { satellites: [...], time, count }. Cached for 60 seconds.

const SAT_GROUPS = [
  { group: 'stations',  category: 'iss',        country: 'International' },
  { group: 'gps',       category: 'navigation',  country: 'USA' },
  { group: 'military',  category: 'military',    country: 'USA' },
  { group: 'weather',   category: 'weather',     country: 'Various' },
  { group: 'starlink',  category: 'starlink',    country: 'USA', limit: 50 },
];

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

let satPositionsFetchInFlight = false;

app.get('/api/satellites/positions', async (req, res) => {
  const CACHE_KEY = 'sat:positions';
  const TTL_MS = 60_000; // 60 seconds

  const cached = getCached(CACHE_KEY);
  if (cached) return res.json(cached);

  // Prevent concurrent fetches piling up
  if (satPositionsFetchInFlight) {
    return res.json({ satellites: [], time: Date.now(), count: 0 });
  }

  satPositionsFetchInFlight = true;
  try {
    const now = new Date();
    const nowMs = now.getTime();
    const allSats = [];
    const seen = new Set();

    for (const cfg of SAT_GROUPS) {
      // Reuse TLE cache if available, otherwise fetch from CelesTrak
      const tleCacheKey = `tle:${cfg.group}`;
      let tleText = getCached(tleCacheKey);

      if (!tleText) {
        const url = TLE_URLS[cfg.group];
        if (!url) continue;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'World4DWarTrack/1.0 (github.com/Atvriders/world-4d-war-track)' },
            signal: controller.signal,
          });
          if (!response.ok) { clearTimeout(timeoutId); continue; }
          tleText = await response.text();
          setCached(tleCacheKey, tleText, 3_600_000);
        } catch {
          continue;
        } finally {
          clearTimeout(timeoutId);
        }
      }

      let parsed = parseTLEText(tleText);
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

          // ECI→ENU heading (proper, no second propagation needed)
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

    const result = { satellites: allSats, time: nowMs, count: allSats.length };
    setCached(CACHE_KEY, result, TTL_MS);
    res.json(result);
  } catch (err) {
    console.error('[satellites/positions] error:', err.message);
    res.status(502).json({ satellites: [], time: Date.now(), count: 0, error: err.message });
  } finally {
    satPositionsFetchInFlight = false;
  }
});

// ── GET /api/ais/vessels ─────────────────────────────────────────────────────
app.get('/api/ais/vessels', async (req, res) => {
  const CACHE_KEY = 'ais:vessels';
  const TTL_MS = 60_000; // 1 minute

  const cached = getCached(CACHE_KEY);
  if (cached === null && cache.has(CACHE_KEY)) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: 600 });
  }
  if (cached) {
    return res.json(cached);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      'http://data.aishub.net/ws.php?username=0&format=1&output=json&compress=0',
      { headers: { 'User-Agent': 'World4DWarTrack/1.0 (github.com/Atvriders/world-4d-war-track)' }, signal: controller.signal }
    );
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const backoffMs = retryAfter ? parseInt(retryAfter) * 1000 : 600_000;
      setCached(CACHE_KEY, null, backoffMs);
      return res.status(429).json({ error: 'Rate limited', retryAfter: backoffMs / 1000 });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    setCached(CACHE_KEY, data, TTL_MS);
    res.json(data);
  } catch (err) {
    console.error('[ais] fetch error:', err.message);
    res.status(502).json([]);
  } finally {
    clearTimeout(timeoutId);
  }
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

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] World4DWarTrack server listening on port ${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/health`);
  console.log(`  Frontend: http://localhost:${PORT}/`);
});
