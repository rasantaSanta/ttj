import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { GTFS_RT_URL, GTFS_RT_HEADER } from "../config.js";
import type { Place, SourceInfo, Vehicle } from "../types.js";

export interface VehiclesResult {
  info: SourceInfo;
  vehicles: Vehicle[];
}

// GTFS route_type -> unsere Kategorie
function kindFromRouteType(rt: number | null | undefined): Vehicle["kind"] {
  if (rt == null) return "other";
  if (rt === 0 || rt === 5) return "tram";
  if (rt === 1) return "other"; // U-Bahn
  if (rt === 2 || (rt >= 100 && rt < 200)) return "train";
  if (rt === 3 || (rt >= 700 && rt < 800)) return "bus";
  return "other";
}

/** Echte OeV-Fahrzeuge aus einem GTFS-Realtime VehiclePositions-Feed. */
export async function fetchVehicles(origin: Place, dest: Place): Promise<VehiclesResult> {
  if (!GTFS_RT_URL) {
    return {
      info: {
        name: "GTFS-RT",
        status: "mock",
        message: "Kein Feed-URL gesetzt (GTFS_RT_URL in .env)",
      },
      vehicles: [],
    };
  }

  const pad = 0.05;
  const minLon = Math.min(origin.lon, dest.lon) - pad;
  const maxLon = Math.max(origin.lon, dest.lon) + pad;
  const minLat = Math.min(origin.lat, dest.lat) - pad;
  const maxLat = Math.max(origin.lat, dest.lat) + pad;

  try {
    const headers: Record<string, string> = {};
    if (GTFS_RT_HEADER) {
      const idx = GTFS_RT_HEADER.indexOf(":");
      if (idx > 0) headers[GTFS_RT_HEADER.slice(0, idx).trim()] = GTFS_RT_HEADER.slice(idx + 1).trim();
    }
    const res = await fetch(GTFS_RT_URL, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);

    const vehicles: Vehicle[] = [];
    for (const ent of feed.entity) {
      const v = ent.vehicle;
      const pos = v?.position;
      if (!pos || pos.latitude == null || pos.longitude == null) continue;
      const lat = pos.latitude;
      const lon = pos.longitude;
      // Nur Fahrzeuge im Streckenkorridor.
      if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) continue;
      vehicles.push({
        id: String(v?.vehicle?.id ?? ent.id),
        label: String(v?.vehicle?.label ?? v?.trip?.routeId ?? ent.id),
        lat,
        lon,
        bearing: pos.bearing ?? null,
        kind: kindFromRouteType(null),
      });
    }

    return { info: { name: "GTFS-RT", status: "live" }, vehicles };
  } catch (err: any) {
    return {
      info: { name: "GTFS-RT", status: "error", message: String(err?.message ?? err) },
      vehicles: [],
    };
  }
}
