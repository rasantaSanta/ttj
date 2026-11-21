import { TOMTOM_API_KEY } from "../config.js";
import type { Incident, LatLng, Place, Segment, SourceInfo, TravelInfo } from "../types.js";
import { MOCK_GEOMETRY, mockSegments, mockTravel, mockIncidents } from "./mock.js";

export interface TomTomResult {
  info: SourceInfo;
  geometry: LatLng[];
  segments: Segment[];
  travel: TravelInfo;
  incidents: Incident[];
}

// TomTom iconCategory -> lesbarer Typ
const ICON_TYPE: Record<number, string> = {
  0: "UNBEKANNT", 1: "UNFALL", 2: "NEBEL", 3: "GEFAHR", 4: "REGEN",
  5: "GLÄTTE", 6: "STAU", 7: "SPERRE_FAHRSPUR", 8: "STRASSE_GESPERRT",
  9: "BAUSTELLE", 10: "WIND", 11: "ÜBERFLUTUNG", 14: "PANNENFAHRZEUG",
};

function magToSeverity(mag: number): Incident["severity"] {
  if (mag >= 3) return "high";
  if (mag === 2) return "medium";
  if (mag === 1) return "low";
  return "unknown";
}

/** TomTom magnitudeOfDelay (0..4) -> unser Stau-Level (0..3). */
function delayToLevel(mag: number): 0 | 1 | 2 | 3 {
  if (mag >= 3) return 3;
  if (mag === 2) return 2;
  if (mag === 1) return 1;
  return 0;
}

/** TomTom Traffic Incident Details entlang der Strecken-Bounding-Box. */
async function fetchIncidents(origin: Place, dest: Place): Promise<Incident[]> {
  const pad = 0.03;
  const minLon = Math.min(origin.lon, dest.lon) - pad;
  const maxLon = Math.max(origin.lon, dest.lon) + pad;
  const minLat = Math.min(origin.lat, dest.lat) - pad;
  const maxLat = Math.max(origin.lat, dest.lat) + pad;
  const fields =
    "{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description}}}}";
  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}` +
    `&bbox=${minLon},${minLat},${maxLon},${maxLat}` +
    `&fields=${encodeURIComponent(fields)}&language=de-DE&timeValidityFilter=present`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Incidents HTTP ${res.status}`);
  const data: any = await res.json();
  return (data.incidents ?? []).map((inc: any, idx: number) => {
    const p = inc.properties ?? {};
    const coords = inc.geometry?.coordinates;
    const first = Array.isArray(coords?.[0]) ? coords[0] : coords;
    const iconCat = Number(p.iconCategory ?? 0);
    return {
      id: `tomtom-${idx}`,
      source: "TomTom",
      type: ICON_TYPE[iconCat] ?? "MELDUNG",
      description:
        (p.events ?? []).map((e: any) => e.description).filter(Boolean).join("; ") ||
        (ICON_TYPE[iconCat] ?? "Verkehrsstörung"),
      severity: magToSeverity(Number(p.magnitudeOfDelay ?? 0)),
      location: Array.isArray(first) ? [first[1], first[0]] : null,
    } as Incident;
  });
}

export async function fetchTomTom(origin: Place, dest: Place): Promise<TomTomResult> {
  if (!TOMTOM_API_KEY) {
    return {
      info: { name: "TomTom", status: "mock", message: "Kein API-Key gesetzt" },
      geometry: MOCK_GEOMETRY,
      segments: mockSegments(),
      travel: mockTravel(),
      incidents: mockIncidents(),
    };
  }

  const o = `${origin.lat},${origin.lon}`;
  const d = `${dest.lat},${dest.lon}`;
  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/${o}:${d}/json` +
    `?key=${TOMTOM_API_KEY}&traffic=true&sectionType=traffic` +
    `&travelMode=car&computeTravelTimeFor=all`;

  try {
    // Route und Incidents parallel; Incident-Fehler soll die Route nicht kippen.
    const [routeRes, incRes] = await Promise.allSettled([
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetchIncidents(origin, dest),
    ]);
    if (routeRes.status === "rejected") throw routeRes.reason;
    const incidents: Incident[] =
      incRes.status === "fulfilled" ? incRes.value : [];
    const data: any = routeRes.value;
    const route = data.routes?.[0];
    if (!route) throw new Error("Keine Route in Antwort");

    // Alle Punkte aller Legs zu einer Geometrie zusammenfuehren.
    const points: LatLng[] = [];
    for (const leg of route.legs ?? []) {
      for (const p of leg.points ?? []) points.push([p.latitude, p.longitude]);
    }

    // Verkehrs-Abschnitte auf die Geometrie mappen.
    const segments: Segment[] = (route.sections ?? [])
      .filter((s: any) => s.sectionType === "TRAFFIC")
      .map((s: any) => ({
        coords: points.slice(s.startPointIndex, s.endPointIndex + 1),
        speedKmh: s.effectiveSpeedInKmh ?? null,
        freeflowKmh: null,
        level: delayToLevel(s.magnitudeOfDelay ?? 0),
        category: s.simpleCategory,
      }))
      .filter((s: Segment) => s.coords.length >= 2);

    const sum = route.summary ?? {};
    const cur = sum.travelTimeInSeconds ?? null;
    const free = sum.noTrafficTravelTimeInSeconds ?? null;
    const delay =
      cur != null && free != null
        ? Math.max(0, cur - free)
        : sum.trafficDelayInSeconds ?? null;
    const travel: TravelInfo = {
      currentSeconds: cur,
      freeflowSeconds: free,
      delaySeconds: delay,
      distanceMeters: sum.lengthInMeters ?? null,
      source: "TomTom",
    };

    return {
      info: { name: "TomTom", status: "live" },
      geometry: points.length ? points : MOCK_GEOMETRY,
      segments,
      travel,
      incidents,
    };
  } catch (err: any) {
    return {
      info: { name: "TomTom", status: "error", message: String(err?.message ?? err) },
      geometry: MOCK_GEOMETRY,
      segments: mockSegments(),
      travel: mockTravel(),
      incidents: mockIncidents(),
    };
  }
}
