# 🌍 World 4D War Track

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fatvriders%2Fworld--4d--war--track-blue?logo=docker)](https://github.com/Atvriders/world-4d-war-track/pkgs/container/world-4d-war-track)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=three.js)](https://threejs.org)

**A real-time 4D global intelligence dashboard** — 3D Earth globe (WebGL) + time dimension — showing live aircraft, marine vessels, satellites, active conflict zones, and GPS jamming/spoofing interference, all on a single interactive globe.

> **4D** = 3 spatial dimensions (interactive 3D globe) + time (satellite orbital prediction, conflict event replay, 6-hour position forecasting).

---

## 📸 Screenshots

> Screenshots / live demo coming soon.

---

## ✨ Overview

World 4D War Track aggregates open-source intelligence (OSINT) and public APIs to paint a live picture of the global security environment:

| Layer | Coverage | Refresh |
|---|---|---|
| ✈️ ADS-B Aircraft | 1,200+ aircraft worldwide | 15 seconds |
| 🛰️ Satellites | 400+ satellites with orbital paths | 5 minutes |
| 🚢 AIS Vessels | 80+ vessels incl. warships | 60 seconds |
| ⚔️ Conflict Zones | 12 active conflicts (2025) | Daily |
| 📡 GPS Interference | 15 confirmed hotspots | Static / OSINT |

---

## 🚀 Features

### 🌍 3D Globe Visualization
- WebGL-powered Earth rendered with night-time satellite imagery via **react-globe.gl** (Three.js)
- Tilted camera angle showing satellites overhead in orbital arc
- Real-time auto-rotation to simulate live Earth spin
- Day/night terminator shadow overlay
- Multiple imagery styles: satellite, dark mode, terrain
- Smooth fly-to animations for region navigation

### 🛰️ Satellite Tracking
- Live Two-Line Element (TLE) data fetched from **CelesTrak** (refreshed every 5 minutes)
- **SGP4** orbital mechanics propagation via `satellite.js`
- Satellite categories:
  - 🛸 ISS (International Space Station)
  - 🔒 Military satellites
  - 🕵️ Spy / Reconnaissance
  - 🧭 GPS / Navigation (GPS III, GLONASS, Galileo, BeiDou)
  - 🌦️ Weather
  - 🔗 Starlink megaconstellation
  - 🛰️ Commercial Earth observation
- Orbital ground tracks (90-minute future prediction arcs)
- Coverage footprint rings showing sensor/signal reach
- Satellite-to-ground connection beams
- **Time slider:** advance up to 6 hours ahead to forecast satellite positions in real time

### ✈️ ADS-B Aircraft Tracking
- **OpenSky Network** integration — 1,200+ aircraft updated every 15 seconds
- Military aircraft detection and highlighting via callsign pattern matching
- Flight trails showing recent track history
- Per-aircraft data: country of origin, callsign, altitude, speed, heading, squawk code
- Aircraft type classification (commercial, cargo, military, helicopter)

### 🚢 Maritime Tracking (AIS)
- Marine vessel positions via **AIS** (Automatic Identification System) data
- Warship and military vessel identification and highlighting
- Ship type classification: tanker, cargo, warship, passenger, fishing
- Coverage focused on major shipping lanes and strategic chokepoints (Strait of Hormuz, Bab-el-Mandeb, South China Sea, GIUK Gap)

### ⚔️ Conflict Zones
- **12 active conflicts** as of 2025 — see full list below
- Color-coded intensity rings: 🔴 critical / 🟠 high / 🟡 medium / 🟢 low
- Conflict events with precise location, event type (airstrike, artillery, drone, naval, missile), and casualty data
- Front line overlays (Ukraine/Russia contact line)
- Interactive conflict detail panel: parties, casualties, displaced persons, timeline
- Casualty statistics sourced from ACLED and OSINT reporting

### 📡 GPS Jamming & Spoofing
- **15 confirmed active GPS interference hotspots** overlaid as intensity heatmap rings
- Spoofing vs. jamming differentiation (spoofing = false position signals; jamming = signal denial)
- Intensity-based heatmap color coding
- Radius-weighted interference model for realistic coverage visualization
- Critical alert system for hotspots above 80% intensity threshold

### 🎯 Threat Intelligence & Alerts
- Automatic threat hotspot calculation — identifies geographic convergence of:
  - Military aircraft presence
  - Warship positioning
  - Active GPS interference
  - Ongoing conflict events
- Threat level scoring per region
- Real-time conflict event ticker (scrolling live feed)
- Alert system with severity levels: info / warning / critical
- Mini radar display showing nearby entity density

---

## 🗂️ Data Sources

| Source | Data Type | Refresh Rate | License |
|---|---|---|---|
| [OpenSky Network](https://opensky-network.org) | ADS-B aircraft positions | 15 seconds | Free tier |
| [CelesTrak](https://celestrak.org) | Satellite TLE orbital data | 5 minutes | Public domain |
| [AISHub](https://www.aishub.net) | Marine vessel AIS positions | 60 seconds | Free tier |
| [GPSJam.org](https://gpsjam.org) | GPS interference / jamming data | Static / OSINT | Open source |
| [ACLED](https://acleddata.com) | Conflict event data | Daily | Free for research |
| OSINT | Conflict zone boundaries & front lines | Manual curation | Open source |

> **Note:** A Node.js/Express backend proxy handles API requests to avoid CORS restrictions and to rate-limit external API calls. If the backend is unavailable, the app falls back to static seed data so the globe remains functional.

---

## ⚔️ Active Conflicts Tracked (as of 2025)

| # | Conflict | Status | Intensity |
|---|---|---|---|
| 1 | 🇺🇦 Russia–Ukraine War | ![active](https://img.shields.io/badge/active-red) | 🔴 Critical |
| 2 | 🇮🇱 Israel–Gaza War | ![active](https://img.shields.io/badge/active-red) | 🔴 Critical |
| 3 | 🇮🇱 Israel–Lebanon / Hezbollah War | ![active](https://img.shields.io/badge/active-red) | 🟠 High |
| 4 | 🇸🇩 Sudan Civil War | ![active](https://img.shields.io/badge/active-red) | 🔴 Critical |
| 5 | 🇲🇲 Myanmar Civil War | ![active](https://img.shields.io/badge/active-red) | 🟠 High |
| 6 | 🇾🇪 Yemen Civil War / Houthi Conflict | ![active](https://img.shields.io/badge/active-red) | 🟠 High |
| 7 | 🇨🇩 DRC – M23 / Rwanda Conflict | ![active](https://img.shields.io/badge/active-red) | 🟠 High |
| 8 | 🌍 Sahel Jihadist Insurgency (Mali / Burkina Faso / Niger) | ![active](https://img.shields.io/badge/active-red) | 🟡 Medium |
| 9 | 🇸🇴 Somalia – Al-Shabaab Insurgency | ![active](https://img.shields.io/badge/active-red) | 🟡 Medium |
| 10 | 🇭🇹 Haiti Gang Crisis | ![active](https://img.shields.io/badge/active-red) | 🟡 Medium |
| 11 | 🇪🇹 Ethiopia – Amhara Conflict | ![active](https://img.shields.io/badge/active-red) | 🟡 Medium |
| 12 | 🇵🇰 Pakistan – TTP Insurgency | ![active](https://img.shields.io/badge/active-red) | 🟡 Medium |

---

## 📡 GPS Jamming Hotspots (Active)

| # | Location | Type | Intensity |
|---|---|---|---|
| 1 | Kaliningrad, Russia | Jamming | 90% |
| 2 | Eastern Ukraine / Donbas | Jamming | 95% |
| 3 | Black Sea | Spoofing | 85% |
| 4 | Northern Israel / Lebanon | Spoofing | 90% |
| 5 | Gaza Strip | Jamming | 95% |
| 6 | Iraq / Baghdad area | Spoofing | 70% |
| 7 | Syria (regime-controlled areas) | Jamming | 65% |
| 8 | Red Sea / Yemen coast (Houthi) | Jamming | 80% |
| 9 | Gulf of Aden | Jamming | 75% |
| 10 | Baltic Sea / Finnish border | Jamming | 70% |
| 11 | Eastern Mediterranean | Spoofing | 60% |
| 12 | North Korea border / Korean DMZ | Jamming | 80% |
| 13 | South China Sea | Spoofing | 50% |
| 14 | Iran (Tehran area) | Jamming | 60% |
| 15 | Crimea | Jamming | 90% |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript 5 + Vite 5 |
| **3D Globe** | react-globe.gl (Three.js r165 / WebGL) |
| **Orbital Mechanics** | satellite.js v5 (SGP4/SDP4 propagation) |
| **State Management** | Zustand 4 |
| **HTTP Client** | Axios |
| **Backend / Proxy** | Node.js + Express |
| **Container** | Docker + GitHub Container Registry (ghcr.io) |
| **Build Tool** | Vite + TypeScript compiler |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

```bash
# Clone the repository
git clone https://github.com/Atvriders/world-4d-war-track.git
cd world-4d-war-track

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Start both frontend and backend (recommended)
npm run dev:all
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Frontend only (uses live APIs directly — no proxy)
npm run dev

# Backend proxy only
npm run server

# Production build
npm run build
npm run preview
```

---

## 🐳 Docker

```bash
# Pull the latest image
docker pull ghcr.io/atvriders/world-4d-war-track:latest

# Run (frontend on :3000, backend proxy on :3001)
docker run -p 3000:3000 -p 3001:3001 ghcr.io/atvriders/world-4d-war-track:latest

# Open in browser
# http://localhost:3000
```

Or with Docker Compose:

```bash
docker compose up
```

---

## 🖱️ Controls & Keyboard Shortcuts

### Globe Navigation

| Action | Control |
|---|---|
| Rotate globe | Left click + drag |
| Zoom in / out | Mouse scroll wheel |
| Select entity | Left click on aircraft / satellite / vessel |
| Close detail panel | `Esc` or click ✕ |

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+K` | Open global search |
| `G` | Fly to global overview |
| `E` | Fly to Europe |
| `M` | Fly to Middle East |
| `Time slider` | Advance/rewind satellite positions (±6 hours) |

---

## 🧩 UI Panels & Components

The interface is composed of 12 modular panels:

| Component | Description |
|---|---|
| **Globe** | Central WebGL 3D Earth — all data layers rendered here |
| **StatusBar** | Top bar showing live entity counts and connection status |
| **FilterPanel** | Toggle visibility of each data layer (aircraft, satellites, vessels, conflicts, GPS jam) |
| **ConflictSidebar** | Scrollable list of active conflicts with intensity badges and detail expansion |
| **ConflictTicker** | Bottom scrolling ticker of real-time conflict events |
| **SatellitePanel** | Satellite category filter, orbital period data, pass prediction |
| **GpsJamPanel** | GPS interference hotspot list with type and intensity indicators |
| **InfoPanel** | Click-to-open detail card for any selected entity (aircraft, satellite, vessel) |
| **AlertPanel** | Real-time alert feed — critical GPS jamming, military aircraft, conflict events |
| **TimeControl** | Time slider to scrub satellite positions up to 6 hours forward |
| **SearchBar** | Full-text search across all tracked entities and conflict zones (`Ctrl+K`) |
| **MiniRadar** | Compact radar overlay showing entity density around the current camera focus |
| **QuickNav** | One-click fly-to buttons for key regions (Europe, Middle East, Global) |
| **GlobeSettings** | Imagery style selector, rotation toggle, layer opacity controls |
| **Legend** | Map legend explaining color coding for conflict intensity and entity types |
| **LoadingScreen** | Animated splash screen during initial data fetch |

---

## 🏗️ Project Structure

```
world-4d-war-track/
├── src/
│   ├── components/
│   │   ├── Globe/          # Core WebGL globe component
│   │   ├── UI/             # All overlay panels and controls
│   │   └── Layout/         # App shell and layout wrappers
│   ├── data/
│   │   └── conflicts.ts    # Static conflict zone GeoJSON + event data
│   ├── services/
│   │   ├── adsb.ts         # OpenSky Network ADS-B integration
│   │   ├── ais.ts          # AIS marine vessel integration
│   │   ├── satellite.ts    # CelesTrak TLE fetch + SGP4 propagation
│   │   └── gpsJam.ts       # GPS jamming hotspot data + intensity model
│   ├── store/              # Zustand global state stores
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Shared utility functions
│   └── App.tsx
├── server/
│   └── src/
│       └── server.ts       # Express proxy for external APIs
├── Dockerfile
├── docker-compose.yml
└── vite.config.ts
```

---

## ⚠️ Disclaimer

**This application is for educational and research purposes only.**

- All data is sourced from **publicly available, open-source channels** (ADS-B, AIS, TLE, OSINT).
- Data may be **delayed, incomplete, or inaccurate** — aircraft and vessels can disable transponders; satellite TLE data ages between updates.
- **Do not use this application for operational, military, navigation, or safety-critical purposes.**
- Conflict zone boundaries and front lines are approximate and sourced from open-source reporting; they do not represent official government or military assessments.
- GPS jamming hotspot data is derived from OSINT (GPSJam.org and community reports) and may not reflect real-time conditions.
- This project is not affiliated with, endorsed by, or connected to any government, military organization, or intelligence agency.

---

## 🤝 Contributing

Contributions are welcome. Please open an issue or pull request on [GitHub](https://github.com/Atvriders/world-4d-war-track).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch and open a Pull Request

---

## 📄 License

[MIT License](LICENSE) — Copyright © 2025 Atvriders

---

*Built with open-source intelligence. Stay informed.*
