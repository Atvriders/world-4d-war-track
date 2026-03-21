export interface SeaCable {
  name: string;
  path: [number, number][]; // [lat, lng] waypoints
  capacity: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  nearConflict?: string;
}

export const SEA_CABLES: SeaCable[] = [
  { name: 'AAE-1 (Asia-Africa-Europe)', path: [[1.3,103.8],[8.5,76.9],[12.6,43.1],[30.0,32.5],[36.8,10.2],[43.3,-8.5]], capacity: '20 Tbps', risk: 'critical', nearConflict: 'Yemen/Houthi' },
  { name: 'EIG (Europe India Gateway)', path: [[51.4,-1.0],[36.2,-5.4],[31.2,32.3],[12.8,45.0],[23.0,57.0],[19.0,72.8]], capacity: '3.84 Tbps', risk: 'high', nearConflict: 'Red Sea' },
  { name: 'FLAG/FALCON Europe-Asia', path: [[51.1,1.3],[36.7,-5.3],[31.3,32.3],[12.5,43.5],[25.0,56.5],[19.0,72.8]], capacity: '10 Tbps', risk: 'high', nearConflict: 'Red Sea/Suez' },
  { name: 'Black Sea Regional Cable System', path: [[41.0,28.9],[43.4,34.0],[44.6,37.8],[42.5,41.7]], capacity: '3.2 Tbps', risk: 'critical', nearConflict: 'Russia-Ukraine' },
  { name: 'South China Sea cables', path: [[22.3,114.2],[14.6,109.2],[10.8,108.9],[1.3,103.8]], capacity: 'Various', risk: 'high', nearConflict: 'South China Sea' },
];
