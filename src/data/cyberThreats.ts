export interface CyberThreat {
  name: string;
  originLat: number;
  originLng: number;
  targetLat: number;
  targetLng: number;
  originCountry: string;
  targetCountry: string;
  type: 'ransomware' | 'espionage' | 'ddos' | 'infrastructure' | 'election_interference';
  group: string;
  active: boolean;
  description: string;
}

export const CYBER_THREATS: CyberThreat[] = [
  { name: 'Sandworm Power Grid Attacks', originLat: 55.75, originLng: 37.62, targetLat: 50.45, targetLng: 30.52, originCountry: 'Russia', targetCountry: 'Ukraine', type: 'infrastructure', group: 'Sandworm (GRU)', active: true, description: 'Ongoing attacks on Ukrainian power grid and telecom' },
  { name: 'Volt Typhoon Infiltration', originLat: 39.9, originLng: 116.4, targetLat: 38.9, targetLng: -77.0, originCountry: 'China', targetCountry: 'USA', type: 'espionage', group: 'Volt Typhoon (MSS)', active: true, description: 'Pre-positioning in US critical infrastructure' },
  { name: 'Lazarus Group Crypto Theft', originLat: 39.0, originLng: 125.7, targetLat: 37.6, targetLng: 127.0, originCountry: 'North Korea', targetCountry: 'Various', type: 'ransomware', group: 'Lazarus Group (RGB)', active: true, description: 'Cryptocurrency exchange attacks funding weapons programs' },
  { name: 'APT33 Energy Sector', originLat: 35.7, originLng: 51.4, targetLat: 24.7, targetLng: 46.7, originCountry: 'Iran', targetCountry: 'Saudi Arabia', type: 'infrastructure', group: 'APT33 (IRGC)', active: true, description: 'Targeting petroleum and aviation sectors' },
  { name: 'IT Army of Ukraine', originLat: 50.45, originLng: 30.52, targetLat: 55.75, targetLng: 37.62, originCountry: 'Ukraine', targetCountry: 'Russia', type: 'ddos', group: 'IT Army', active: true, description: 'Volunteer DDoS campaigns against Russian infrastructure' },
];
