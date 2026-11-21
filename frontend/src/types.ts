// Spiegelt die Backend-Antwort (backend/src/types.ts).
export type LatLng = [number, number];

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

export interface Vehicle {
  id: string;
  label: string;
  lat: number;
  lon: number;
  bearing: number | null;
  kind: "bus" | "train" | "tram" | "other";
}

export interface StatusResponse {
  route: { id: string; originLabel: string; destinationLabel: string; geometry: LatLng[] };
  travel: {
    currentSeconds: number | null;
    freeflowSeconds: number | null;
    delaySeconds: number | null;
    distanceMeters: number | null;
    source: string;
  };
  segments: Segment[];
  incidents: Incident[];
  sources: { name: string; status: "live" | "mock" | "error"; message?: string }[];
  updatedAt: string;
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
  forDeparture: HourPrediction | null;
  bestDeparture: HourPrediction | null;
  weekly: (number | null)[][];
}

export interface VehiclesResponse {
  info: { name: string; status: "live" | "mock" | "error"; message?: string };
  vehicles: Vehicle[];
}
