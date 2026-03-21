export interface SanctionsZone {
  name: string;
  lat: number;
  lng: number;
  radius: number; // km
  type: 'no_fly' | 'naval_blockade' | 'trade_embargo' | 'arms_embargo';
  enforcedBy: string;
  since: string;
  description: string;
}

export const SANCTIONS_ZONES: SanctionsZone[] = [
  { name: 'Ukraine No-Fly Zone (Russian airspace closure)', lat: 48.0, lng: 37.0, radius: 400, type: 'no_fly', enforcedBy: 'Ukraine', since: '2022-02', description: 'Ukrainian airspace restriction over eastern conflict zone (NATO has NOT declared a no-fly zone)' },
  { name: 'North Korea Trade Embargo', lat: 39.0, lng: 127.0, radius: 300, type: 'trade_embargo', enforcedBy: 'UN Security Council', since: '2006', description: 'UN sanctions on DPRK trade' },
  { name: 'Iran Arms Embargo Zone', lat: 32.0, lng: 53.0, radius: 500, type: 'arms_embargo', enforcedBy: 'US/EU', since: '1979/2006', description: 'US sanctions since 1979; UN nuclear sanctions since 2006; UN arms embargo expired 2020; US/EU sanctions reimposed 2018' },
  { name: 'Libya No-Fly Zone (Historical)', lat: 27.0, lng: 17.0, radius: 400, type: 'no_fly', enforcedBy: 'UN', since: '2011', description: 'UNSCR 1973 no-fly enforcement (Historical — UNSCR 1973 enforcement ended 2012, no longer active)' },
  { name: 'Red Sea Maritime Security Zone', lat: 14.0, lng: 42.5, radius: 300, type: 'naval_blockade', enforcedBy: 'US/UK Coalition', since: '2024', description: 'Operation Prosperity Guardian against Houthi attacks' },
  { name: 'Syria Restricted Airspace', lat: 35.0, lng: 38.0, radius: 350, type: 'no_fly', enforcedBy: 'Various', since: '2012', description: 'Multiple overlapping restricted zones' },
];
