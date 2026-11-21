// Gemeinsame Datentypen fuer die vereinheitlichte Verkehrsantwort.

export type LatLng = [number, number]; // [lat, lon]

export type SourceStatus = "live" | "mock" | "error";

export interface SourceInfo {
  name: string;
  status: SourceStatus;
  message?: string;
}

export interface Place {
  label: string;
  lat: number;
  lon: number;
}

export interface Route {
  id: string;
  name: string;
  origin: Place;
  destination: Place;
  createdAt: string;
}

/** Ein farbcodierter Streckenabschnitt (Stau-Level). */
export interface Segment {
  coords: LatLng[];
  speedKmh: number | null;
  freeflowKmh: number | null;
  level: 0 | 1 | 2 | 3;
  category?: string;
}

export interface Incident {
  id: string;
  source: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "unknown";
  location: LatLng | null;
}

export interface TravelInfo {
  currentSeconds: number | null;
  freeflowSeconds: number | null;
  delaySeconds: number | null;
  distanceMeters: number | null;
  source: string;
}

/** Ein echtes OeV-Fahrzeug aus dem GTFS-Realtime-Feed. */
export interface Vehicle {
  id: string;
  label: string;
  lat: number;
  lon: number;
  bearing: number | null;
  kind: "bus" | "train" | "tram" | "other";
}

export interface StatusResponse {
  route: {
    id: string;
    originLabel: string;
    destinationLabel: string;
    geometry: LatLng[];
  };
  travel: TravelInfo;
  segments: Segment[];
  incidents: Incident[];
  sources: SourceInfo[];
  updatedAt: string;
}

/** Eine historische Fahrzeit-Messung (gesammelt vom Collector). */
export interface Sample {
  routeId: string;
  ts: string; // ISO
  dow: number; // 0=So .. 6=Sa
  hour: number; // 0..23
  travelSeconds: number;
  freeflowSeconds: number | null;
  delaySeconds: number | null;
}

export interface HourPrediction {
  dow: number;
  hour: number;
  medianSeconds: number;
  p90Seconds: number;
  count: number;
}

export interface PredictionResponse {
  routeId: string;
  sampleCount: number;
  /** Vorhersage fuer die gewuenschte Abfahrtszeit (falls Daten vorhanden). */
  forDeparture: HourPrediction | null;
  /** Beste Abfahrtsstunde im gewaehlten Fenster. */
  bestDeparture: HourPrediction | null;
  /** Ganze Wochen-Matrix [dow][hour] fuer die Heatmap (Median-Sekunden oder null). */
  weekly: (number | null)[][];
}
