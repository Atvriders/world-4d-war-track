export interface ArmsFlow {
  from: string;
  to: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  supplier: string;
  recipient: string;
  category: string; // 'artillery', 'missiles', 'drones', 'vehicles', 'ammunition', 'air_defense'
  value: string; // estimated annual value
  active: boolean;
}

export const ARMS_FLOWS: ArmsFlow[] = [
  // Ukraine supply lines
  { from: 'USA', to: 'Ukraine', startLat: 38.9, startLng: -77.0, endLat: 50.4, endLng: 30.5, supplier: 'United States', recipient: 'Ukraine', category: 'missiles', value: '$46B+', active: true },
  { from: 'Germany', to: 'Ukraine', startLat: 52.5, startLng: 13.4, endLat: 50.4, endLng: 30.5, supplier: 'Germany', recipient: 'Ukraine', category: 'air_defense', value: '$17B+', active: true },
  { from: 'UK', to: 'Ukraine', startLat: 51.5, startLng: -0.1, endLat: 50.4, endLng: 30.5, supplier: 'United Kingdom', recipient: 'Ukraine', category: 'missiles', value: '$12B+', active: true },
  // Russia supply lines
  { from: 'North Korea', to: 'Russia', startLat: 39.0, startLng: 125.7, endLat: 55.75, endLng: 37.62, supplier: 'North Korea', recipient: 'Russia', category: 'ammunition', value: 'Millions of shells', active: true },
  { from: 'Iran', to: 'Russia', startLat: 35.7, startLng: 51.4, endLat: 55.75, endLng: 37.62, supplier: 'Iran', recipient: 'Russia', category: 'drones', value: 'Shahed-136 drones', active: true },
  // Middle East
  { from: 'Iran', to: 'Houthis', startLat: 35.7, startLng: 51.4, endLat: 15.4, endLng: 44.2, supplier: 'Iran (IRGC)', recipient: 'Houthis', category: 'missiles', value: 'Anti-ship missiles', active: true },
  { from: 'Iran', to: 'Hezbollah', startLat: 35.7, startLng: 51.4, endLat: 33.9, endLng: 35.5, supplier: 'Iran (IRGC)', recipient: 'Hezbollah', category: 'missiles', value: 'Precision missiles', active: true },
  { from: 'USA', to: 'Israel', startLat: 38.9, startLng: -77.0, endLat: 32.1, endLng: 34.8, supplier: 'United States', recipient: 'Israel', category: 'ammunition', value: '$3.8B/yr', active: true },
  // Africa
  { from: 'UAE', to: 'Sudan RSF', startLat: 24.5, startLng: 54.7, endLat: 15.6, endLng: 32.5, supplier: 'UAE', recipient: 'RSF', category: 'vehicles', value: 'Armored vehicles', active: true },
  { from: 'Russia', to: 'Mali', startLat: 55.75, startLng: 37.62, endLat: 12.6, endLng: -8.0, supplier: 'Russia (Wagner)', recipient: 'Mali junta', category: 'vehicles', value: 'Military equipment', active: true },
];
