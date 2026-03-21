export interface CommodityImpact {
  name: string;
  icon: string;
  unit: string;
  globalPrice: string;
  priceChange: string; // e.g. "+12%"
  trend: 'up' | 'down' | 'stable';
  affectedBy: string[]; // conflict names
  details: string;
}

export const COMMODITIES: CommodityImpact[] = [
  { name: 'Crude Oil (Brent)', icon: '\u{1F6E2}', unit: '$/barrel', globalPrice: '$110.50', priceChange: '+34%', trend: 'up', affectedBy: ['Red Sea/Houthi attacks', 'Russia-Ukraine', 'Iran tensions'], details: 'Houthi attacks on Red Sea shipping forced rerouting via Cape of Good Hope, adding 10-14 days transit. Russia sanctions reduced global supply by ~2M bbl/day.' },
  { name: 'Natural Gas (EU TTF)', icon: '\u{1F525}', unit: '\u20AC/MWh', globalPrice: '\u20AC61.90', priceChange: '+118%', trend: 'up', affectedBy: ['Russia-Ukraine (Nord Stream)', 'Red Sea LNG disruption'], details: 'Nord Stream pipeline sabotage eliminated 55 bcm/yr capacity. Red Sea disruption affects Qatar LNG shipments to Europe.' },
  { name: 'Wheat', icon: '\u{1F33E}', unit: '$/bushel', globalPrice: '$6.26', priceChange: '+15%', trend: 'up', affectedBy: ['Russia-Ukraine (Black Sea grain)', 'Sudan (food crisis)'], details: 'Ukraine was world\'s 5th largest wheat exporter. Black Sea grain corridor disrupted. Sudan civil war created famine conditions.' },
  { name: 'Steel (HRC)', icon: '\u{1F529}', unit: '$/ton', globalPrice: '$950', priceChange: '+18%', trend: 'up', affectedBy: ['Russia-Ukraine (Mariupol)', 'Red Sea shipping costs'], details: 'Destruction of Azovstal steel works in Mariupol removed ~6M tons/yr capacity. Shipping cost increases from Red Sea rerouting.' },
  { name: 'Fertilizer (Urea)', icon: '\u{1F9EA}', unit: '$/ton', globalPrice: '$500', priceChange: '+56%', trend: 'up', affectedBy: ['Russia-Ukraine', 'Red Sea disruption'], details: 'Russia and Belarus supplied ~25% of global fertilizer. Sanctions and shipping disruptions caused global food price inflation.' },
  { name: 'Shipping Rates (Container)', icon: '\u{1F4E6}', unit: '$/FEU', globalPrice: '$2,500', priceChange: '-34%', trend: 'down', affectedBy: ['Red Sea/Houthi attacks', 'Suez Canal disruption'], details: 'Container shipping rates dropped from pandemic peak as supply chains normalized and new vessel capacity came online, despite continued Red Sea rerouting.' },
  { name: 'Uranium (U3O8)', icon: '\u2622', unit: '$/lb', globalPrice: '$85', priceChange: '+40%', trend: 'up', affectedBy: ['Russia-Ukraine (Zaporizhzhia)', 'Niger coup (supply)'], details: 'Zaporizhzhia NPP occupation raised nuclear safety fears. Niger coup disrupted uranium supply to France.' },
  { name: 'Gold', icon: '\u{1F947}', unit: '$/oz', globalPrice: '$4,500', priceChange: '+106%', trend: 'up', affectedBy: ['Global instability', 'Central bank buying'], details: 'Safe-haven demand driven by multiple simultaneous conflicts. China and Russia central banks accumulating.' },
  { name: 'Rare Earth Metals', icon: '\u2699', unit: 'index', globalPrice: '142.5', priceChange: '+12%', trend: 'up', affectedBy: ['China-Taiwan tensions', 'DRC cobalt conflict'], details: 'China controls 60% of rare earth mining. Taiwan Strait tensions threaten semiconductor supply chain.' },
  { name: 'Copper', icon: '\u{1F536}', unit: '$/ton', globalPrice: '$13,080', priceChange: '+55%', trend: 'up', affectedBy: ['DRC conflict (M23)', 'Global military buildup'], details: 'DRC produces 70% of global cobalt and significant copper. M23 conflict disrupts mining operations.' },
];

export interface TradeRouteDisruption {
  route: string;
  normalTransit: string;
  currentTransit: string;
  addedCost: string;
  cause: string;
  volumeAffected: string;
}

export const TRADE_DISRUPTIONS: TradeRouteDisruption[] = [
  { route: 'Suez Canal \u2192 Cape of Good Hope', normalTransit: '12 days', currentTransit: '24 days', addedCost: '+$1M/voyage', cause: 'Houthi attacks', volumeAffected: '15% of global trade' },
  { route: 'Black Sea Grain Corridor', normalTransit: '3 days', currentTransit: 'Operating (high risk)', addedCost: '+$50K insurance/voyage', cause: 'Russia-Ukraine war', volumeAffected: '5M tons grain/month' },
  { route: 'Baltic Sea / Nord Stream', normalTransit: 'Pipeline', currentTransit: 'Destroyed', addedCost: '+\u20AC15/MWh', cause: 'Sabotage (2022)', volumeAffected: '55 bcm/yr gas' },
];
