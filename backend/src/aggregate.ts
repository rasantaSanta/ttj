import type { Route, StatusResponse } from "./types.js";
import { fetchTomTom } from "./sources/tomtom.js";
import { fetchAsfinag } from "./sources/asfinag.js";

/** Holt alle Quellen fuer eine Route und fuehrt sie zu einer Antwort zusammen. */
export async function buildStatus(route: Route): Promise<StatusResponse> {
  const [tomtom, asfinag] = await Promise.all([
    fetchTomTom(route.origin, route.destination),
    fetchAsfinag(),
  ]);

  return {
    route: {
      id: route.id,
      originLabel: route.origin.label,
      destinationLabel: route.destination.label,
      geometry: tomtom.geometry,
    },
    travel: tomtom.travel,
    segments: tomtom.segments,
    incidents: [...tomtom.incidents, ...asfinag.incidents],
    sources: [tomtom.info, asfinag.info],
    updatedAt: new Date().toISOString(),
  };
}
