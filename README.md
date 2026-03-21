# 🌍 World 4D War Track

[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fatvriders%2Fworld--4d--war--track-blue?logo=docker)](https://github.com/Atvriders/world-4d-war-track/pkgs/container/world-4d-war-track)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=three.js)](https://threejs.org)

**A real-time 4D global intelligence dashboard** — 3D Earth globe (WebGL) + time dimension — showing live aircraft, marine vessels, satellites, active conflict zones, and GPS jamming/spoofing interference, all on a single interactive globe.

> **4D** = 3 spatial dimensions (interactive 3D globe) + time (satellite orbital prediction, conflict event replay, 6-hour position forecasting).

> **Real-time only** — zero simulated or fake data. All dynamic entities (aircraft, ships, satellites) come from live API feeds. When a feed is offline, the map shows empty with an "OFFLINE" alert and retries automatically until connected.

---

## 📸 Screenshots

> Screenshots / live demo coming soon.

---

## ✨ Overview

World 4D War Track aggregates open-source intelligence (OSINT) and public APIs to paint a live picture of the global security environment:

| Layer | Coverage | Refresh | Source |
|---|---|---|---|
| ✈️ ADS-B Aircraft | Live global aircraft | 60 seconds | OpenSky Network |
| 🛰️ Satellites | 400+ satellites with orbital paths | 60 minutes | CelesTrak |
| 🚢 AIS Vessels | Live global vessels | 60 seconds | AISHub |
| ⚔️ Conflict Zones | 12 active conflicts (2025–2026) | Static OSINT | ACLED / UN |
| 📡 GPS Interference | 15 confirmed hotspots | Static OSINT | GPSJam.org |
| ☢️ Nuclear Facilities | 8 sites near conflict zones | Static OSINT | IAEA |
| 🎯 Military Bases | 15 installations worldwide | Static OSINT | Public records |
| 🌊 Maritime Chokepoints | 8 strategic straits | Static OSINT | EIA / IMO |
| 🏴‍☠️ Piracy Zones | 6 high-risk maritime areas | Static OSINT | IMB |
| 🔫 Weapon Ranges | Missile/drone coverage circles | Static OSINT | CSIS / IISS |
| ⚡ Energy Infrastructure | 9 oil/gas facilities | Static OSINT | IEA / EIA |
| 🌐 Cyber Threats | 5 APT group attack flows | Static OSINT | Mandiant / CISA |
| 🚀 Arms Flows | 10 weapons supply routes | Static OSINT | SIPRI |
| 👥 Refugee Flows | 10 displacement corridors | Static OSINT | UNHCR |
| 🔗 Submarine Cables | 5 critical undersea routes | Static OSINT | TeleGeography |
| 🚫 Sanctions Zones | 6 no-fly / blockade zones | Static OSINT | UN / US / EU |

---

## 🚀 Features

### 🌍 3D Globe Visualization
- WebGL-powered Earth with night satellite imagery via **react-globe.gl** (Three.js)
- Tilted camera angle showing satellites overhead in orbital arc
- Twinkling star field background, atmospheric glow
- Auto-rotation, multiple imagery styles, smooth fly-to animations

### 🛰️ Satellite Tracking
- Live TLE data from **CelesTrak** with **SGP4** orbital propagation
- Categories: ISS, Military, Spy/Reconnaissance, GPS/GLONASS/Galileo/BeiDou, Weather, Starlink
- **Time slider** moves satellites along real orbits (4D)
- Orbital ground tracks, coverage footprint rings, satellite-to-ground connection beams
- Constellation links (GPS green, GLONASS red, Galileo blue, BeiDou yellow)

### ✈️ ADS-B Aircraft Tracking
- Live **OpenSky Network** feed
- Military aircraft detection via callsign patterns + ICAO hex ranges
- Visual differentiation: military (red glow), civilian (blue), helicopter (green), emergency squawk (white pulse)
- Squawk emergency alerts: 7500 (hijack), 7600 (radio failure), 7700 (emergency)
- Flight trails with military trails brighter/thicker than civilian

### 🚢 Maritime Tracking (AIS)
- Live **AISHub** vessel feed
- Warship identification and carrier strike group auto-detection
- Ship trails colored by type (warship red, tanker orange, cargo blue)
- Carrier group formation rings with navy-specific colors (US blue, Russia red, China yellow)

### ⚔️ Conflict Zones & Death Tolls
- **12 active conflicts** with GeoJSON boundaries and front line overlays
- **Death toll bar** always visible: "GLOBAL CONFLICT DEATHS: 1,243,000+"
- Per-conflict casualty breakdown: military / civilian / displaced with source citations
- Conflict event markers on map (airstrikes red, drones cyan, missiles magenta)
- Intensity sparklines showing escalation/de-escalation trends
- Deaths per day estimate, sorted by death count

### 📡 GPS Jamming & Spoofing
- **15 confirmed hotspots** with intensity heatmap and altitude displacement
- Spoofing vs jamming differentiation
- GPS jam to navigation satellite connection arcs
- Critical alert system for >80% intensity zones

### 🎯 Intelligence Overlays (17 toggleable layers)
- **Nuclear facilities** with evacuation/shelter/monitoring range circles
- **Military bases** (US/Russia/China/UK/NATO) as diamond markers
- **Maritime chokepoints** with oil flow volume rings and traffic data
- **Piracy zones** with pulsing skull markers and incident counts
- **Weapon range circles** (Houthi missiles, NK ICBMs, Iran SAMs, Ukraine Neptun)
- **Submarine cables** colored by vulnerability risk
- **Refugee flow arrows** with width proportional to displaced population
- **Arms trade arcs** (US→Ukraine, Iran→Houthis, NK→Russia)
- **Cyber attack arcs** (Sandworm, Volt Typhoon, Lazarus Group, APT33)
- **Sanctions/no-fly zones** (Ukraine, Libya, Red Sea, DPRK)
- **Trade route disruptions** (Suez blocked red, Cape reroute green)
- **Drone activity heatmap** (cyan-purple)
- **Airspace closures** (NOTAMs)
- **Energy infrastructure** (oil terminals, pipelines, gas fields)

### 📊 Analysis Panels
- **War Impact Panel** (press `I`) — per-conflict air/sea traffic disruption + GPS interference + disruption score
- **Economy Panel** (press `Y`) — 10 conflict-affected commodities (oil $110.50, gold $4,500, copper $13,080) + trade route disruptions
- **Sources Panel** (press `U`) — all 14 data sources with clickable URLs + inline ⓘ tooltips on every number

---

## 🗂️ Data Sources

All data is from **publicly available, open-source channels**:

| Source | Data Type | Refresh | Notes |
|---|---|---|---|
| [OpenSky Network](https://opensky-network.org) | ADS-B aircraft | 60s (rate-safe) | Free tier, no auth |
| [CelesTrak](https://celestrak.org) | Satellite TLE | 60min (fair use) | Public domain |
| [AISHub](https://www.aishub.net) | AIS vessels | 60s | Free tier |
| [GPSJam.org](https://gpsjam.org) | GPS interference | Static OSINT | Open source |
| [ACLED](https://acleddata.com) | Conflict events | Static | Free for research |
| [UNHCR](https://data.unhcr.org) | Refugee data | Static | Public |
| [IAEA PRIS](https://pris.iaea.org) | Nuclear facilities | Static | Public |
| [SIPRI](https://www.sipri.org) | Arms transfers | Static | Public |
| [IMB](https://www.icc-ccs.org) | Piracy data | Static | Public |
| [CSIS](https://missilethreat.csis.org) | Weapon ranges | Static | Public |
| [TeleGeography](https://www.submarinecablemap.com) | Submarine cables | Static | Public |

> **Rate-limit safe:** The backend proxy caches responses and respects API rate limits. HTTP 429 responses trigger automatic backoff. All requests include a proper User-Agent header.

---

## ⚔️ Active Conflicts Tracked (as of 2025–2026)

| # | Conflict | Deaths | Intensity |
|---|---|---|---|
| 1 | 🇺🇦 Russia–Ukraine War | 700,000+ | 🔴 Critical |
| 2 | 🇸🇩 Sudan Civil War | 300,000+ | 🔴 Critical |
| 3 | 🇾🇪 Yemen / Houthi Conflict | 377,000+ | 🟠 High |
| 4 | 🇸🇴 Somalia – Al-Shabaab | 500,000+ | 🟡 Medium |
| 5 | 🇵🇰 Pakistan – TTP | 80,000+ | 🟡 Medium |
| 6 | 🇮🇱 Israel–Gaza War | 58,000+ | 🔴 Critical |
| 7 | 🇲🇲 Myanmar Civil War | 50,000+ | 🟠 High |
| 8 | 🇨🇩 DRC – M23 / Rwanda | 50,000+ | 🟠 High |
| 9 | 🌍 Sahel Jihadist Insurgency | 100,000+ | 🟡 Medium |
| 10 | 🇪🇹 Ethiopia – Amhara | 10,000+ | 🟡 Medium |
| 11 | 🇭🇹 Haiti Gang Crisis | 8,000+ | 🟡 Medium |
| 12 | 🇮🇱 Israel–Lebanon / Hezbollah | 4,500+ | 🟠 High |

*Sources: ACLED, UN OHCHR, UN OCHA, UNHCR, AAPP, SATP, Kivu Security Tracker*

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript 5 + Vite 5 |
| **3D Globe** | react-globe.gl (Three.js r165 / WebGL) |
| **Orbital Mechanics** | satellite.js v5 (SGP4/SDP4 propagation) |
| **State Management** | Zustand 4 |
| **Backend / Proxy** | Node.js + Express |
| **Container** | Docker + GitHub Container Registry (ghcr.io) |

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The backend proxy (port 3001) is required for live data. Without it, the dashboard shows "OFFLINE" alerts and retries automatically until the server is reachable.

---

## 🐳 Docker

```bash
docker pull ghcr.io/atvriders/world-4d-war-track:latest
docker run -p 3000:3000 -p 3001:3001 ghcr.io/atvriders/world-4d-war-track:latest
```

Or with Docker Compose:

```bash
docker compose up
```

---

## 🖱️ Keyboard Shortcuts

### Layer Toggles

| Key | Layer |
|---|---|
| `S` | Satellites |
| `A` | Aircraft |
| `V` | Vessels |
| `W` | War zones |
| `J` | GPS jamming |
| `O` | Satellite orbits |
| `N` | Nuclear facilities |
| `B` | Military bases |
| `C` | Submarine cables |
| `R` | Refugee flows |
| `P` | Piracy zones |
| `D` | Drone activity |
| `T` | Threat rings |
| `X` | Cyber threats |
| `K` | Chokepoints |

### Navigation & Panels

| Key | Action |
|---|---|
| `G` | Fly to global view |
| `E` | Fly to Europe |
| `M` | Fly to Middle East |
| `Ctrl+K` | Open search |
| `I` | War Impact panel |
| `Y` | Economy panel |
| `U` | Data Sources panel |
| `F` | Fullscreen |
| `Space` | Play / pause time |
| `←` / `→` | Scrub time ±15 min |
| `0` | Reset time to now |
| `H` / `?` | Keyboard help |
| `Esc` | Close panels |

---

## 🏗️ Project Structure

```
world-4d-war-track/
├── src/
│   ├── components/
│   │   ├── Globe/              # WebGL 3D globe (all layers rendered here)
│   │   ├── UI/                 # 25+ overlay panels and controls
│   │   └── ErrorBoundary.tsx   # Crash recovery screen
│   ├── data/                   # Static OSINT reference data
│   │   ├── conflicts.ts        # 12 conflict zones + 72 events
│   │   ├── nuclearSites.ts     # 8 nuclear facilities
│   │   ├── militaryBases.ts    # 15 military installations
│   │   ├── chokepoints.ts      # 8 strategic straits
│   │   ├── piracyZones.ts      # 6 piracy zones
│   │   ├── weaponRanges.ts     # Missile/drone ranges
│   │   ├── energyInfra.ts      # 9 oil/gas facilities
│   │   ├── cyberThreats.ts     # 5 APT groups
│   │   ├── armsFlows.ts        # 10 arms supply routes
│   │   ├── refugeeFlows.ts     # 10 displacement corridors
│   │   ├── seaCables.ts        # 5 submarine cables
│   │   ├── sanctionsZones.ts   # 6 sanctions/no-fly zones
│   │   ├── airspaceClosures.ts # 7 FIR closures
│   │   └── economyData.ts      # 10 commodities + trade disruptions
│   ├── services/               # Live API integrations
│   │   ├── adsb.ts             # OpenSky Network (ADS-B)
│   │   ├── ais.ts              # AISHub (marine AIS)
│   │   ├── satellite.ts        # CelesTrak (TLE + SGP4)
│   │   ├── gpsJam.ts           # GPS jamming (live + OSINT fallback)
│   │   └── rateLimitError.ts   # HTTP 429 detection + backoff
│   ├── store/index.ts          # Zustand state (imports types from types/)
│   ├── types/index.ts          # All TypeScript interfaces
│   ├── hooks/useDataRefresh.ts # Polling, alerts, time playback, retry
│   └── utils/                  # Geospatial math, labels, colors
├── server/src/server.js        # Express proxy (rate-limited, cached)
├── Dockerfile                  # Multi-stage build (Node 20.11 Alpine)
├── docker-compose.yml          # Container orchestration
└── .dockerignore               # Build context optimization
```

---

## 🛡️ Security & Reliability

- **Real-time only** — zero simulated or fake data; offline sources show empty with alerts
- **XSS Prevention** — all API data HTML-escaped before rendering
- **Error Boundary** — crash recovery screen instead of white page
- **Security Headers** — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **CORS Restriction** — configurable via `CORS_ORIGIN` env var
- **Rate-limit safe** — respects API limits (OpenSky 60s cache, CelesTrak 60min cache, 429 detection with backoff)
- **Persistent retry** — never gives up; exponential backoff 10s→20s→40s→60s cap
- **In-flight guard** — prevents duplicate simultaneous API requests
- **Request staggering** — CelesTrak TLE groups fetched sequentially with 2s delays
- **Fetch timeouts** — 15-second AbortController on all upstream calls
- **Cache eviction** — server cache capped at 100 entries
- **Alert caps** — store limited to 100 alerts; dedup keys cleaned hourly
- **Signal handling** — Docker forwards SIGTERM/SIGINT, waits for backend health
- **Offline alerts** — per-source OFFLINE/ONLINE status with auto-dismiss on recovery
- **Source citations** — every casualty number traced to ACLED, UN OHCHR, UNHCR, etc.

---

## ⚠️ Disclaimer

**This application is for educational and research purposes only.**

- All data is sourced from **publicly available, open-source channels** (ADS-B, AIS, TLE, OSINT).
- Data may be **delayed, incomplete, or inaccurate** — aircraft and vessels can disable transponders; satellite TLE data ages between updates.
- **Do not use this application for operational, military, navigation, or safety-critical purposes.**
- Conflict zone boundaries and front lines are approximate and sourced from open-source reporting; they do not represent official government or military assessments.
- GPS jamming hotspot data is derived from OSINT (GPSJam.org and community reports) and may not reflect real-time conditions.
- Casualty figures are estimates from cited sources (ACLED, UN agencies) and subject to revision.
- This project is not affiliated with, endorsed by, or connected to any government, military organization, or intelligence agency.

---

## 🤝 Contributing

Contributions are welcome. Please open an issue or pull request on [GitHub](https://github.com/Atvriders/world-4d-war-track).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch and open a Pull Request

---

*Built with open-source intelligence. Stay informed.*
