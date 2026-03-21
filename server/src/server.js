import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// In-memory cache
const cache = new Map(); // key → { data, expires }
function getCached(key) {
  const c = cache.get(key);
  return c && c.expires > Date.now() ? c.data : null;
}
function setCached(key, data, ttlMs) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// Middleware
app.use(compression());
app.use(cors());
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
// Rate-limited to one outgoing request per 10 seconds
let adsbFetchInFlight = false;

app.get('/api/adsb/states', async (req, res) => {
  const CACHE_KEY = 'adsb:states';
  const TTL_MS = 10_000;

  const cached = getCached(CACHE_KEY);
  if (cached) {
    return res.json(cached);
  }

  // If a request is already in flight, return empty fallback to avoid pile-up
  if (adsbFetchInFlight) {
    return res.json({ time: Date.now() / 1000, states: [] });
  }

  adsbFetchInFlight = true;
  try {
    const response = await fetch('https://opensky-network.org/api/states/all', {
      headers: { 'User-Agent': 'World4DWarTrack/1.0' },
    });
    const data = await response.json();
    setCached(CACHE_KEY, data, TTL_MS);
    res.json(data);
  } catch (err) {
    console.error('[adsb] fetch error:', err.message);
    res.json({ time: Date.now() / 1000, states: [] });
  } finally {
    adsbFetchInFlight = false;
  }
});

// ── GET /api/satellites/tle ──────────────────────────────────────────────────
const TLE_URLS = {
  stations: 'https://celestrak.org/pub/TLE/tle/stations.txt',
  gps:      'https://celestrak.org/pub/TLE/tle/gnss.txt',
  military: 'https://celestrak.org/pub/TLE/tle/military.txt',
  weather:  'https://celestrak.org/pub/TLE/tle/weather.txt',
  starlink: 'https://celestrak.org/pub/TLE/tle/starlink.txt',
  active:   'https://celestrak.org/pub/TLE/tle/active.txt',
};

app.get('/api/satellites/tle', async (req, res) => {
  const group = req.query.group || 'active';
  const url = TLE_URLS[group];

  if (!url) {
    return res.status(400).type('text/plain').send('Unknown group');
  }

  const CACHE_KEY = `tle:${group}`;
  const TTL_MS = 5 * 60_000; // 5 minutes

  const cached = getCached(CACHE_KEY);
  if (cached) {
    return res.type('text/plain').send(cached);
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'World4DWarTrack/1.0' },
    });
    const text = await response.text();
    setCached(CACHE_KEY, text, TTL_MS);
    res.type('text/plain').send(text);
  } catch (err) {
    console.error(`[satellites] fetch error for group "${group}":`, err.message);
    res.type('text/plain').send('');
  }
});

// ── GET /api/ais/vessels ─────────────────────────────────────────────────────
app.get('/api/ais/vessels', async (req, res) => {
  const CACHE_KEY = 'ais:vessels';
  const TTL_MS = 60_000; // 1 minute

  const cached = getCached(CACHE_KEY);
  if (cached) {
    return res.json(cached);
  }

  try {
    const response = await fetch(
      'http://data.aishub.net/ws.php?username=0&format=1&output=json&compress=0',
      { headers: { 'User-Agent': 'World4DWarTrack/1.0' } }
    );
    const data = await response.json();
    setCached(CACHE_KEY, data, TTL_MS);
    res.json(data);
  } catch (err) {
    console.error('[ais] fetch error:', err.message);
    res.json([]);
  }
});

// ── GET /api/gpsjam/current ──────────────────────────────────────────────────
app.get('/api/gpsjam/current', (req, res) => {
  res.status(503).json({ error: 'GPSJam API not available, using static data' });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] World4DWarTrack proxy server listening on port ${PORT}`);
});
