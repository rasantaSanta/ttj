import type {
  Place,
  PredictionResponse,
  Route,
  StatusResponse,
  VehiclesResponse,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const b = await res.json();
      if (b?.error) msg = b.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchStatus(routeId: string): Promise<StatusResponse> {
  return json(await fetch(`/api/status?routeId=${encodeURIComponent(routeId)}`));
}

export async function fetchRoutes(): Promise<Route[]> {
  return json(await fetch("/api/routes"));
}

export async function geocode(q: string): Promise<Place[]> {
  return json(await fetch(`/api/geocode?q=${encodeURIComponent(q)}`));
}

export async function createRoute(body: {
  name?: string;
  origin: Place;
  destination: Place;
}): Promise<Route> {
  return json(
    await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function deleteRoute(id: string): Promise<void> {
  await fetch(`/api/routes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchPredict(
  routeId: string,
  dow: number,
  hour: number
): Promise<PredictionResponse> {
  return json(
    await fetch(
      `/api/predict?routeId=${encodeURIComponent(routeId)}&dow=${dow}&hour=${hour}`
    )
  );
}

export async function fetchVehicles(routeId: string): Promise<VehiclesResponse> {
  return json(await fetch(`/api/vehicles?routeId=${encodeURIComponent(routeId)}`));
}
