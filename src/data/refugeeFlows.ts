export interface RefugeeFlow {
  from: string; // conflict zone name
  to: string; // destination country
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  count: number; // approximate displaced persons
  year: string;
}

export const REFUGEE_FLOWS: RefugeeFlow[] = [
  // Ukraine
  { from: 'Ukraine', to: 'Poland', startLat: 50.4, startLng: 30.5, endLat: 52.2, endLng: 21.0, count: 2100000, year: '2022-2026' },
  { from: 'Ukraine', to: 'Germany', startLat: 50.4, startLng: 30.5, endLat: 52.5, endLng: 13.4, count: 850000, year: '2022-2026' },
  { from: 'Ukraine', to: 'Czech Republic', startLat: 50.4, startLng: 30.5, endLat: 50.1, endLng: 14.4, count: 380000, year: '2022-2026' },
  // Syria
  { from: 'Syria', to: 'Turkey', startLat: 36.2, startLng: 37.2, endLat: 39.9, endLng: 32.9, count: 3600000, year: '2011-2026' },
  { from: 'Syria', to: 'Lebanon', startLat: 36.2, startLng: 37.2, endLat: 33.9, endLng: 35.5, count: 1500000, year: '2011-2026' },
  // Gaza
  { from: 'Gaza', to: 'Egypt (Rafah)', startLat: 31.3, startLng: 34.3, endLat: 31.1, endLng: 33.8, count: 100000, year: '2023-2026' },
  // Sudan
  { from: 'Sudan', to: 'Chad', startLat: 15.6, startLng: 32.5, endLat: 12.1, endLng: 15.0, count: 600000, year: '2023-2026' },
  { from: 'Sudan', to: 'Egypt', startLat: 15.6, startLng: 32.5, endLat: 30.0, endLng: 31.2, count: 500000, year: '2023-2026' },
  // Myanmar
  { from: 'Myanmar', to: 'Bangladesh', startLat: 19.8, startLng: 96.2, endLat: 21.4, endLng: 92.0, count: 960000, year: '2017-2026' },
  { from: 'Myanmar', to: 'Thailand', startLat: 19.8, startLng: 96.2, endLat: 13.8, endLng: 100.5, count: 150000, year: '2021-2026' },
];
