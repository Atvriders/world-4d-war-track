export interface PiracyZone {
  name: string;
  lat: number;
  lng: number;
  radius: number; // km
  risk: 'low' | 'medium' | 'high' | 'critical';
  incidents2024: number;
  type: 'piracy' | 'armed_robbery' | 'hijacking' | 'missile_attack';
  description: string;
}

export const PIRACY_ZONES: PiracyZone[] = [
  { name: 'Gulf of Aden / Bab el-Mandeb', lat: 12.8, lng: 43.5, radius: 200, risk: 'critical', incidents2024: 54, type: 'missile_attack', description: 'Houthi anti-ship missile and drone attacks on commercial vessels' },
  { name: 'Somali Basin', lat: 5.0, lng: 47.0, radius: 250, risk: 'high', incidents2024: 8, type: 'hijacking', description: 'Somali piracy resurgence following reduced naval patrols' },
  { name: 'Gulf of Guinea', lat: 2.0, lng: 3.0, radius: 400, risk: 'high', incidents2024: 32, type: 'armed_robbery', description: 'Armed robbery and kidnapping for ransom' },
  { name: 'Strait of Malacca', lat: 2.0, lng: 102.0, radius: 150, risk: 'medium', incidents2024: 12, type: 'armed_robbery', description: 'Opportunistic armed robbery on anchored vessels' },
  { name: 'Singapore Strait', lat: 1.2, lng: 104.0, radius: 80, risk: 'medium', incidents2024: 18, type: 'armed_robbery', description: 'Robbery on slow-moving vessels in traffic separation scheme' },
  { name: 'Red Sea (Houthi Zone)', lat: 15.0, lng: 42.0, radius: 300, risk: 'critical', incidents2024: 80, type: 'missile_attack', description: 'Active Houthi anti-shipping campaign' },
];
