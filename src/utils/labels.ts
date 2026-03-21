// Tooltip/label HTML formatting utilities for react-globe.gl label system
// All labels use inline styles only (no CSS classes)

// Escape user-supplied strings to prevent XSS in label HTML
function esc(s: string | undefined | null): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BASE_STYLE = `background:rgba(5,15,30,0.95);border:1px solid `;
const BASE_STYLE_END = `;padding:8px 10px;font-family:'Courier New',monospace;color:#e0e8f0;font-size:11px;border-radius:4px;line-height:1.6;min-width:160px;max-width:260px`;

// Helper to create base tooltip wrapper HTML
export function tooltipWrapper(content: string, borderColor: string = '#00ff88'): string {
  return `<div style="${BASE_STYLE}${borderColor}${BASE_STYLE_END}">${content}</div>`;
}

// Heading degrees -> cardinal/intercardinal direction
function headingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

// Orbit classification by altitude (km)
function orbitClass(altKm: number): string {
  if (altKm < 2000) return 'LEO';
  if (altKm < 35786) return 'MEO';
  if (altKm < 36000) return 'GEO';
  return 'HEO';
}

// Meters to feet
function mToFt(m: number): number {
  return Math.round(m * 3.28084);
}

// Aircraft hover tooltip HTML
export function formatAircraftLabel(aircraft: {
  callsign: string;
  country: string;
  altitude: number;
  velocity: number;
  heading: number;
  isMilitary: boolean;
  icao24: string;
  onGround: boolean;
}): string {
  const borderColor = aircraft.isMilitary ? '#ff4444' : '#0088ff';

  const militaryBadge = aircraft.isMilitary
    ? `<div style="color:#ff4444;font-weight:bold">&#9888; MILITARY</div>`
    : '';

  const callsignDisplay = aircraft.callsign
    ? esc(aircraft.callsign).toUpperCase()
    : esc(aircraft.icao24).toUpperCase();

  const altFt = mToFt(aircraft.altitude);
  const altM = Math.round(aircraft.altitude);
  const speedKts = Math.round(aircraft.velocity * 1.94384);
  const headingPadded = String(Math.round(aircraft.heading)).padStart(3, '0');
  const compass = headingToCompass(aircraft.heading);

  const groundStatus = aircraft.onGround
    ? `<div style="color:#ffaa00">Status: On Ground</div>`
    : '';

  const content = `
${militaryBadge}
<div style="color:#00ff88;font-weight:bold">&#9992; ${callsignDisplay}</div>
<div style="color:#7a9ab0">Country: ${esc(aircraft.country) || 'Unknown'}</div>
${aircraft.onGround
    ? `<div>Altitude: Ground</div>`
    : `<div>Alt: ${altFt.toLocaleString()} ft (${altM.toLocaleString()} m)</div>`
}
<div>Speed: ${speedKts} kts</div>
<div>Heading: ${headingPadded}&deg; ${compass}</div>
${groundStatus}
<div style="color:#4a6a80;font-size:10px">ICAO: ${esc(aircraft.icao24).toUpperCase()}</div>
`.trim().replace(/\n{2,}/g, '\n');

  return tooltipWrapper(content, borderColor);
}

// Ship hover tooltip HTML
export function formatShipLabel(ship: {
  name: string;
  flag: string;
  type: string;
  speed: number;
  heading: number;
  mmsi: string;
  destination?: string;
}): string {
  const isWarship = /war|navy|naval|military|destroyer|frigate|cruiser|carrier|submarine|patrol/i.test(ship.type);
  const borderColor = isWarship ? '#ff4444' : '#ffaa00';

  const nameColor = isWarship ? '#ff4444' : '#ffaa00';
  const typeIcon = isWarship ? '&#9876;' : '&#9875;';

  const speedKts = ship.speed.toFixed(1);
  const headingPadded = String(Math.round(ship.heading)).padStart(3, '0');
  const compass = headingToCompass(ship.heading);

  const destinationLine = ship.destination
    ? `<div>Dest: ${esc(ship.destination)}</div>`
    : '';

  const content = `
<div style="color:${nameColor};font-weight:bold">${typeIcon} ${esc(ship.name) || 'UNKNOWN'}</div>
<div style="color:#7a9ab0">Flag: ${esc(ship.flag) || 'Unknown'}</div>
<div>Type: ${esc(ship.type) || 'Unknown'}</div>
<div>Speed: ${speedKts} kts</div>
<div>Heading: ${headingPadded}&deg; ${compass}</div>
${destinationLine}
<div style="color:#4a6a80;font-size:10px">MMSI: ${esc(ship.mmsi)}</div>
`.trim().replace(/\n{2,}/g, '\n');

  return tooltipWrapper(content, borderColor);
}

// Satellite hover tooltip HTML
export function formatSatelliteLabel(sat: {
  name: string;
  category: string;
  country: string;
  alt: number;
  velocity: number;
  id: string;
  footprintRadius: number;
}): string {
  const isMilitary = /military|spy|recon|intel|sigint|imint/i.test(sat.category);
  const isNav = /nav|gps|glonass|galileo|beidou|gnss/i.test(sat.category);

  const borderColor = isMilitary ? '#ff4444' : isNav ? '#44ff44' : '#00ff88';
  const nameColor = isMilitary ? '#ff4444' : isNav ? '#44ff44' : '#00ff88';

  const altKm = Math.round(sat.alt);
  const orbit = orbitClass(altKm);
  const velKms = sat.velocity.toFixed(2);
  const footprintKm = Math.round(sat.footprintRadius);

  const categoryBadge = `<span style="background:${borderColor}22;border:1px solid ${borderColor};border-radius:2px;padding:0 4px;font-size:10px;color:${borderColor}">${esc(sat.category).toUpperCase()}</span>`;

  const content = `
<div style="color:${nameColor};font-weight:bold">&#11088; ${esc(sat.name)}</div>
<div>${categoryBadge}</div>
<div style="color:#7a9ab0">Country: ${esc(sat.country) || 'Unknown'}</div>
<div>Orbit: <span style="color:#aaccee">${orbit}</span> &mdash; ${altKm.toLocaleString()} km</div>
<div>Velocity: ${velKms} km/s</div>
<div>Footprint: ~${footprintKm.toLocaleString()} km</div>
<div style="color:#4a6a80;font-size:10px">NORAD: ${esc(sat.id)}</div>
`.trim().replace(/\n{2,}/g, '\n');

  return tooltipWrapper(content, borderColor);
}

// Conflict zone hover tooltip HTML
export function formatConflictLabel(zone: {
  name: string;
  intensity: string;
  status: string;
  parties: string[];
  casualties: { total?: number };
  startDate: string;
}): string {
  const isCritical = /critical|high|major|severe/i.test(zone.intensity);
  const borderColor = isCritical ? '#ff1111' : '#ff4444';
  const intensityColor = isCritical ? '#ff1111' : '#ffaa00';

  const partiesDisplay = zone.parties.length
    ? zone.parties.map(p => esc(p)).join(' vs ')
    : 'Unknown';

  const casualtiesLine = zone.casualties?.total != null
    ? `<div>Casualties: <span style="color:#ff6666">${zone.casualties.total.toLocaleString()}</span></div>`
    : '';

  const content = `
<div style="color:#ff4444;font-weight:bold">&#128162; ${esc(zone.name)}</div>
<div>Status: <span style="color:#ffcc00">${esc(zone.status)}</span></div>
<div>Intensity: <span style="color:${intensityColor}">${esc(zone.intensity).toUpperCase()}</span></div>
<div style="color:#7a9ab0;font-size:10px">${partiesDisplay}</div>
${casualtiesLine}
<div style="color:#4a6a80;font-size:10px">Since: ${esc(zone.startDate)}</div>
`.trim().replace(/\n{2,}/g, '\n');

  return tooltipWrapper(content, borderColor);
}

// GPS jam cell hover tooltip HTML
export function formatGpsJamLabel(cell: {
  lat: number;
  lng: number;
  level: number;
  type: string;
  radius: number;
  confirmed: boolean;
}): string {
  const borderColor = '#ffcc00';

  const levelPct = Math.round(cell.level * 100);
  const levelColor = levelPct >= 80 ? '#ff4444' : levelPct >= 50 ? '#ffaa00' : '#ffcc00';

  const confirmedBadge = cell.confirmed
    ? `<span style="color:#ff4444;font-weight:bold">&#10003; CONFIRMED</span>`
    : `<span style="color:#ffcc0088">UNCONFIRMED</span>`;

  const latDir = cell.lat >= 0 ? 'N' : 'S';
  const lngDir = cell.lng >= 0 ? 'E' : 'W';
  const latDisplay = `${Math.abs(cell.lat).toFixed(1)}&deg;${latDir}`;
  const lngDisplay = `${Math.abs(cell.lng).toFixed(1)}&deg;${lngDir}`;

  const content = `
<div style="color:#ffcc00;font-weight:bold">&#9889; GPS JAMMING</div>
<div>Type: ${esc(cell.type)}</div>
<div>Level: <span style="color:${levelColor};font-weight:bold">${levelPct}%</span></div>
<div>Radius: ~${cell.radius} km</div>
<div>${confirmedBadge}</div>
<div style="color:#7a9ab0;font-size:10px">~${latDisplay}, ${lngDisplay}</div>
`.trim().replace(/\n{2,}/g, '\n');

  return tooltipWrapper(content, borderColor);
}
