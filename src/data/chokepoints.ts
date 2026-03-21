export interface Chokepoint {
  name: string;
  lat: number;
  lng: number;
  width: string;
  dailyTraffic: string;
  oilFlow: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  threat: string;
}

export const CHOKEPOINTS: Chokepoint[] = [
  { name: 'Strait of Hormuz', lat: 26.6, lng: 56.2, width: '33 km', dailyTraffic: '~60 vessels', oilFlow: '21M bbl/day', risk: 'high', threat: 'Iran tensions' },
  { name: 'Bab el-Mandeb', lat: 12.6, lng: 43.3, width: '26 km', dailyTraffic: '~50 vessels', oilFlow: '6.2M bbl/day', risk: 'critical', threat: 'Houthi attacks' },
  { name: 'Suez Canal', lat: 30.5, lng: 32.3, width: '205 m', dailyTraffic: '~55 vessels', oilFlow: '5.5M bbl/day', risk: 'high', threat: 'Regional instability' },
  { name: 'Strait of Malacca', lat: 2.5, lng: 101.5, width: '65 km', dailyTraffic: '~80 vessels', oilFlow: '16M bbl/day', risk: 'medium', threat: 'Piracy' },
  { name: 'Turkish Straits (Bosphorus)', lat: 41.1, lng: 29.0, width: '700 m', dailyTraffic: '~45 vessels', oilFlow: '2.4M bbl/day', risk: 'medium', threat: 'Russia-Ukraine' },
  { name: 'GIUK Gap', lat: 63.0, lng: -15.0, width: '~900 km', dailyTraffic: 'NATO patrol', oilFlow: 'N/A', risk: 'medium', threat: 'Russian submarine activity' },
  { name: 'Taiwan Strait', lat: 24.0, lng: 118.5, width: '130 km', dailyTraffic: '~90 vessels', oilFlow: '8M bbl/day', risk: 'high', threat: 'China-Taiwan tensions' },
  { name: 'Danish Straits', lat: 55.7, lng: 12.6, width: '4 km', dailyTraffic: '~65 vessels', oilFlow: '3.2M bbl/day', risk: 'medium', threat: 'Baltic tensions' },
];
