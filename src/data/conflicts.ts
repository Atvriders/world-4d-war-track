// Static conflict zone data — all major active wars/conflicts as of 2025
// Interfaces defined inline; canonical types live in src/types/

interface ConflictEvent {
  id: string;
  date: string;
  type: 'airstrike' | 'ground-battle' | 'artillery' | 'naval' | 'drone' | 'missile' | 'explosion' | 'other';
  lat: number;
  lng: number;
  description: string;
  fatalities: number;
  source: string;
}

interface ConflictZone {
  id: string;
  name: string;
  countries: string[];
  startDate: string;
  status: 'active' | 'ceasefire' | 'escalating' | 'de-escalating';
  intensity: 'low' | 'medium' | 'high' | 'critical';
  parties: string[];
  casualties: { total?: number; military?: number; civilian?: number; displaced?: number };
  geoJSON: { type: 'Feature'; geometry: { type: string; coordinates: unknown }; properties?: Record<string, unknown> };
  frontlineGeoJSON?: { type: 'Feature'; geometry: { type: string; coordinates: unknown }; properties?: Record<string, unknown> };
  events: ConflictEvent[];
  description: string;
  color: string;
}

export const CONFLICT_ZONES: ConflictZone[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Russia-Ukraine War (2022-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'russia-ukraine-2022',
    name: 'Russia–Ukraine War',
    countries: ['UA', 'RU'],
    startDate: '2022-02-24',
    status: 'active',
    intensity: 'critical',
    parties: ['Russian Armed Forces', 'Ukrainian Armed Forces', 'Wagner Group / Russian proxy forces'],
    casualties: {
      total: 700000,
      military: 600000,
      civilian: 12000,
      displaced: 10000000,
    },
    color: '#CC0000',
    description:
      'Russia launched a full-scale invasion of Ukraine on 24 February 2022, opening fronts from the north, east, and south. After early Ukrainian counteroffensives recaptured Kherson and Kharkiv oblasts, the war settled into attritional trench warfare along a ~1,000 km front line in Donbas, Zaporizhzhia, and Kherson regions. Both sides suffer heavy casualties; Russia has made incremental territorial gains in 2024–2025 while Ukraine continues drone warfare deep into Russian territory.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Eastern and southern Ukraine where active conflict occurs
        coordinates: [
          [
            [33.0, 47.0],
            [40.2, 47.0],
            [40.2, 51.5],
            [33.0, 51.5],
            [33.0, 47.0],
          ],
        ],
      },
      properties: { name: 'Eastern/Southern Ukraine conflict zone' },
    },
    frontlineGeoJSON: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        // Approximate front line from Kharkiv oblast south to Kherson oblast (as of mid-2025)
        coordinates: [
          [36.9, 50.0],
          [37.7, 49.1],
          [37.5, 48.5],
          [37.0, 47.8],
          [36.2, 47.5],
          [35.5, 47.2],
          [34.8, 47.1],
          [34.2, 46.9],
          [33.5, 46.6],
        ],
      },
      properties: { name: 'Active front line (approximate)' },
    },
    events: [
      {
        id: 'ua-001',
        date: '2025-01-14',
        type: 'missile',
        lat: 50.45,
        lng: 30.52,
        description: 'Russian Shahed drone and ballistic missile barrage targets Kyiv energy infrastructure, killing 6 civilians and wounding 19.',
        fatalities: 6,
        source: 'Ukrainian Air Force / Reuters',
      },
      {
        id: 'ua-002',
        date: '2025-02-08',
        type: 'ground-battle',
        lat: 48.12,
        lng: 37.71,
        description: 'Russian forces advance through Toretsk in Donetsk oblast after weeks of urban fighting; Ukrainian forces withdraw to secondary positions.',
        fatalities: 230,
        source: 'Institute for the Study of War (ISW)',
      },
      {
        id: 'ua-003',
        date: '2025-02-22',
        type: 'drone',
        lat: 55.75,
        lng: 37.62,
        description: 'Ukrainian long-range drones strike an oil refinery in the Moscow suburbs, triggering large fires visible from the city center.',
        fatalities: 3,
        source: 'Kyiv Independent / BAZA Telegram',
      },
      {
        id: 'ua-004',
        date: '2025-03-05',
        type: 'artillery',
        lat: 47.85,
        lng: 35.1,
        description: 'Artillery exchange along the Zaporizhzhia line; Russian glide-bomb strikes level residential blocks in Zaporizhzhia city.',
        fatalities: 14,
        source: 'OCHA Ukraine Situation Report',
      },
      {
        id: 'ua-005',
        date: '2025-03-15',
        type: 'airstrike',
        lat: 49.98,
        lng: 36.23,
        description: 'Russian Su-34s drop FAB-3000 glide bombs on logistics depot in Kharkiv region, destroying armored vehicle stockpile.',
        fatalities: 8,
        source: 'UK MoD Intelligence Update',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Israel-Gaza War (2023-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'israel-gaza-2023',
    name: 'Israel–Gaza War',
    countries: ['IL', 'PS'],
    startDate: '2023-10-07',
    status: 'active',
    intensity: 'critical',
    parties: ['Israel Defense Forces (IDF)', 'Hamas', 'Palestinian Islamic Jihad (PIJ)', 'Other armed factions'],
    casualties: {
      total: 58000,
      military: 1500,
      civilian: 56500,
      displaced: 1900000,
    },
    color: '#FF0000',
    description:
      'On 7 October 2023 Hamas launched a mass-casualty attack into southern Israel killing ~1,200 people and taking ~250 hostages, triggering an Israeli military campaign in Gaza. Israel conducted intensive air and ground operations across the Gaza Strip through 2024, resulting in massive civilian casualties and near-total destruction of northern Gaza. A series of ceasefire agreements in early 2025 provided brief pauses but fighting resumed; humanitarian conditions remain catastrophic.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Gaza Strip: roughly 34.2–34.6 lng, 31.2–31.6 lat
        coordinates: [
          [
            [34.2, 31.2],
            [34.6, 31.2],
            [34.6, 31.6],
            [34.2, 31.6],
            [34.2, 31.2],
          ],
        ],
      },
      properties: { name: 'Gaza Strip' },
    },
    frontlineGeoJSON: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        // Netzarim corridor separating northern/southern Gaza (approximate)
        coordinates: [
          [34.25, 31.46],
          [34.35, 31.44],
          [34.45, 31.43],
          [34.52, 31.42],
        ],
      },
      properties: { name: 'Netzarim corridor (approximate IDF control line)' },
    },
    events: [
      {
        id: 'gz-001',
        date: '2025-01-19',
        type: 'other',
        lat: 31.5,
        lng: 34.46,
        description: 'Phase 1 ceasefire agreement takes effect; hostage-prisoner exchange begins, first aid convoys enter northern Gaza.',
        fatalities: 0,
        source: 'Al Jazeera / IDF Spokesperson',
      },
      {
        id: 'gz-002',
        date: '2025-02-18',
        type: 'airstrike',
        lat: 31.35,
        lng: 34.31,
        description: 'IDF airstrikes in Khan Younis kill 34 people sheltering in a UNRWA school following intelligence on Hamas command node.',
        fatalities: 34,
        source: 'Gaza Health Ministry / OCHA',
      },
      {
        id: 'gz-003',
        date: '2025-03-01',
        type: 'ground-battle',
        lat: 31.5,
        lng: 34.44,
        description: 'Israeli ground forces re-enter northern Gaza city of Beit Lahiya following ceasefire collapse; intense urban combat reported.',
        fatalities: 61,
        source: 'Haaretz / Reuters',
      },
      {
        id: 'gz-004',
        date: '2025-03-08',
        type: 'missile',
        lat: 31.48,
        lng: 34.45,
        description: 'Hamas fires barrage of rockets toward Tel Aviv and Ashdod; Iron Dome intercepts majority, 2 civilians wounded.',
        fatalities: 0,
        source: 'IDF / Times of Israel',
      },
      {
        id: 'gz-005',
        date: '2025-03-14',
        type: 'airstrike',
        lat: 31.29,
        lng: 34.27,
        description: 'Israeli airstrike on Rafah humanitarian zone kills 21 and wounds 47; Israel says it targeted PIJ weapons depot.',
        fatalities: 21,
        source: 'MSF / Gaza Health Ministry',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Sudan Civil War (2023-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'sudan-civil-war-2023',
    name: 'Sudan Civil War',
    countries: ['SD'],
    startDate: '2023-04-15',
    status: 'active',
    intensity: 'high',
    parties: ['Sudanese Armed Forces (SAF)', 'Rapid Support Forces (RSF)'],
    casualties: {
      total: 150000,
      military: 30000,
      civilian: 120000,
      displaced: 11000000,
    },
    color: '#FF6600',
    description:
      'Conflict erupted on 15 April 2023 between Sudan\'s national army (SAF) and the paramilitary Rapid Support Forces (RSF), led by General Mohamed Hamdan Dagalo "Hemeti." Fighting spread from Khartoum across Darfur and Kordofan, causing the world\'s largest internal displacement crisis. The RSF has been accused of ethnic massacres and systematic sexual violence in Darfur, drawing comparisons to the 2003–2005 genocide. No durable ceasefire has held as of 2025.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Sudan: 21.8–38.6 lng, 8.7–22.2 lat
        coordinates: [
          [
            [21.8, 8.7],
            [38.6, 8.7],
            [38.6, 22.2],
            [21.8, 22.2],
            [21.8, 8.7],
          ],
        ],
      },
      properties: { name: 'Sudan' },
    },
    events: [
      {
        id: 'sd-001',
        date: '2025-01-10',
        type: 'ground-battle',
        lat: 13.51,
        lng: 25.35,
        description: 'SAF recaptures Wad Madani in Gezira state after RSF had held it since December 2023; heavy casualties on both sides.',
        fatalities: 400,
        source: 'Sudan War Monitor / AFP',
      },
      {
        id: 'sd-002',
        date: '2025-01-28',
        type: 'airstrike',
        lat: 13.18,
        lng: 24.88,
        description: 'SAF airstrikes on RSF positions in North Darfur kill 60 fighters and destroy 12 gun-mounted technicals.',
        fatalities: 60,
        source: 'Radio Dabanga',
      },
      {
        id: 'sd-003',
        date: '2025-02-14',
        type: 'other',
        lat: 15.55,
        lng: 32.53,
        description: 'RSF drones strike SAF command HQ in Omdurman for the second time, disrupting command communications.',
        fatalities: 18,
        source: 'BBC Arabic / Al-Hadath',
      },
      {
        id: 'sd-004',
        date: '2025-03-02',
        type: 'ground-battle',
        lat: 12.06,
        lng: 24.88,
        description: 'Reported RSF massacre of civilians in Zamzam displacement camp near El Fasher; at least 200 killed according to UN investigators.',
        fatalities: 200,
        source: 'UNHCR / UN Panel of Experts',
      },
      {
        id: 'sd-005',
        date: '2025-03-12',
        type: 'artillery',
        lat: 13.62,
        lng: 25.34,
        description: 'Artillery shelling of Sennar city by RSF forces damages hospital and market; 45 civilians killed.',
        fatalities: 45,
        source: 'Doctors Without Borders (MSF)',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Myanmar Civil War (2021-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'myanmar-civil-war-2021',
    name: 'Myanmar Civil War',
    countries: ['MM'],
    startDate: '2021-02-01',
    status: 'active',
    intensity: 'high',
    parties: [
      'Tatmadaw (Myanmar Military / SAC)',
      "People's Defence Force (PDF)",
      'Ethnic Armed Organizations (EAOs): Three Brotherhood Alliance, KIA, KNLA, CNF',
    ],
    casualties: {
      total: 50000,
      military: 25000,
      civilian: 25000,
      displaced: 3000000,
    },
    color: '#FF6600',
    description:
      'Following the February 2021 military coup that ousted the elected government of Aung San Suu Kyi, a nationwide armed resistance emerged. Operation 1027 (launched October 2023) saw the Three Brotherhood Alliance seize dozens of towns across Shan State, fundamentally shifting the battlefield balance. By 2025 the military junta controls only major cities; resistance forces hold vast rural territories and have captured strategic border trade towns.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Myanmar: 92.2–101.2 lng, 9.6–28.5 lat
        coordinates: [
          [
            [92.2, 9.6],
            [101.2, 9.6],
            [101.2, 28.5],
            [92.2, 28.5],
            [92.2, 9.6],
          ],
        ],
      },
      properties: { name: 'Myanmar' },
    },
    events: [
      {
        id: 'mm-001',
        date: '2025-01-07',
        type: 'ground-battle',
        lat: 23.9,
        lng: 98.1,
        description: 'MNDAA forces complete capture of Laukkaing, the capital of Kokang Self-Administered Zone, forcing junta forces to surrender.',
        fatalities: 180,
        source: 'Irrawaddy / ACLED',
      },
      {
        id: 'mm-002',
        date: '2025-01-22',
        type: 'airstrike',
        lat: 21.96,
        lng: 96.09,
        description: 'Military junta airstrikes on Mandalay outskirts target PDF supply routes; 28 civilians killed in two villages.',
        fatalities: 28,
        source: 'Myanmar Now',
      },
      {
        id: 'mm-003',
        date: '2025-02-10',
        type: 'ground-battle',
        lat: 16.87,
        lng: 97.63,
        description: 'Karen National Liberation Army (KNLA) and PDF seize Myawaddy border town on Thai border, capturing major trade crossing.',
        fatalities: 95,
        source: 'Radio Free Asia / DVB',
      },
      {
        id: 'mm-004',
        date: '2025-02-28',
        type: 'airstrike',
        lat: 22.01,
        lng: 93.92,
        description: 'Junta jets bomb Chin National Front positions in Chin State; airstrike on village market kills 19 civilians.',
        fatalities: 19,
        source: 'Chin Human Rights Organization',
      },
      {
        id: 'mm-005',
        date: '2025-03-10',
        type: 'drone',
        lat: 16.78,
        lng: 96.16,
        description: 'PDF drone drops IED on military convoy outside Yangon, killing 8 soldiers — first such attack near the former capital.',
        fatalities: 8,
        source: 'People\'s Defence Force announcement / Frontier Myanmar',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Yemen Civil War / Houthi (2015-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'yemen-civil-war-2015',
    name: 'Yemen Civil War / Houthi Conflict',
    countries: ['YE'],
    startDate: '2015-03-26',
    status: 'active',
    intensity: 'high',
    parties: [
      'Houthi Movement (Ansar Allah)',
      'Republic of Yemen Government (ROYG)',
      'Saudi-led Coalition',
      'UAE-backed Southern Transitional Council (STC)',
      'US / UK (Red Sea strikes)',
    ],
    casualties: {
      total: 377000,
      military: 150000,
      civilian: 227000,
      displaced: 4500000,
    },
    color: '#FF6600',
    description:
      'The Yemen civil war has pitted the Iranian-backed Houthi movement against a Saudi-led coalition supporting the internationally recognized government since 2015. Following the 7 October 2023 Hamas attack, Houthis began attacking commercial shipping in the Red Sea and Bab-el-Mandeb strait in solidarity with Gaza, prompting US and UK airstrikes on Houthi targets across Yemen. Internal fighting between the Houthis and government forces continues in Marib and Taiz while the Red Sea shipping crisis raised the conflict\'s global economic impact.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // Yemen mainland
          [
            [
              [42.5, 11.5],
              [54.5, 11.5],
              [54.5, 18.0],
              [42.5, 18.0],
              [42.5, 11.5],
            ],
          ],
          // Red Sea / Bab-el-Mandeb zone
          [
            [
              [42.0, 11.5],
              [44.0, 11.5],
              [44.0, 15.5],
              [42.0, 15.5],
              [42.0, 11.5],
            ],
          ],
        ],
      },
      properties: { name: 'Yemen + Red Sea operational zone' },
    },
    events: [
      {
        id: 'ye-001',
        date: '2025-01-09',
        type: 'naval',
        lat: 14.5,
        lng: 43.2,
        description: 'Houthi anti-ship ballistic missile strikes Greek-flagged tanker MV Sounion in southern Red Sea; vessel ablaze, crew evacuated.',
        fatalities: 0,
        source: 'UKMTO / Reuters',
      },
      {
        id: 'ye-002',
        date: '2025-01-20',
        type: 'airstrike',
        lat: 15.35,
        lng: 44.21,
        description: 'US CENTCOM airstrikes destroy Houthi radar installations and drone storage facilities near Hodeidah port.',
        fatalities: 12,
        source: 'US CENTCOM Press Release',
      },
      {
        id: 'ye-003',
        date: '2025-02-04',
        type: 'missile',
        lat: 31.8,
        lng: 34.65,
        description: 'Houthi ballistic missile fired at Tel Aviv intercepted by Arrow-3 over the Mediterranean; no casualties.',
        fatalities: 0,
        source: 'IDF Spokesperson / Times of Israel',
      },
      {
        id: 'ye-004',
        date: '2025-02-25',
        type: 'drone',
        lat: 15.55,
        lng: 44.2,
        description: 'Houthi Samad-3 drone swarm targets Sanaa International Airport used by Saudi-led coalition, disrupting operations.',
        fatalities: 4,
        source: 'Yemen Media Union',
      },
      {
        id: 'ye-005',
        date: '2025-03-11',
        type: 'ground-battle',
        lat: 15.47,
        lng: 45.34,
        description: 'Houthi offensive advances in Marib governorate; government forces repel assault with Saudi air support, 120 fighters killed.',
        fatalities: 120,
        source: 'Arab Coalition media / ACLED',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. DRC / M23 Conflict (2022-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'drc-m23-2022',
    name: 'DRC – M23 / Rwanda Conflict',
    countries: ['CD', 'RW'],
    startDate: '2022-11-01',
    status: 'escalating',
    intensity: 'high',
    parties: [
      'M23 rebel movement',
      'Rwanda Defence Force (RDF, alleged)',
      'Armed Forces of the DRC (FARDC)',
      'SADC Mission (SAMIDRC)',
      'FDLR and allied militias',
    ],
    casualties: {
      total: 10000,
      military: 6000,
      civilian: 4000,
      displaced: 7000000,
    },
    color: '#FF6600',
    description:
      'The M23 rebel group, widely accused of being backed by Rwanda, relaunched its offensive in eastern Democratic Republic of Congo in late 2022. By early 2025 M23 forces captured Goma, the largest city in eastern DRC, marking the most significant territorial shift since the 1990s conflicts. SADC peacekeeping forces withdrew and Rwanda denied direct involvement despite mounting UN evidence. The conflict has triggered the world\'s most protracted displacement crisis with over 7 million IDPs.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Eastern DRC (North Kivu, South Kivu, Ituri)
        coordinates: [
          [
            [27.0, -5.0],
            [30.5, -5.0],
            [30.5, 1.5],
            [27.0, 1.5],
            [27.0, -5.0],
          ],
        ],
      },
      properties: { name: 'Eastern DRC conflict zone' },
    },
    events: [
      {
        id: 'drc-001',
        date: '2025-01-27',
        type: 'ground-battle',
        lat: -1.67,
        lng: 29.22,
        description: 'M23 forces capture Goma after FARDC and SADC forces withdraw; estimated 900 fighters and civilians killed in the battle.',
        fatalities: 900,
        source: 'UN OCHA DRC / Reuters',
      },
      {
        id: 'drc-002',
        date: '2025-02-05',
        type: 'ground-battle',
        lat: -2.5,
        lng: 28.87,
        description: 'M23 advances south from Goma toward Bukavu along Lake Kivu shore; FARDC counterattack repelled.',
        fatalities: 250,
        source: 'Radio Okapi / AP',
      },
      {
        id: 'drc-003',
        date: '2025-02-15',
        type: 'airstrike',
        lat: -1.67,
        lng: 29.22,
        description: 'DRC Air Force jet bombs M23 supply convoy on RN2 road north of Goma, killing 30 fighters.',
        fatalities: 30,
        source: 'FARDC Spokesperson',
      },
      {
        id: 'drc-004',
        date: '2025-03-01',
        type: 'other',
        lat: -2.49,
        lng: 28.87,
        description: 'M23 seizes Bukavu, South Kivu provincial capital, completing control of both major eastern DRC cities.',
        fatalities: 600,
        source: 'UN OCHA / Le Monde',
      },
      {
        id: 'drc-005',
        date: '2025-03-16',
        type: 'other',
        lat: -1.67,
        lng: 29.22,
        description: 'Ceasefire talks in Doha between DRC and Rwanda fail after DRC rejects Rwanda\'s demand for FDLR disarmament as precondition.',
        fatalities: 0,
        source: 'Reuters / African Union statement',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Sahel Insurgency (2012-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'sahel-insurgency-2012',
    name: 'Sahel Jihadist Insurgency',
    countries: ['ML', 'BF', 'NE'],
    startDate: '2012-01-16',
    status: 'active',
    intensity: 'medium',
    parties: [
      'Jama\'at Nusrat al-Islam wal-Muslimin (JNIM / GSIM)',
      'Islamic State in the Greater Sahara (ISGS)',
      'Mali Armed Forces (FAMa) + Wagner/Africa Corps',
      'Burkina Faso Armed Forces (FADS)',
      'Niger Armed Forces',
    ],
    casualties: {
      total: 40000,
      military: 12000,
      civilian: 28000,
      displaced: 3600000,
    },
    color: '#FFAA00',
    description:
      'Al-Qaeda-linked JNIM and Islamic State affiliates have conducted a decade-long insurgency across the Sahel, exploiting weak governance and inter-communal tensions in Mali, Burkina Faso, and Niger. Following military coups in all three countries (2021–2023), foreign forces expelled Western troops and invited Russian Wagner/Africa Corps personnel. Despite Wagner support, jihadist territorial control has expanded; JNIM now controls significant territory across central Mali and northern Burkina Faso.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Mali + Burkina Faso + Niger (approximate)
        coordinates: [
          [
            [-5.5, 9.5],
            [15.5, 9.5],
            [15.5, 20.5],
            [-5.5, 20.5],
            [-5.5, 9.5],
          ],
        ],
      },
      properties: { name: 'Sahel conflict zone (Mali / Burkina Faso / Niger)' },
    },
    events: [
      {
        id: 'sahel-001',
        date: '2025-01-11',
        type: 'ground-battle',
        lat: 14.42,
        lng: -1.52,
        description: 'JNIM ambushes FAMa-Wagner convoy on Ouagadougou–Mopti road, killing 35 soldiers; convoy destroyed over 12 km stretch.',
        fatalities: 35,
        source: 'ACLED / Le Monde Afrique',
      },
      {
        id: 'sahel-002',
        date: '2025-01-31',
        type: 'explosion',
        lat: 12.36,
        lng: -1.53,
        description: 'JNIM suicide vehicle bomb at military checkpoint outside Ouagadougou kills 22 soldiers and 5 civilians.',
        fatalities: 27,
        source: 'AFP / Burkina Faso government',
      },
      {
        id: 'sahel-003',
        date: '2025-02-19',
        type: 'other',
        lat: 17.35,
        lng: -1.98,
        description: 'JNIM forces overrun remote garrison in Ménaka region, Mali; 45 soldiers killed, town remains under jihadist control.',
        fatalities: 45,
        source: 'Mali army statement / ACLED',
      },
      {
        id: 'sahel-004',
        date: '2025-03-06',
        type: 'airstrike',
        lat: 14.36,
        lng: -0.36,
        description: 'Burkina Faso Air Force airstrike on JNIM market gathering kills 150 people; junta says all were fighters, survivors dispute claim.',
        fatalities: 150,
        source: 'Human Rights Watch / local NGOs',
      },
      {
        id: 'sahel-005',
        date: '2025-03-18',
        type: 'explosion',
        lat: 13.52,
        lng: 2.12,
        description: 'IED detonates under humanitarian convoy near Tahoua, Niger, killing 8 aid workers and 3 escorts.',
        fatalities: 11,
        source: 'ICRC / UN OCHA',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Somalia / Al-Shabaab (2006-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'somalia-al-shabaab-2006',
    name: 'Somalia – Al-Shabaab Insurgency',
    countries: ['SO'],
    startDate: '2006-06-01',
    status: 'active',
    intensity: 'medium',
    parties: [
      'Al-Shabaab (al-Harakat al-Shabaab al-Mujahideen)',
      'Federal Government of Somalia (FGS)',
      'Somali National Army (SNA)',
      'African Union Transition Mission Somalia (ATMIS)',
      'US Africa Command (AFRICOM)',
    ],
    casualties: {
      total: 500000,
      military: 50000,
      civilian: 450000,
      displaced: 3400000,
    },
    color: '#FFAA00',
    description:
      'Al-Shabaab has waged an insurgency against the Somali federal government and African Union forces since 2006, holding significant rural territory across southern and central Somalia. Despite a 2022 military offensive that recaptured several towns, al-Shabaab retains the ability to conduct mass-casualty bombings in Mogadishu and attacks on military bases. The ATMIS drawdown in 2024 has created security vacuums that al-Shabaab has exploited.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Somalia: 40.9–51.4 lng, -1.7–12.0 lat
        coordinates: [
          [
            [40.9, -1.7],
            [51.4, -1.7],
            [51.4, 12.0],
            [40.9, 12.0],
            [40.9, -1.7],
          ],
        ],
      },
      properties: { name: 'Somalia' },
    },
    events: [
      {
        id: 'so-001',
        date: '2025-01-14',
        type: 'explosion',
        lat: 2.05,
        lng: 45.34,
        description: 'Al-Shabaab truck bomb at SNA training base in Mogadishu kills 38 soldiers; second deadliest attack in Mogadishu since 2022.',
        fatalities: 38,
        source: 'Somali National News Agency / Reuters',
      },
      {
        id: 'so-002',
        date: '2025-02-03',
        type: 'ground-battle',
        lat: 3.12,
        lng: 44.93,
        description: 'SNA offensive with ATMIS support recaptures Bulobarde town in Hiraan; 90 al-Shabaab fighters killed.',
        fatalities: 90,
        source: 'ATMIS Press Release / Garowe Online',
      },
      {
        id: 'so-003',
        date: '2025-02-21',
        type: 'airstrike',
        lat: 3.26,
        lng: 43.62,
        description: 'US AFRICOM drone strike targets al-Shabaab training camp in Lower Shabelle; 20 fighters killed including senior commander.',
        fatalities: 20,
        source: 'US AFRICOM Statement',
      },
      {
        id: 'so-004',
        date: '2025-03-09',
        type: 'explosion',
        lat: 2.04,
        lng: 45.34,
        description: 'Al-Shabaab suicide bomber attacks Somali parliament building in Mogadishu; 15 killed, parliament session interrupted.',
        fatalities: 15,
        source: 'Villa Somalia statement / AP',
      },
      {
        id: 'so-005',
        date: '2025-03-19',
        type: 'ground-battle',
        lat: 1.15,
        lng: 44.32,
        description: 'Al-Shabaab overruns SNA outpost in Middle Jubba after ATMIS withdrawal from the area; 25 soldiers killed.',
        fatalities: 25,
        source: 'ACLED / BBC Monitoring',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Haiti Gang Crisis (2021-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'haiti-gang-crisis-2021',
    name: 'Haiti Gang Crisis',
    countries: ['HT'],
    startDate: '2021-07-07',
    status: 'active',
    intensity: 'medium',
    parties: [
      'Viv Ansanm gang coalition (G9, G-Pèp, other gangs)',
      'Haitian National Police (PNH)',
      'Multinational Security Support Mission (MSS / Kenya-led)',
    ],
    casualties: {
      total: 8000,
      military: 800,
      civilian: 7200,
      displaced: 700000,
    },
    color: '#FFAA00',
    description:
      'Following the assassination of President Jovenel Moïse in July 2021, gang violence escalated dramatically across Haiti. The Viv Ansanm coalition controls an estimated 85% of Port-au-Prince and key national infrastructure including the main seaport and fuel terminals. A Kenya-led multinational security force deployed in 2024 has had limited impact due to resource constraints. Humanitarian access is severely restricted and gang-controlled territories experience near-total impunity.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Haiti: -74.5 to -71.6 lng, 18.0 to 20.1 lat
        coordinates: [
          [
            [-74.5, 18.0],
            [-71.6, 18.0],
            [-71.6, 20.1],
            [-74.5, 20.1],
            [-74.5, 18.0],
          ],
        ],
      },
      properties: { name: 'Haiti' },
    },
    events: [
      {
        id: 'ht-001',
        date: '2025-01-08',
        type: 'ground-battle',
        lat: 18.54,
        lng: -72.34,
        description: 'Viv Ansanm gangs attack PNH station in Pétion-Ville, Port-au-Prince; 14 officers killed, station seized.',
        fatalities: 14,
        source: 'Haitian National Police / Reuters',
      },
      {
        id: 'ht-002',
        date: '2025-01-29',
        type: 'other',
        lat: 18.54,
        lng: -72.33,
        description: 'Gangs force closure of Toussaint Louverture International Airport for 3 days following attack on runway approaches.',
        fatalities: 9,
        source: 'OACI / Miami Herald',
      },
      {
        id: 'ht-003',
        date: '2025-02-16',
        type: 'ground-battle',
        lat: 18.6,
        lng: -72.3,
        description: 'Kenyan MSS forces and PNH joint operation retakes Croix-des-Bouquets gang stronghold; 35 gang members killed, 12 MSS wounded.',
        fatalities: 35,
        source: 'Kenya Defence Forces Statement / AP',
      },
      {
        id: 'ht-004',
        date: '2025-02-28',
        type: 'explosion',
        lat: 18.54,
        lng: -72.35,
        description: 'Gang-planted IED destroys PNH armored vehicle in Martissant neighborhood, killing 6 officers.',
        fatalities: 6,
        source: 'BINUH (UN Haiti Mission)',
      },
      {
        id: 'ht-005',
        date: '2025-03-17',
        type: 'other',
        lat: 19.1,
        lng: -72.68,
        description: 'Gang massacre in Lizon, Artibonite Valley; 70 civilians killed, entire village of 300 families displaced.',
        fatalities: 70,
        source: 'RNDDH (Haitian human rights group) / BBC',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Israel-Lebanon / Hezbollah (2024-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'israel-lebanon-2024',
    name: 'Israel–Lebanon / Hezbollah War',
    countries: ['IL', 'LB'],
    startDate: '2024-09-23',
    status: 'ceasefire',
    intensity: 'high',
    parties: [
      'Israel Defense Forces (IDF)',
      'Hezbollah (Lebanese Islamic Resistance)',
      'Lebanese Armed Forces (LAF, monitoring)',
    ],
    casualties: {
      total: 4500,
      military: 1200,
      civilian: 3300,
      displaced: 1100000,
    },
    color: '#FF6600',
    description:
      'Following a year of low-level exchanges along the Lebanon-Israel border after October 2023, Israel launched a full-scale military campaign against Hezbollah in September 2024, including ground operations in southern Lebanon and the targeted killing of Hezbollah Secretary-General Hassan Nasrallah. A US-brokered ceasefire took effect in November 2024, requiring Hezbollah to withdraw north of the Litani River and the IDF to withdraw from Lebanese soil. Tensions remain high and periodic ceasefire violations are reported in 2025.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Southern Lebanon + northern Israel border zone
        coordinates: [
          [
            [34.8, 32.9],
            [36.6, 32.9],
            [36.6, 34.0],
            [34.8, 34.0],
            [34.8, 32.9],
          ],
        ],
      },
      properties: { name: 'Southern Lebanon / Northern Israel conflict zone' },
    },
    frontlineGeoJSON: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        // Litani River line (approximate ceasefire buffer)
        coordinates: [
          [35.2, 33.35],
          [35.6, 33.38],
          [35.9, 33.4],
          [36.2, 33.42],
        ],
      },
      properties: { name: 'Litani River ceasefire line (UNSCR 1701)' },
    },
    events: [
      {
        id: 'lb-001',
        date: '2024-09-27',
        type: 'airstrike',
        lat: 33.87,
        lng: 35.5,
        description: 'IDF airstrike on Hezbollah headquarters in Beirut\'s Dahieh suburb kills Secretary-General Hassan Nasrallah and multiple commanders.',
        fatalities: 45,
        source: 'IDF / Reuters / Al Jazeera',
      },
      {
        id: 'lb-002',
        date: '2024-10-11',
        type: 'ground-battle',
        lat: 33.26,
        lng: 35.37,
        description: 'IDF ground forces enter southern Lebanon, engaging Hezbollah in the Marjayoun corridor and Bint Jbeil areas.',
        fatalities: 280,
        source: 'IDF Spokesperson / Lebanese Ministry of Health',
      },
      {
        id: 'lb-003',
        date: '2024-11-27',
        type: 'other',
        lat: 33.89,
        lng: 35.5,
        description: 'US-brokered ceasefire between Israel and Lebanon takes effect at 04:00 local time; Hezbollah agrees to withdraw north of Litani River.',
        fatalities: 0,
        source: 'White House / Reuters',
      },
      {
        id: 'lb-004',
        date: '2025-01-26',
        type: 'airstrike',
        lat: 33.28,
        lng: 35.55,
        description: 'IDF airstrikes target alleged Hezbollah weapons depot in Nabatieh district, Lebanese Army protests ceasefire violation.',
        fatalities: 12,
        source: 'UNIFIL / Lebanon Ministry of Defense',
      },
      {
        id: 'lb-005',
        date: '2025-02-18',
        type: 'missile',
        lat: 32.98,
        lng: 35.08,
        description: 'Hezbollah fires anti-tank missiles at IDF position along Blue Line; IDF responds with artillery, 4 soldiers wounded.',
        fatalities: 0,
        source: 'IDF / LBCI News',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Ethiopia Internal Conflicts (2022-present — Amhara focus)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ethiopia-amhara-2022',
    name: 'Ethiopia – Amhara Conflict',
    countries: ['ET'],
    startDate: '2022-08-01',
    status: 'active',
    intensity: 'medium',
    parties: [
      'Ethiopian National Defence Force (ENDF)',
      'Amhara Fano militia',
      'Amhara regional special forces (now dissolved)',
    ],
    casualties: {
      total: 10000,
      military: 4000,
      civilian: 6000,
      displaced: 1500000,
    },
    color: '#FFAA00',
    description:
      'Following the November 2022 Cessation of Hostilities Agreement in Tigray, violence shifted to the Amhara region where the federal government attempted to disband regional special forces. Amhara Fano militias launched an armed resistance beginning August 2023, seizing towns and fighting ENDF in urban areas including Lalibela and Debre Tabor. The conflict continues amid internet blackouts and restricted journalist access, making casualty verification difficult.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Amhara region of Ethiopia: roughly 36.5–40.5 lng, 9.5–14.0 lat
        coordinates: [
          [
            [36.5, 9.5],
            [40.5, 9.5],
            [40.5, 14.0],
            [36.5, 14.0],
            [36.5, 9.5],
          ],
        ],
      },
      properties: { name: 'Amhara Region, Ethiopia' },
    },
    events: [
      {
        id: 'et-001',
        date: '2025-01-05',
        type: 'ground-battle',
        lat: 12.03,
        lng: 37.72,
        description: 'Fano forces briefly capture Debre Tabor town; ENDF retakes it after two days of urban fighting with heavy civilian displacement.',
        fatalities: 130,
        source: 'Ethiopia Insight / ACLED',
      },
      {
        id: 'et-002',
        date: '2025-01-30',
        type: 'airstrike',
        lat: 11.99,
        lng: 39.03,
        description: 'Ethiopian Air Force airstrike on Fano positions outside Dessie kills 40 fighters and 12 civilians in adjacent area.',
        fatalities: 52,
        source: 'Ethiopian Human Rights Commission (EHRC)',
      },
      {
        id: 'et-003',
        date: '2025-02-20',
        type: 'ground-battle',
        lat: 11.99,
        lng: 38.74,
        description: 'Fano forces cut the Addis Ababa–Djibouti trade corridor near Kombolcha for four days, disrupting supply chains.',
        fatalities: 70,
        source: 'BBC Amharic / Reuters',
      },
      {
        id: 'et-004',
        date: '2025-03-04',
        type: 'other',
        lat: 12.03,
        lng: 39.47,
        description: 'ENDF imposes siege on Lalibela, UNESCO World Heritage town; humanitarian aid blocked for three weeks.',
        fatalities: 20,
        source: 'OCHA Ethiopia / Amnesty International',
      },
      {
        id: 'et-005',
        date: '2025-03-15',
        type: 'artillery',
        lat: 13.49,
        lng: 39.47,
        description: 'Artillery exchange between ENDF and Fano in North Gondar Zone; 55 combatants killed over 48-hour battle.',
        fatalities: 55,
        source: 'ACLED / Addis Standard',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 12. Pakistan – TTP Insurgency (2007-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pakistan-ttp-2007',
    name: 'Pakistan – TTP Insurgency',
    countries: ['PK'],
    startDate: '2007-12-14',
    status: 'active',
    intensity: 'medium',
    parties: [
      'Tehrik-i-Taliban Pakistan (TTP)',
      'Pakistan Army',
      'Pakistan Air Force',
      'Frontier Corps',
      'Counter Terrorism Department (CTD)',
    ],
    casualties: {
      total: 80000,
      military: 20000,
      civilian: 60000,
      displaced: 2000000,
    },
    color: '#FFAA00',
    description:
      'The Tehrik-i-Taliban Pakistan (TTP) has waged a decades-long insurgency from Pakistan\'s tribal belt and Khyber Pakhtunkhwa province. After a brief Pakistani-Taliban peace deal collapsed in 2022, TTP attacks surged dramatically. Following the Taliban takeover of Afghanistan in 2021, TTP gained strategic depth across the Durand Line. Pakistan launched Operation Azm-e-Istehkam in 2024 targeting TTP networks across KP and Balochistan, but attacks on military and civilian targets have continued into 2025.',
    geoJSON: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        // Khyber Pakhtunkhwa + tribal areas: 69.0–74.0 lng, 31.0–36.5 lat
        coordinates: [
          [
            [69.0, 31.0],
            [74.0, 31.0],
            [74.0, 36.5],
            [69.0, 36.5],
            [69.0, 31.0],
          ],
        ],
      },
      properties: { name: 'KP / Former FATA (Pakistan)' },
    },
    events: [
      {
        id: 'pk-001',
        date: '2025-01-12',
        type: 'explosion',
        lat: 33.72,
        lng: 73.04,
        description: 'TTP suicide bombing at police checkpoint in Islamabad outskirts kills 17 officers — first major attack in the capital since 2014.',
        fatalities: 17,
        source: 'Pakistan Interior Ministry / Dawn',
      },
      {
        id: 'pk-002',
        date: '2025-01-25',
        type: 'ground-battle',
        lat: 34.01,
        lng: 71.58,
        description: 'Pakistan Army Operation Azm-e-Istehkam raid in Khyber district kills 42 TTP fighters, destroying arms cache.',
        fatalities: 42,
        source: 'ISPR (Pakistan Army media wing)',
      },
      {
        id: 'pk-003',
        date: '2025-02-14',
        type: 'airstrike',
        lat: 33.1,
        lng: 70.2,
        description: 'Pakistan Air Force airstrike on TTP compound in South Waziristan kills 35 fighters including two senior commanders.',
        fatalities: 35,
        source: 'ISPR / The News International',
      },
      {
        id: 'pk-004',
        date: '2025-03-03',
        type: 'explosion',
        lat: 34.01,
        lng: 71.58,
        description: 'TTP IED attacks on Army patrol in Peshawar district kill 9 soldiers; five attacks in 48 hours across KP.',
        fatalities: 9,
        source: 'Dawn / Geo News',
      },
      {
        id: 'pk-005',
        date: '2025-03-19',
        type: 'explosion',
        lat: 31.52,
        lng: 69.17,
        description: 'TTP suicide bomber targets FC base in Zhob, Balochistan, killing 22 soldiers and wounding 31 in the deadliest Balochistan attack of 2025.',
        fatalities: 22,
        source: 'ISPR / Reuters',
      },
    ],
  },
];
