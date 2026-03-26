const countryNameToIso: Record<string, string> = {
  "united states": "US",
  "russia": "RU",
  "china": "CN",
  "united kingdom": "GB",
  "france": "FR",
  "germany": "DE",
  "japan": "JP",
  "india": "IN",
  "israel": "IL",
  "turkey": "TR",
  "iran": "IR",
  "saudi arabia": "SA",
  "south korea": "KR",
  "north korea": "KP",
  "ukraine": "UA",
  "brazil": "BR",
  "canada": "CA",
  "australia": "AU",
  "italy": "IT",
  "spain": "ES",
  "netherlands": "NL",
  "norway": "NO",
  "sweden": "SE",
  "denmark": "DK",
  "finland": "FI",
  "poland": "PL",
  "greece": "GR",
  "egypt": "EG",
  "south africa": "ZA",
  "pakistan": "PK",
  "indonesia": "ID",
  "thailand": "TH",
  "vietnam": "VN",
  "philippines": "PH",
  "singapore": "SG",
  "taiwan": "TW",
  "mexico": "MX",
  "argentina": "AR",
  "colombia": "CO",
  "chile": "CL",
  "peru": "PE",
  "united arab emirates": "AE",
  "qatar": "QA",
  "kuwait": "KW",
  "oman": "OM",
  "bahrain": "BH",
  "iraq": "IQ",
  "syria": "SY",
  "yemen": "YE",
  "libya": "LY",
  "algeria": "DZ",
  "morocco": "MA",
  "tunisia": "TN",
  "nigeria": "NG",
  "kenya": "KE",
  "ethiopia": "ET",
};

export function isoToFlag(iso: string): string {
  const upper = iso.toUpperCase();
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export function countryToFlag(country: string): string {
  if (!country) return "";
  const upper = country.toUpperCase();
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    return isoToFlag(upper);
  }
  const iso = countryNameToIso[country.toLowerCase()];
  if (iso) return isoToFlag(iso);
  return country;
}
