import type { LatLng, Segment } from "./types";

// Farbskala fuer Stau-Level 0..3
export const LEVEL_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"];
export const LEVEL_LABELS = ["frei", "zähfließend", "stockend", "Stau"];

export function levelColor(level: Segment["level"]): string {
  return LEVEL_COLORS[level] ?? LEVEL_COLORS[0];
}

export function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "–";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function fmtDistance(meters: number | null): string {
  if (meters == null) return "–";
  return `${(meters / 1000).toFixed(1)} km`;
}

// --- Geo-Helfer fuer die Fluss-Animation -----------------------------------

const R = 6371000; // Erdradius in Metern

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RouteGeometry {
  points: LatLng[];
  cumDist: number[]; // kumulierte Meter je Punkt
  total: number; // Gesamtlaenge in Metern
  speedKmh: number[]; // Tempo-Profil je Punkt
}

/**
 * Baut aus Geometrie + Verkehrs-Segmenten ein Tempo-Profil je Streckenpunkt.
 * Standard = Durchschnittstempo der Route; in Segment-Bereichen das echte
 * TomTom-Tempo (dort werden die Fluss-Punkte langsamer und dichter).
 */
export function buildRouteGeometry(
  points: LatLng[],
  segments: Segment[],
  avgSpeedKmh: number
): RouteGeometry {
  const cumDist = [0];
  for (let i = 1; i < points.length; i++) {
    cumDist[i] = cumDist[i - 1] + haversine(points[i - 1], points[i]);
  }
  const total = cumDist[points.length - 1] ?? 0;
  const speedKmh = points.map(() => avgSpeedKmh || 60);

  // naechsten Punktindex zu einer Koordinate finden
  const nearest = (c: LatLng) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = haversine(points[i], c);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  for (const seg of segments) {
    if (seg.speedKmh == null || seg.coords.length < 2) continue;
    const a = nearest(seg.coords[0]);
    const b = nearest(seg.coords[seg.coords.length - 1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) speedKmh[i] = seg.speedKmh;
  }
  return { points, cumDist, total, speedKmh };
}

/** Position (lat/lon) + lokales Tempo an einer Distanz entlang der Route. */
export function locateOnRoute(
  geo: RouteGeometry,
  dist: number
): { pos: LatLng; speedKmh: number } {
  const { points, cumDist, speedKmh } = geo;
  if (points.length < 2) return { pos: points[0] ?? [0, 0], speedKmh: 60 };
  const d = ((dist % geo.total) + geo.total) % geo.total;
  // Segment finden (lineare Suche reicht bei wenigen hundert Punkten)
  let i = 1;
  while (i < cumDist.length && cumDist[i] < d) i++;
  const i0 = i - 1;
  const i1 = Math.min(i, points.length - 1);
  const span = cumDist[i1] - cumDist[i0] || 1;
  const t = (d - cumDist[i0]) / span;
  const pos: LatLng = [
    points[i0][0] + t * (points[i1][0] - points[i0][0]),
    points[i0][1] + t * (points[i1][1] - points[i0][1]),
  ];
  return { pos, speedKmh: speedKmh[i0] };
}

export function speedColor(kmh: number): string {
  if (kmh < 20) return LEVEL_COLORS[3];
  if (kmh < 50) return LEVEL_COLORS[2];
  if (kmh < 80) return LEVEL_COLORS[1];
  return LEVEL_COLORS[0];
}

export function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("de-AT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
