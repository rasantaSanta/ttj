import { TOMTOM_API_KEY } from "./config.js";
import type { Place } from "./types.js";

/**
 * Adress-/Ortssuche via TomTom Fuzzy Search (Fokus Österreich).
 * Liefert mehrere Kandidaten, damit der Nutzer den richtigen waehlen kann –
 * das ist robuster als serverseitiges Raten bei mehrdeutigen Eingaben.
 */
export async function geocodeCandidates(query: string, limit = 6): Promise<Place[]> {
  if (!TOMTOM_API_KEY) throw new Error("Kein TomTom-Key gesetzt (Geocoding nicht möglich)");
  const url =
    `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json` +
    `?key=${TOMTOM_API_KEY}&countrySet=AT&limit=${limit}&language=de-DE`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data: any = await res.json();
  return (data.results ?? [])
    .filter((h: any) => h.position)
    .map((h: any) => {
      const name = h.poi?.name;
      const addr = h.address?.freeformAddress ?? query;
      return {
        label: name ? `${name}, ${addr}` : addr,
        lat: h.position.lat,
        lon: h.position.lon,
      } as Place;
    });
}

/** Bester Einzeltreffer (Fallback, wenn der Nutzer nicht explizit waehlt). */
export async function geocode(query: string): Promise<Place> {
  const [first] = await geocodeCandidates(query, 1);
  if (!first) throw new Error(`Adresse nicht gefunden: "${query}"`);
  return first;
}
