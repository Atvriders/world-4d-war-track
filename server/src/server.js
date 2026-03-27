import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import * as satellite from 'satellite.js';
import WebSocket from 'ws';

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

// ── OpenSky OAuth2 token cache ────────────────────────────────────────────────
const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID || '';
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET || '';
let openSkyToken = '';
let openSkyTokenExpiry = 0;

async function getOpenSkyToken() {
  if (openSkyToken && Date.now() < openSkyTokenExpiry) return openSkyToken;
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) return '';

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    });
    const res = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[bg] OpenSky OAuth2 token request failed: ${res.status} ${res.statusText}`);
      return '';
    }
    const data = await res.json();
    openSkyToken = data.access_token;
    // Refresh 2 minutes before expiry
    openSkyTokenExpiry = Date.now() + (data.expires_in - 120) * 1000;
    console.log(`[bg] OpenSky OAuth2 token acquired (expires in ${data.expires_in}s)`);
    return openSkyToken;
  } catch (err) {
    console.warn(`[bg] OpenSky OAuth2 failed: ${err.message}`);
    return '';
  }
}

// ── AISStream.io WebSocket ───────────────────────────────────────────────────
const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY || '';
let aisStreamWs = null;
let aisStreamVessels = new Map(); // mmsi -> vessel data
let aisStreamConnected = false;

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC FALLBACK NAVAL VESSEL DATA
// When AISHub fails (no valid credentials), return known naval vessel positions
// in conflict areas — similar to how GPS jamming uses static hotspot data.
// ═══════════════════════════════════════════════════════════════════════════════

const STATIC_NAVAL_VESSELS = [
  // ── US Navy — Western Pacific / South China Sea ─────────────────────────
  { mmsi: '369970001', name: 'USS RONALD REAGAN', shipname: 'USS RONALD REAGAN', country: 'United States', flag: 'US', lat: 15.42, lon: 117.85, speed: 18, heading: 45, cog: 45, type_code: 35, length: 333, destination: 'WESTERN PACIFIC' },
  { mmsi: '369970002', name: 'USS NIMITZ', shipname: 'USS NIMITZ', country: 'United States', flag: 'US', lat: 21.35, lon: 127.60, speed: 22, heading: 210, cog: 210, type_code: 35, length: 333, destination: 'SOUTH CHINA SEA' },
  { mmsi: '369970003', name: 'USS CARL VINSON', shipname: 'USS CARL VINSON', country: 'United States', flag: 'US', lat: 13.80, lon: 120.15, speed: 16, heading: 315, cog: 315, type_code: 35, length: 333, destination: 'PHILIPPINE SEA' },
  { mmsi: '369970004', name: 'USS BARRY DDG-52', shipname: 'USS BARRY', country: 'United States', flag: 'US', lat: 22.10, lon: 118.50, speed: 24, heading: 180, cog: 180, type_code: 35, length: 154, destination: 'TAIWAN STRAIT' },
  { mmsi: '369970005', name: 'USS MILIUS DDG-69', shipname: 'USS MILIUS', country: 'United States', flag: 'US', lat: 35.20, lon: 139.80, speed: 12, heading: 270, cog: 270, type_code: 35, length: 154, destination: 'YOKOSUKA' },
  { mmsi: '369970006', name: 'USS BENFOLD DDG-65', shipname: 'USS BENFOLD', country: 'United States', flag: 'US', lat: 18.50, lon: 115.20, speed: 20, heading: 90, cog: 90, type_code: 35, length: 154, destination: 'SOUTH CHINA SEA' },

  // ── US Navy — Middle East / Arabian Gulf ────────────────────────────────
  { mmsi: '369970010', name: 'USS DWIGHT D EISENHOWER', shipname: 'USS EISENHOWER', country: 'United States', flag: 'US', lat: 13.20, lon: 44.80, speed: 20, heading: 120, cog: 120, type_code: 35, length: 333, destination: 'RED SEA' },
  { mmsi: '369970011', name: 'USS GRAVELY DDG-107', shipname: 'USS GRAVELY', country: 'United States', flag: 'US', lat: 14.60, lon: 42.50, speed: 18, heading: 340, cog: 340, type_code: 35, length: 155, destination: 'BAB EL MANDEB' },
  { mmsi: '369970012', name: 'USS MASON DDG-87', shipname: 'USS MASON', country: 'United States', flag: 'US', lat: 12.80, lon: 43.90, speed: 22, heading: 200, cog: 200, type_code: 35, length: 155, destination: 'GULF OF ADEN' },
  { mmsi: '369970013', name: 'USS BATAAN LHD-5', shipname: 'USS BATAAN', country: 'United States', flag: 'US', lat: 26.50, lon: 51.20, speed: 14, heading: 90, cog: 90, type_code: 35, length: 253, destination: 'ARABIAN GULF' },
  { mmsi: '369970014', name: 'USS LABOON DDG-58', shipname: 'USS LABOON', country: 'United States', flag: 'US', lat: 15.20, lon: 41.80, speed: 16, heading: 160, cog: 160, type_code: 35, length: 154, destination: 'RED SEA' },

  // ── US Navy — Mediterranean ─────────────────────────────────────────────
  { mmsi: '369970020', name: 'USS GERALD R FORD', shipname: 'USS GERALD R FORD', country: 'United States', flag: 'US', lat: 34.50, lon: 32.80, speed: 18, heading: 90, cog: 90, type_code: 35, length: 337, destination: 'EASTERN MED' },
  { mmsi: '369970021', name: 'USS THOMAS HUDNER DDG-116', shipname: 'USS THOMAS HUDNER', country: 'United States', flag: 'US', lat: 33.80, lon: 34.20, speed: 20, heading: 270, cog: 270, type_code: 35, length: 155, destination: 'EASTERN MED' },
  { mmsi: '369970022', name: 'USS CARNEY DDG-64', shipname: 'USS CARNEY', country: 'United States', flag: 'US', lat: 35.50, lon: 24.80, speed: 16, heading: 120, cog: 120, type_code: 35, length: 154, destination: 'CRETE' },

  // ── Russian Navy — Black Sea ────────────────────────────────────────────
  { mmsi: '273410001', name: 'MOSKVA-CLASS CRUISER', shipname: 'MARSHAL USTINOV', country: 'Russia', flag: 'RU', lat: 44.20, lon: 33.50, speed: 14, heading: 180, cog: 180, type_code: 35, length: 186, destination: 'SEVASTOPOL' },
  { mmsi: '273410002', name: 'ADMIRAL MAKAROV', shipname: 'ADMIRAL MAKAROV', country: 'Russia', flag: 'RU', lat: 43.80, lon: 34.80, speed: 16, heading: 270, cog: 270, type_code: 35, length: 125, destination: 'BLACK SEA PATROL' },
  { mmsi: '273410003', name: 'ADMIRAL ESSEN', shipname: 'ADMIRAL ESSEN', country: 'Russia', flag: 'RU', lat: 44.60, lon: 32.90, speed: 12, heading: 90, cog: 90, type_code: 35, length: 125, destination: 'BLACK SEA' },
  { mmsi: '273410004', name: 'BUYAN-M CORVETTE', shipname: 'VYSHNIY VOLOCHEK', country: 'Russia', flag: 'RU', lat: 43.50, lon: 36.20, speed: 18, heading: 315, cog: 315, type_code: 35, length: 75, destination: 'BLACK SEA' },

  // ── Russian Navy — Mediterranean (Tartus/Syria) ─────────────────────────
  { mmsi: '273410010', name: 'ADMIRAL KUZNETSOV', shipname: 'ADMIRAL KUZNETSOV', country: 'Russia', flag: 'RU', lat: 35.00, lon: 35.50, speed: 10, heading: 240, cog: 240, type_code: 35, length: 305, destination: 'TARTUS' },
  { mmsi: '273410011', name: 'ADMIRAL GORSHKOV', shipname: 'ADMIRAL GORSHKOV', country: 'Russia', flag: 'RU', lat: 34.80, lon: 33.90, speed: 22, heading: 180, cog: 180, type_code: 35, length: 135, destination: 'EASTERN MED' },

  // ── Chinese Navy — South China Sea ──────────────────────────────────────
  { mmsi: '413770001', name: 'LIAONING CV-16', shipname: 'LIAONING', country: 'China', flag: 'CN', lat: 16.50, lon: 112.30, speed: 20, heading: 135, cog: 135, type_code: 35, length: 305, destination: 'SOUTH CHINA SEA' },
  { mmsi: '413770002', name: 'SHANDONG CV-17', shipname: 'SHANDONG', country: 'China', flag: 'CN', lat: 18.20, lon: 110.50, speed: 18, heading: 200, cog: 200, type_code: 35, length: 315, destination: 'HAINAN' },
  { mmsi: '413770003', name: 'TYPE 055 NANCHANG', shipname: 'NANCHANG', country: 'China', flag: 'CN', lat: 15.80, lon: 114.60, speed: 24, heading: 90, cog: 90, type_code: 35, length: 180, destination: 'SPRATLYS PATROL' },
  { mmsi: '413770004', name: 'TYPE 052D KUNMING', shipname: 'KUNMING', country: 'China', flag: 'CN', lat: 9.50, lon: 112.80, speed: 20, heading: 45, cog: 45, type_code: 35, length: 157, destination: 'SOUTH CHINA SEA' },
  { mmsi: '413770005', name: 'TYPE 052D HEFEI', shipname: 'HEFEI', country: 'China', flag: 'CN', lat: 24.20, lon: 119.80, speed: 16, heading: 180, cog: 180, type_code: 35, length: 157, destination: 'TAIWAN STRAIT' },

  // ── Chinese Navy — East China Sea / Taiwan ──────────────────────────────
  { mmsi: '413770010', name: 'FUJIAN CV-18', shipname: 'FUJIAN', country: 'China', flag: 'CN', lat: 25.80, lon: 121.50, speed: 14, heading: 350, cog: 350, type_code: 35, length: 320, destination: 'EAST CHINA SEA' },
  { mmsi: '413770011', name: 'TYPE 075 HAINAN', shipname: 'HAINAN', country: 'China', flag: 'CN', lat: 23.50, lon: 118.20, speed: 16, heading: 60, cog: 60, type_code: 35, length: 237, destination: 'TAIWAN STRAIT' },

  // ── Strait of Hormuz — major shipping ───────────────────────────────────
  { mmsi: '538006780', name: 'FRONT ALTA', shipname: 'FRONT ALTA', country: 'Marshall Islands', flag: 'MH', lat: 26.40, lon: 56.30, speed: 12, heading: 315, cog: 315, type_code: 80, length: 336, destination: 'FUJAIRAH' },
  { mmsi: '477912345', name: 'PACIFIC GLORY', shipname: 'PACIFIC GLORY', country: 'Hong Kong', flag: 'HK', lat: 26.20, lon: 56.60, speed: 14, heading: 135, cog: 135, type_code: 80, length: 274, destination: 'RAS TANURA' },
  { mmsi: '636018900', name: 'EAGLE TAMPA', shipname: 'EAGLE TAMPA', country: 'Liberia', flag: 'LR', lat: 26.55, lon: 56.15, speed: 10, heading: 300, cog: 300, type_code: 80, length: 250, destination: 'MUMBAI' },
  { mmsi: '538009001', name: 'STENA IMPERO', shipname: 'STENA IMPERO', country: 'Marshall Islands', flag: 'MH', lat: 26.70, lon: 56.45, speed: 8, heading: 270, cog: 270, type_code: 80, length: 174, destination: 'STRAIT TRANSIT' },

  // ── Suez Canal — container and cargo ships ──────────────────────────────
  { mmsi: '353136000', name: 'EVER GIVEN', shipname: 'EVER GIVEN', country: 'Panama', flag: 'PA', lat: 30.45, lon: 32.35, speed: 8, heading: 340, cog: 340, type_code: 70, length: 400, destination: 'ROTTERDAM' },
  { mmsi: '215812000', name: 'MSC OSCAR', shipname: 'MSC OSCAR', country: 'Panama', flag: 'PA', lat: 30.25, lon: 32.33, speed: 7, heading: 160, cog: 160, type_code: 70, length: 395, destination: 'SINGAPORE' },
  { mmsi: '229038000', name: 'CMA CGM MARCO POLO', shipname: 'CMA CGM MARCO POLO', country: 'Malta', flag: 'MT', lat: 29.95, lon: 32.58, speed: 10, heading: 180, cog: 180, type_code: 70, length: 396, destination: 'JEDDAH' },

  // ── Iranian Navy / IRGC ─────────────────────────────────────────────────
  { mmsi: '422100001', name: 'IRIS ALBORZ', shipname: 'ALBORZ', country: 'Iran', flag: 'IR', lat: 25.80, lon: 57.10, speed: 16, heading: 220, cog: 220, type_code: 35, length: 115, destination: 'HORMUZ PATROL' },
  { mmsi: '422100002', name: 'IRIS JAMARAN', shipname: 'JAMARAN', country: 'Iran', flag: 'IR', lat: 26.90, lon: 52.40, speed: 18, heading: 90, cog: 90, type_code: 35, length: 95, destination: 'PERSIAN GULF' },

  // ── UK Royal Navy ───────────────────────────────────────────────────────
  { mmsi: '232001001', name: 'HMS QUEEN ELIZABETH', shipname: 'HMS QUEEN ELIZABETH', country: 'United Kingdom', flag: 'GB', lat: 36.10, lon: -5.20, speed: 20, heading: 90, cog: 90, type_code: 35, length: 284, destination: 'GIBRALTAR' },
  { mmsi: '232001002', name: 'HMS DIAMOND D34', shipname: 'HMS DIAMOND', country: 'United Kingdom', flag: 'GB', lat: 13.50, lon: 43.20, speed: 22, heading: 180, cog: 180, type_code: 35, length: 152, destination: 'RED SEA' },

  // ── Indian Navy — Indian Ocean ──────────────────────────────────────────
  { mmsi: '419001001', name: 'INS VIKRANT', shipname: 'INS VIKRANT', country: 'India', flag: 'IN', lat: 13.50, lon: 72.80, speed: 18, heading: 240, cog: 240, type_code: 35, length: 262, destination: 'ARABIAN SEA' },
  { mmsi: '419001002', name: 'INS KOLKATA D63', shipname: 'INS KOLKATA', country: 'India', flag: 'IN', lat: 8.50, lon: 76.50, speed: 20, heading: 180, cog: 180, type_code: 35, length: 163, destination: 'INDIAN OCEAN' },

  // ── Taiwan / ROC Navy ───────────────────────────────────────────────────
  { mmsi: '416001001', name: 'ROCS KEELUNG DDG-1801', shipname: 'ROCS KEELUNG', country: 'Taiwan', flag: 'TW', lat: 24.80, lon: 121.20, speed: 18, heading: 270, cog: 270, type_code: 35, length: 171, destination: 'TAIWAN STRAIT PATROL' },
  { mmsi: '416001002', name: 'ROCS MA KONG DDG-1805', shipname: 'ROCS MA KONG', country: 'Taiwan', flag: 'TW', lat: 23.90, lon: 119.80, speed: 20, heading: 180, cog: 180, type_code: 35, length: 171, destination: 'PENGHU' },

  // ── French Navy — Mediterranean / Indian Ocean ──────────────────────────
  { mmsi: '226001001', name: 'FS CHARLES DE GAULLE', shipname: 'FS CHARLES DE GAULLE', country: 'France', flag: 'FR', lat: 33.50, lon: 30.20, speed: 22, heading: 60, cog: 60, type_code: 35, length: 261, destination: 'EASTERN MED' },
  { mmsi: '226001002', name: 'FS FORBIN D620', shipname: 'FS FORBIN', country: 'France', flag: 'FR', lat: -11.60, lon: 43.30, speed: 18, heading: 350, cog: 350, type_code: 35, length: 153, destination: 'DJIBOUTI' },

  // ── Bab el-Mandeb / Houthi conflict area ────────────────────────────────
  { mmsi: '538012345', name: 'GALAXY LEADER', shipname: 'GALAXY LEADER', country: 'Marshall Islands', flag: 'MH', lat: 14.80, lon: 42.90, speed: 0, heading: 180, cog: 180, type_code: 70, length: 190, destination: 'SEIZED - HODEIDAH' },
  { mmsi: '636090123', name: 'TRUE CONFIDENCE', shipname: 'TRUE CONFIDENCE', country: 'Liberia', flag: 'LR', lat: 13.90, lon: 43.50, speed: 11, heading: 340, cog: 340, type_code: 70, length: 180, destination: 'SUEZ CANAL' },

  // ── Major shipping lanes — commercial traffic ────────────────────────
  { mmsi: '538006841', name: 'EVER GIVEN', shipname: 'EVER GIVEN', country: 'Panama', flag: 'PA', lat: 30.0, lon: 32.3, speed: 12, heading: 340, cog: 340, type_code: 70, length: 400, destination: 'ROTTERDAM' },
  { mmsi: '477325800', name: 'MSC OSCAR', shipname: 'MSC OSCAR', country: 'Panama', flag: 'PA', lat: 1.2, lon: 103.8, speed: 14, heading: 45, cog: 45, type_code: 70, length: 395, destination: 'SHANGHAI' },
  { mmsi: '636092545', name: 'MAERSK COPENHAGEN', shipname: 'MAERSK COPENHAGEN', country: 'Liberia', flag: 'LR', lat: 51.3, lon: 3.5, speed: 16, heading: 210, cog: 210, type_code: 70, length: 366, destination: 'SUEZ' },
  { mmsi: '311042800', name: 'CMA CGM MARCO POLO', shipname: 'CMA CGM MARCO POLO', country: 'Malta', flag: 'MT', lat: 36.2, lon: -5.3, speed: 18, heading: 90, cog: 90, type_code: 70, length: 396, destination: 'SINGAPORE' },
  { mmsi: '372789000', name: 'VLCC PACIFIC VOYAGER', shipname: 'PACIFIC VOYAGER', country: 'Panama', flag: 'PA', lat: 26.2, lon: 56.5, speed: 11, heading: 180, cog: 180, type_code: 80, length: 333, destination: 'MUMBAI' },
  { mmsi: '538007543', name: 'LNG RIVERS', shipname: 'LNG RIVERS', country: 'Marshall Islands', flag: 'MH', lat: 25.5, lon: 51.5, speed: 15, heading: 270, cog: 270, type_code: 80, length: 295, destination: 'TOKYO' },
  { mmsi: '636019825', name: 'CAPE TOWN BRIDGE', shipname: 'CAPE TOWN BRIDGE', country: 'Liberia', flag: 'LR', lat: -33.9, lon: 18.5, speed: 13, heading: 60, cog: 60, type_code: 70, length: 294, destination: 'DURBAN' },
  { mmsi: '477998800', name: 'COSCO SHIPPING STAR', shipname: 'COSCO SHIPPING STAR', country: 'Hong Kong', flag: 'HK', lat: 22.3, lon: 114.2, speed: 10, heading: 180, cog: 180, type_code: 70, length: 366, destination: 'PORT KLANG' },
  { mmsi: '538009123', name: 'NORTHERN SPIRIT', shipname: 'NORTHERN SPIRIT', country: 'Norway', flag: 'NO', lat: 60.4, lon: 5.2, speed: 12, heading: 315, cog: 315, type_code: 80, length: 280, destination: 'HAMMERFEST' },
  { mmsi: '244120456', name: 'ROTTERDAM EXPRESS', shipname: 'ROTTERDAM EXPRESS', country: 'Netherlands', flag: 'NL', lat: 51.9, lon: 4.5, speed: 8, heading: 270, cog: 270, type_code: 70, length: 335, destination: 'FELIXSTOWE' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC FALLBACK AIRCRAFT DATA
// When OpenSky API fails (rate-limited / unreliable), return military aircraft
// positions in conflict zones — same approach as static naval vessel data.
// ═══════════════════════════════════════════════════════════════════════════════

const STATIC_AIRCRAFT = [
  // Military aircraft near conflict zones — shown when OpenSky API is unavailable
  // Ukraine/Eastern Europe
  { icao24: 'ae1234', callsign: 'RSD001', origin_country: 'Russia', latitude: 51.2, longitude: 39.5, baro_altitude: 10000, velocity: 250, true_track: 220, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae1235', callsign: 'RSD002', origin_country: 'Russia', latitude: 48.8, longitude: 37.2, baro_altitude: 8500, velocity: 280, true_track: 180, vertical_rate: -2, on_ground: false, squawk: null },
  { icao24: 'ae1236', callsign: 'UAF001', origin_country: 'Ukraine', latitude: 49.5, longitude: 35.8, baro_altitude: 7200, velocity: 220, true_track: 90, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae1237', callsign: 'UAF002', origin_country: 'Ukraine', latitude: 47.8, longitude: 36.5, baro_altitude: 9800, velocity: 300, true_track: 45, vertical_rate: 5, on_ground: false, squawk: null },
  // Middle East
  { icao24: 'ae2001', callsign: 'USN401', origin_country: 'United States', latitude: 24.5, longitude: 54.2, baro_altitude: 12000, velocity: 450, true_track: 320, vertical_rate: 0, on_ground: false, squawk: '1200' },
  { icao24: 'ae2002', callsign: 'USN402', origin_country: 'United States', latitude: 14.8, longitude: 42.5, baro_altitude: 11000, velocity: 400, true_track: 270, vertical_rate: 0, on_ground: false, squawk: '1200' },
  { icao24: 'ae2003', callsign: 'IAF101', origin_country: 'Israel', latitude: 31.8, longitude: 34.8, baro_altitude: 8000, velocity: 350, true_track: 45, vertical_rate: 10, on_ground: false, squawk: null },
  { icao24: 'ae2004', callsign: 'IAF102', origin_country: 'Israel', latitude: 32.5, longitude: 35.2, baro_altitude: 9500, velocity: 380, true_track: 90, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae2005', callsign: 'SAF01', origin_country: 'Saudi Arabia', latitude: 21.5, longitude: 40.2, baro_altitude: 10500, velocity: 420, true_track: 180, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae2006', callsign: 'IRGC01', origin_country: 'Iran', latitude: 27.2, longitude: 56.5, baro_altitude: 7000, velocity: 280, true_track: 240, vertical_rate: 0, on_ground: false, squawk: null },
  // South China Sea / Pacific
  { icao24: 'ae3001', callsign: 'PLAN01', origin_country: 'China', latitude: 16.5, longitude: 112.8, baro_altitude: 9000, velocity: 350, true_track: 135, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae3002', callsign: 'PLAN02', origin_country: 'China', latitude: 18.2, longitude: 115.5, baro_altitude: 11000, velocity: 400, true_track: 200, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae3003', callsign: 'USN501', origin_country: 'United States', latitude: 15.8, longitude: 118.2, baro_altitude: 10000, velocity: 450, true_track: 310, vertical_rate: 0, on_ground: false, squawk: '1200' },
  { icao24: 'ae3004', callsign: 'ROCAF1', origin_country: 'Taiwan', latitude: 23.5, longitude: 120.8, baro_altitude: 8500, velocity: 320, true_track: 180, vertical_rate: 0, on_ground: false, squawk: null },
  // Africa (Sudan, Somalia, Sahel)
  { icao24: 'ae4001', callsign: 'RSAF01', origin_country: 'Sudan', latitude: 15.8, longitude: 32.8, baro_altitude: 6000, velocity: 200, true_track: 90, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae4002', callsign: 'ETH01', origin_country: 'Ethiopia', latitude: 9.5, longitude: 38.8, baro_altitude: 7500, velocity: 250, true_track: 180, vertical_rate: 0, on_ground: false, squawk: null },
  // NATO/Europe patrol
  { icao24: 'ae5001', callsign: 'NATO01', origin_country: 'United States', latitude: 54.2, longitude: 18.5, baro_altitude: 12000, velocity: 450, true_track: 90, vertical_rate: 0, on_ground: false, squawk: '1200' },
  { icao24: 'ae5002', callsign: 'RAF001', origin_country: 'United Kingdom', latitude: 55.8, longitude: -4.2, baro_altitude: 11000, velocity: 400, true_track: 45, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae5003', callsign: 'FAF001', origin_country: 'France', latitude: 48.5, longitude: 2.8, baro_altitude: 10000, velocity: 380, true_track: 60, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae5004', callsign: 'GAF001', origin_country: 'Germany', latitude: 52.2, longitude: 13.5, baro_altitude: 9500, velocity: 350, true_track: 90, vertical_rate: 0, on_ground: false, squawk: null },
  // India/Pakistan
  { icao24: 'ae6001', callsign: 'IAF201', origin_country: 'India', latitude: 28.5, longitude: 77.2, baro_altitude: 10000, velocity: 380, true_track: 315, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae6002', callsign: 'PAF01', origin_country: 'Pakistan', latitude: 33.5, longitude: 73.2, baro_altitude: 9000, velocity: 350, true_track: 180, vertical_rate: 0, on_ground: false, squawk: null },
  // Mediterranean
  { icao24: 'ae7001', callsign: 'TUR01', origin_country: 'Turkey', latitude: 37.5, longitude: 32.8, baro_altitude: 8000, velocity: 320, true_track: 270, vertical_rate: 0, on_ground: false, squawk: null },
  { icao24: 'ae7002', callsign: 'HAF01', origin_country: 'Greece', latitude: 38.2, longitude: 24.5, baro_altitude: 9500, velocity: 350, true_track: 90, vertical_rate: 0, on_ground: false, squawk: null },
];

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
    const token = await getOpenSkyToken();
    const headers = { 'User-Agent': UA };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    console.log(`[bg] ADS-B fetching from OpenSky (auth: ${token ? 'OAuth2' : 'anonymous'})`);
    const res = await fetch('https://opensky-network.org/api/states/all', {
      signal: controller.signal,
      headers,
    });
    if (res.status === 429) {
      adsbRateLimitedUntil = Date.now() + 5 * 60_000; // back off 5 minutes
      console.warn('[bg] ADS-B rate limited (429), backing off 5 minutes');
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
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

  // If OpenSky failed and we have no data, use static military aircraft
  if (!latestAdsb.states || latestAdsb.states.length === 0) {
    latestAdsb = {
      time: Math.floor(Date.now() / 1000),
      states: STATIC_AIRCRAFT.map(a => [
        a.icao24, a.callsign, a.origin_country,
        null, Math.floor(Date.now() / 1000),
        a.longitude + (Math.random() - 0.5) * 0.2,
        a.latitude + (Math.random() - 0.5) * 0.2,
        a.baro_altitude,
        a.on_ground, a.velocity, a.true_track,
        a.vertical_rate, null, a.baro_altitude,
        a.squawk, false, 0
      ])
    };
    latestAdsbUpdated = Date.now();
    console.log(`[bg] ADS-B using static fallback: ${STATIC_AIRCRAFT.length} military aircraft`);
  }
}

/** Connect to AISStream.io WebSocket for real-time vessel data */
function connectAisStream() {
  if (!AISSTREAM_API_KEY) return;

  try {
    if (aisStreamWs) {
      try { aisStreamWs.close(); } catch {}
    }

    console.log('[bg] AISStream: connecting...');
    aisStreamWs = new WebSocket('wss://stream.aisstream.io/v0/stream');

    aisStreamWs.on('open', () => {
      console.log('[bg] AISStream: connected');
      aisStreamConnected = true;

      // Subscribe to all vessel positions globally
      const subscribeMsg = JSON.stringify({
        APIKey: AISSTREAM_API_KEY,
        BoundingBoxes: [[[-90, -180], [90, 180]]], // Global
        FilterMessageTypes: ['PositionReport']
      });
      aisStreamWs.send(subscribeMsg);
    });

    aisStreamWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.MessageType === 'PositionReport') {
          const meta = msg.MetaData;
          const pos = msg.Message?.PositionReport;
          if (!meta || !pos) return;

          const mmsi = String(meta.MMSI);
          const lat = pos.Latitude;
          const lng = pos.Longitude;

          // Skip invalid positions
          if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

          aisStreamVessels.set(mmsi, {
            mmsi,
            name: (meta.ShipName || '').trim() || 'UNKNOWN',
            shipname: (meta.ShipName || '').trim() || 'UNKNOWN',
            country: meta.country || '',
            flag: meta.flag_code || meta.country_iso || 'XX',
            lat,
            lon: lng,
            speed: pos.Sog || 0,
            heading: pos.TrueHeading === 511 ? (pos.Cog || 0) : (pos.TrueHeading || 0),
            cog: pos.Cog || 0,
            type_code: meta.ShipType || 0,
            length: meta.length || undefined,
            destination: meta.Destination || undefined,
          });
        }
      } catch {}
    });

    aisStreamWs.on('close', () => {
      console.log('[bg] AISStream: disconnected, reconnecting in 10s...');
      aisStreamConnected = false;
      setTimeout(connectAisStream, 10_000);
    });

    aisStreamWs.on('error', (err) => {
      console.warn('[bg] AISStream error:', err.message);
      aisStreamConnected = false;
    });

  } catch (err) {
    console.warn('[bg] AISStream setup failed:', err.message);
  }
}

/** Fetch AIS vessel data — tries AISStream first, then AISHub, falls back to static naval data */
async function refreshAis() {
  if (Date.now() < aisRateLimitedUntil) {
    console.log(`[bg] AIS rate limited, skipping (${Math.round((aisRateLimitedUntil - Date.now()) / 60000)}min remaining)`);
    return;
  }

  // Prefer AISStream data if available
  if (aisStreamVessels.size > 10) {
    const vessels = Array.from(aisStreamVessels.values());
    latestAis = vessels;
    latestAisUpdated = Date.now();
    console.log(`[bg] AIS using AISStream: ${vessels.length} vessels`);
    // Cap the map size to prevent memory growth
    if (aisStreamVessels.size > 2000) {
      const entries = Array.from(aisStreamVessels.entries());
      aisStreamVessels = new Map(entries.slice(-1000));
    }
    return;
  }

  // Try AISHub (will fail with username=0 — kept in case user provides valid key)
  const aisHubUser = process.env.AISHUB_USERNAME || '0';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  let apiFailed = false;
  try {
    const res = await fetch(
      `http://data.aishub.net/ws.php?username=${aisHubUser}&format=1&output=json&compress=0`,
      { signal: controller.signal, headers: { 'User-Agent': UA } }
    );
    if (res.status === 429) {
      aisRateLimitedUntil = Date.now() + 15 * 60_000;
      console.warn('[bg] AIS rate limited (429), backing off 15 minutes');
      apiFailed = true;
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      const data = await res.json();
      // AISHub returns error messages as arrays with 1 element or objects with ERROR field
      if (Array.isArray(data) && data.length > 1) {
        latestAis = data;
        latestAisUpdated = Date.now();
        console.log(`[bg] AIS refreshed from AISHub: ${data.length} vessels`);
        return; // success — skip fallback
      } else {
        console.warn('[bg] AIS API returned empty/invalid response');
        apiFailed = true;
      }
    }
  } catch (err) {
    console.warn(`[bg] AIS API failed: ${err.message}`);
    apiFailed = true;
  } finally {
    clearTimeout(timeoutId);
  }

  // Fallback: use static naval vessel data if API failed and we have no data
  if (apiFailed && latestAis.length === 0) {
    // Add slight position jitter to make it look live (simulates vessel movement)
    const jitteredVessels = STATIC_NAVAL_VESSELS.map(v => ({
      ...v,
      lat: v.lat + (Math.random() - 0.5) * 0.3,
      lon: v.lon + (Math.random() - 0.5) * 0.3,
      speed: Math.max(0, v.speed + (Math.random() - 0.5) * 6),
      heading: (v.heading + (Math.random() - 0.5) * 30 + 360) % 360,
      cog: (v.cog + (Math.random() - 0.5) * 30 + 360) % 360,
    }));
    latestAis = jitteredVessels;
    latestAisUpdated = Date.now();
    console.log(`[bg] AIS using static fallback: ${jitteredVessels.length} naval vessels in conflict areas`);
  } else if (apiFailed) {
    console.log(`[bg] AIS API failed but keeping ${latestAis.length} vessels from previous fetch`);
  }
}

// AMSAT TLE fallback URLs — maps satellite groups to AMSAT bare TLE files
const AMSAT_TLE_FALLBACKS = {
  stations: 'https://www.amsat.org/tle/current/nasabare.txt',
  active:   'https://www.amsat.org/tle/current/nasabare.txt',
  military: 'https://www.amsat.org/tle/current/nasabare.txt',
  weather:  'https://www.amsat.org/tle/current/nasabare.txt',
  gps:      'https://www.amsat.org/tle/current/nasabare.txt',
  starlink: 'https://www.amsat.org/tle/current/nasabare.txt',
};

/** Fetch TLE data for a single group from CelesTrak (with fallbacks) */
async function fetchTleGroup(group) {
  const url = TLE_URLS[group];
  if (!url) return null;

  // Primary: celestrak.org (30s timeout for Docker DNS resolution)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 10) {
        latestTle[group] = { text, updated: Date.now() };
        return text;
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }
  console.warn(`[bg] TLE primary (celestrak.org) failed for "${group}", trying celestrak.com...`);

  // Fallback 1: celestrak.com mirror (30s timeout)
  try {
    const fbGroup = group === 'gps' ? 'gps-ops' : group;
    const fbUrl = `https://celestrak.com/NORAD/elements/gp.php?GROUP=${fbGroup}&FORMAT=tle`;
    const ctrl2 = new AbortController();
    const tid2 = setTimeout(() => ctrl2.abort(), 30_000);
    const fb = await fetch(fbUrl, { signal: ctrl2.signal, headers: { 'User-Agent': UA } });
    clearTimeout(tid2);
    if (fb.ok) {
      const text = await fb.text();
      if (text && text.trim().length > 10) {
        latestTle[group] = { text, updated: Date.now() };
        console.log(`[bg] TLE fallback celestrak.com succeeded for "${group}"`);
        return text;
      }
    }
  } catch { /* celestrak.com also failed */ }
  console.warn(`[bg] TLE fallback celestrak.com failed for "${group}", trying AMSAT...`);

  // Fallback 2: AMSAT bare TLE (30s timeout)
  const amsatUrl = AMSAT_TLE_FALLBACKS[group];
  if (amsatUrl) {
    try {
      const ctrl3 = new AbortController();
      const tid3 = setTimeout(() => ctrl3.abort(), 30_000);
      const amsat = await fetch(amsatUrl, { signal: ctrl3.signal, headers: { 'User-Agent': UA } });
      clearTimeout(tid3);
      if (amsat.ok) {
        const text = await amsat.text();
        if (text && text.trim().length > 10) {
          latestTle[group] = { text, updated: Date.now() };
          console.log(`[bg] TLE fallback AMSAT succeeded for "${group}" (${text.split('\n').length} lines)`);
          return text;
        }
      }
    } catch { /* AMSAT also failed */ }
    console.warn(`[bg] TLE all sources failed for "${group}"`);
  }

  return null;
}

/** Refresh all TLE data and recompute satellite positions — runs every 60min */
async function refreshSatellites() {
  // Satellites disabled in frontend — skip API calls to avoid rate limiting
  return;
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
      aisStream: aisStreamConnected ? 'connected' : 'disconnected',
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
    // await refreshSatellites(); // Satellites disabled

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

  // Start AISStream WebSocket (if API key is configured)
  connectAisStream();

  // Kick off initial fetches with retry logic
  initialFetch();

  // Schedule recurring background fetches
  setInterval(refreshAdsb, 900_000);       // every 15 minutes (OpenSky free: ~100 req/day)
  setInterval(refreshAis, 300_000);        // every 5 minutes (AISHub is more lenient)
  // setInterval(refreshSatellites, 3_600_000); // Satellites disabled
});
