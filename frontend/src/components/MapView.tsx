import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { StatusResponse } from "../types";
import { levelColor } from "../util";
import FlowLayer from "./FlowLayer";
import VehiclesLayer from "./VehiclesLayer";

function FitToRoute({ geometry }: { geometry: StatusResponse["route"]["geometry"] }) {
  const map = useMap();
  useEffect(() => {
    if (geometry.length >= 2) {
      map.fitBounds(geometry as [number, number][], { padding: [40, 40] });
    }
  }, [geometry, map]);
  return null;
}

const severityColor: Record<string, string> = {
  high: "#dc2626",
  medium: "#f97316",
  low: "#eab308",
  unknown: "#6b7280",
};

export default function MapView({
  status,
  showFlow,
  showVehicles,
}: {
  status: StatusResponse;
  showFlow: boolean;
  showVehicles: boolean;
}) {
  const { geometry, id } = status.route;
  const center = geometry[Math.floor(geometry.length / 2)] ?? [48.16, 14.37];

  // Durchschnittstempo der Route fuer die Fluss-Animation.
  const dist = status.travel.distanceMeters ?? 0;
  const secs = status.travel.currentSeconds ?? 0;
  const avgSpeedKmh = secs > 0 ? (dist / secs) * 3.6 : 60;

  return (
    <MapContainer center={center} zoom={11} className="map">
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToRoute geometry={geometry} />

      <Polyline positions={geometry} pathOptions={{ color: "#94a3b8", weight: 4, opacity: 0.5 }} />

      {status.segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.coords}
          pathOptions={{ color: levelColor(seg.level), weight: 6 }}
        >
          <Popup>
            {seg.category ?? "Abschnitt"} – {seg.speedKmh ?? "?"} km/h
          </Popup>
        </Polyline>
      ))}

      {showFlow && (
        <FlowLayer geometry={geometry} segments={status.segments} avgSpeedKmh={avgSpeedKmh} />
      )}

      {showVehicles && <VehiclesLayer routeId={id} />}

      {status.incidents
        .filter((inc) => inc.location)
        .map((inc) => (
          <CircleMarker
            key={inc.id}
            center={inc.location as [number, number]}
            radius={8}
            pathOptions={{
              color: severityColor[inc.severity] ?? severityColor.unknown,
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <strong>{inc.type}</strong> ({inc.source})
              <br />
              {inc.description}
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
