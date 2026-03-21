// Static data for known nuclear facilities near conflict zones

export interface NuclearSite {
  name: string;
  lat: number;
  lng: number;
  country: string;
  type: 'power_plant' | 'exclusion' | 'weapons' | 'enrichment';
  status: 'active' | 'occupied' | 'contested' | 'decommissioned';
  risk: 'critical' | 'high' | 'medium' | 'low';
}

export const NUCLEAR_SITES: NuclearSite[] = [
  { name: 'Zaporizhzhia NPP', lat: 47.507, lng: 34.585, country: 'Ukraine', type: 'power_plant', status: 'occupied', risk: 'critical' },
  { name: 'Chernobyl Exclusion Zone', lat: 51.389, lng: 30.099, country: 'Ukraine', type: 'exclusion', status: 'contested', risk: 'high' },
  { name: 'Dimona Nuclear Facility', lat: 31.001, lng: 35.145, country: 'Israel', type: 'weapons', status: 'active', risk: 'high' },
  { name: 'Bushehr NPP', lat: 28.832, lng: 50.888, country: 'Iran', type: 'power_plant', status: 'active', risk: 'medium' },
  { name: 'Natanz Enrichment', lat: 33.724, lng: 51.727, country: 'Iran', type: 'enrichment', status: 'active', risk: 'high' },
  { name: 'Yongbyon Complex', lat: 39.796, lng: 125.754, country: 'North Korea', type: 'weapons', status: 'active', risk: 'critical' },
  { name: 'Barakah NPP', lat: 23.960, lng: 52.257, country: 'UAE', type: 'power_plant', status: 'active', risk: 'low' },
  { name: 'Kudankulam NPP', lat: 8.168, lng: 77.711, country: 'India', type: 'power_plant', status: 'active', risk: 'low' },
];
