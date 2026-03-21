export interface EnergyFacility {
  name: string;
  lat: number;
  lng: number;
  type: 'oil_field' | 'gas_field' | 'refinery' | 'pipeline_hub' | 'lng_terminal' | 'oil_terminal';
  country: string;
  capacity: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  nearConflict?: string;
}

export const ENERGY_FACILITIES: EnergyFacility[] = [
  { name: 'Abqaiq Processing', lat: 25.94, lng: 49.67, type: 'refinery', country: 'Saudi Arabia', capacity: '7M bbl/day', risk: 'high', nearConflict: 'Yemen/Iran' },
  { name: 'Ras Tanura Terminal', lat: 26.64, lng: 50.17, type: 'oil_terminal', country: 'Saudi Arabia', capacity: '6.5M bbl/day', risk: 'high', nearConflict: 'Iran' },
  { name: 'Kharg Island Terminal', lat: 29.23, lng: 50.33, type: 'oil_terminal', country: 'Iran', capacity: '5M bbl/day', risk: 'medium' },
  { name: 'Basra Oil Terminal', lat: 29.68, lng: 48.80, type: 'oil_terminal', country: 'Iraq', capacity: '3.4M bbl/day', risk: 'medium' },
  { name: 'Nord Stream Sabotage Site', lat: 55.53, lng: 15.74, type: 'pipeline_hub', country: 'Baltic Sea', capacity: '55 bcm/yr (destroyed)', risk: 'critical', nearConflict: 'Russia-Ukraine' },
  { name: 'Druzhba Pipeline Hub', lat: 52.43, lng: 31.98, type: 'pipeline_hub', country: 'Belarus', capacity: '1.2M bbl/day', risk: 'high', nearConflict: 'Russia-Ukraine' },
  { name: 'Ceyhan Terminal', lat: 36.88, lng: 35.95, type: 'oil_terminal', country: 'Turkey', capacity: '1.6M bbl/day', risk: 'medium', nearConflict: 'Syria/Iraq' },
  { name: 'Leviathan Gas Field', lat: 32.61, lng: 34.12, type: 'gas_field', country: 'Israel', capacity: '22 bcm/yr', risk: 'high', nearConflict: 'Israel-Gaza/Lebanon' },
  { name: 'South Pars Gas Field', lat: 26.70, lng: 52.10, type: 'gas_field', country: 'Iran/Qatar', capacity: 'Largest in world', risk: 'medium' },
];
