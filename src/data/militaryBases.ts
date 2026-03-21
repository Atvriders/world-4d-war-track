export interface MilitaryBase {
  name: string;
  lat: number;
  lng: number;
  country: string;
  operator: string;
  type: 'air_base' | 'naval_base' | 'army_base' | 'missile_defense' | 'drone_base' | 'combined';
  branch: string;
}

export const MILITARY_BASES: MilitaryBase[] = [
  // US Bases in Middle East
  { name: 'Al Udeid Air Base', lat: 25.117, lng: 51.315, country: 'Qatar', operator: 'US', type: 'air_base', branch: 'USAF' },
  { name: 'Camp Arifjan', lat: 28.934, lng: 48.078, country: 'Kuwait', operator: 'US', type: 'army_base', branch: 'US Army' },
  { name: 'Naval Support Activity Bahrain', lat: 26.209, lng: 50.604, country: 'Bahrain', operator: 'US', type: 'naval_base', branch: 'US Navy 5th Fleet' },
  { name: 'Incirlik Air Base', lat: 37.002, lng: 35.426, country: 'Turkey', operator: 'US/NATO', type: 'air_base', branch: 'USAF' },
  { name: 'Al Dhafra Air Base', lat: 24.248, lng: 54.548, country: 'UAE', operator: 'US', type: 'air_base', branch: 'USAF' },
  // Russian Bases
  { name: 'Khmeimim Air Base', lat: 35.401, lng: 35.949, country: 'Syria', operator: 'Russia', type: 'air_base', branch: 'VKS' },
  { name: 'Tartus Naval Base', lat: 34.889, lng: 35.864, country: 'Syria', operator: 'Russia', type: 'naval_base', branch: 'VMF' },
  { name: 'Sevastopol Naval Base', lat: 44.616, lng: 33.525, country: 'Crimea', operator: 'Russia', type: 'naval_base', branch: 'Black Sea Fleet' },
  // Chinese
  { name: 'Djibouti Support Base', lat: 11.593, lng: 43.143, country: 'Djibouti', operator: 'China', type: 'naval_base', branch: 'PLAN' },
  { name: 'Fiery Cross Reef', lat: 9.551, lng: 112.889, country: 'Disputed (SCS)', operator: 'China', type: 'combined', branch: 'PLA' },
  // Others
  { name: 'Camp Lemonnier', lat: 11.547, lng: 43.159, country: 'Djibouti', operator: 'US', type: 'combined', branch: 'AFRICOM' },
  { name: 'Diego Garcia', lat: -7.313, lng: 72.411, country: 'BIOT', operator: 'US/UK', type: 'combined', branch: 'USN/RAF' },
  { name: 'Ramstein Air Base', lat: 49.437, lng: 7.600, country: 'Germany', operator: 'US/NATO', type: 'air_base', branch: 'USAFE' },
  { name: 'RAF Akrotiri', lat: 34.590, lng: 32.988, country: 'Cyprus', operator: 'UK', type: 'air_base', branch: 'RAF' },
  { name: 'Yokosuka Naval Base', lat: 35.284, lng: 139.672, country: 'Japan', operator: 'US', type: 'naval_base', branch: 'US 7th Fleet' },
];
