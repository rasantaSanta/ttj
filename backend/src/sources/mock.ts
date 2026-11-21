import type { LatLng, Segment, Incident, TravelInfo } from "../types.js";

// Vereinfachter Streckenverlauf Linz Hbf -> Steyr (Naeherung, fuer
// den Fall dass keine Live-Geometrie von TomTom vorliegt).
export const MOCK_GEOMETRY: LatLng[] = [
  [48.2903, 14.2913],
  [48.2780, 14.3080],
  [48.2600, 14.3230],
  [48.2250, 14.3350],
  [48.1850, 14.3550],
  [48.1450, 14.3780],
  [48.1050, 14.3980],
  [48.0700, 14.4120],
  [48.0402, 14.4199],
];

export function mockTravel(): TravelInfo {
  return {
    currentSeconds: 2280, // ~38 min mit etwas Verkehr
    freeflowSeconds: 2040, // ~34 min frei
    delaySeconds: 240,
    distanceMeters: 39000,
    source: "mock",
  };
}

export function mockSegments(): Segment[] {
  const g = MOCK_GEOMETRY;
  return [
    { coords: [g[0], g[1], g[2]], speedKmh: 45, freeflowKmh: 60, level: 2, category: "JAM" },
    { coords: [g[2], g[3], g[4]], speedKmh: 95, freeflowKmh: 100, level: 0 },
    { coords: [g[4], g[5]], speedKmh: 70, freeflowKmh: 100, level: 1 },
    { coords: [g[5], g[6], g[7]], speedKmh: 95, freeflowKmh: 100, level: 0 },
  ];
}

export function mockIncidents(): Incident[] {
  return [
    {
      id: "mock-1",
      source: "mock",
      type: "ROAD_WORK",
      description: "Baustelle A1 – Fahrbahnverengung (Beispiel-Mockdaten)",
      severity: "medium",
      location: [48.19, 14.35],
    },
    {
      id: "mock-2",
      source: "mock",
      type: "JAM",
      description: "Stockender Verkehr Höhe Ansfelden (Beispiel-Mockdaten)",
      severity: "low",
      location: [48.26, 14.323],
    },
  ];
}
