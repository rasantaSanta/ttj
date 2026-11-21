import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { fetchVehicles } from "../api";
import type { Vehicle } from "../types";

const EMOJI: Record<Vehicle["kind"], string> = {
  bus: "🚌",
  train: "🚆",
  tram: "🚊",
  other: "🚐",
};

function icon(kind: Vehicle["kind"]) {
  return L.divIcon({
    html: `<div style="font-size:18px;line-height:18px">${EMOJI[kind]}</div>`,
    className: "veh-icon",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const REFRESH_MS = 15_000;

/** Zeigt echte OeV-Fahrzeuge aus dem GTFS-Realtime-Feed (falls konfiguriert). */
export default function VehiclesLayer({ routeId }: { routeId: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetchVehicles(routeId);
        if (active) setVehicles(r.vehicles);
      } catch {
        if (active) setVehicles([]);
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [routeId]);

  return (
    <>
      {vehicles.map((v) => (
        <Marker key={v.id} position={[v.lat, v.lon]} icon={icon(v.kind)}>
          <Popup>{v.label}</Popup>
        </Marker>
      ))}
    </>
  );
}
