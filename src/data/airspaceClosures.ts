export interface AirspaceClosure {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // km
  floorFt: number;
  ceilingFt: number;
  reason: string;
  issuedBy: string;
  active: boolean;
}

export const AIRSPACE_CLOSURES: AirspaceClosure[] = [
  { id: 'UKBW', name: 'Eastern Ukraine FIR', lat: 48.5, lng: 37.5, radius: 350, floorFt: 0, ceilingFt: 99000, reason: 'Active conflict zone', issuedBy: 'Ukraine ATC', active: true },
  { id: 'OIIX', name: 'Western Iran FIR (partial)', lat: 33.0, lng: 48.0, radius: 200, floorFt: 0, ceilingFt: 60000, reason: 'Military operations', issuedBy: 'Iran CAA', active: true },
  { id: 'OSTT', name: 'Syria FIR', lat: 35.0, lng: 38.0, radius: 300, floorFt: 0, ceilingFt: 99000, reason: 'Active conflict', issuedBy: 'Syria CAA', active: true },
  { id: 'OYSN', name: 'Yemen FIR', lat: 15.0, lng: 44.0, radius: 250, floorFt: 0, ceilingFt: 99000, reason: 'Houthi missile threat', issuedBy: 'Yemen CAA (Houthi-controlled)', active: true },
  { id: 'HSSN', name: 'Sudan FIR', lat: 15.6, lng: 32.5, radius: 400, floorFt: 0, ceilingFt: 99000, reason: 'Civil war', issuedBy: 'Sudan CAA', active: true },
  { id: 'LLLL', name: 'Northern Israel restricted', lat: 33.2, lng: 35.5, radius: 100, floorFt: 0, ceilingFt: 50000, reason: 'Hezbollah conflict', issuedBy: 'Israel CAA', active: true },
  { id: 'VYYY', name: 'Myanmar airspace (partial)', lat: 20.0, lng: 96.0, radius: 300, floorFt: 0, ceilingFt: 30000, reason: 'Military operations', issuedBy: 'Myanmar DCA', active: true },
];
