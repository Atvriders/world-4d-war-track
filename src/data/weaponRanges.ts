export interface WeaponRange {
  name: string;
  operator: string;
  lat: number;
  lng: number;
  ranges: { weapon: string; rangeKm: number; type: 'ballistic' | 'cruise' | 'drone' | 'sam' | 'rocket' }[];
}

export const WEAPON_RANGES: WeaponRange[] = [
  {
    name: 'Houthi Launch Sites (Yemen)',
    operator: 'Houthis/Ansar Allah',
    lat: 15.4, lng: 44.2,
    ranges: [
      { weapon: 'Anti-ship missiles', rangeKm: 300, type: 'cruise' },
      { weapon: 'Ballistic missiles', rangeKm: 1500, type: 'ballistic' },
      { weapon: 'Shahed-136 drones', rangeKm: 2000, type: 'drone' },
    ]
  },
  {
    name: 'Hezbollah (Southern Lebanon)',
    operator: 'Hezbollah',
    lat: 33.3, lng: 35.5,
    ranges: [
      { weapon: 'Katyusha rockets', rangeKm: 45, type: 'rocket' },
      { weapon: 'Fateh-110 missiles', rangeKm: 300, type: 'ballistic' },
      { weapon: 'Precision missiles', rangeKm: 500, type: 'cruise' },
    ]
  },
  {
    name: 'Iran (Central)',
    operator: 'IRGC',
    lat: 32.7, lng: 51.7,
    ranges: [
      { weapon: 'Shahab-3', rangeKm: 2000, type: 'ballistic' },
      { weapon: 'Khorramshahr', rangeKm: 2000, type: 'ballistic' },
      { weapon: 'Shahed-136', rangeKm: 2500, type: 'drone' },
      { weapon: 'S-300 SAM', rangeKm: 200, type: 'sam' },
    ]
  },
  {
    name: 'North Korea (Pyongyang)',
    operator: 'KPA',
    lat: 39.0, lng: 125.7,
    ranges: [
      { weapon: 'Hwasong-15 ICBM', rangeKm: 13000, type: 'ballistic' },
      { weapon: 'Nodong MRBM', rangeKm: 1500, type: 'ballistic' },
      { weapon: 'KN-23 SRBM', rangeKm: 600, type: 'ballistic' },
    ]
  },
  {
    name: 'Ukraine Drone Ops',
    operator: 'Ukraine',
    lat: 50.4, lng: 30.5,
    ranges: [
      { weapon: 'Neptun cruise missile', rangeKm: 300, type: 'cruise' },
      { weapon: 'Long-range drones', rangeKm: 1500, type: 'drone' },
      { weapon: 'HIMARS', rangeKm: 80, type: 'rocket' },
    ]
  },
];
