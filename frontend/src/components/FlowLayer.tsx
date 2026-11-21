import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker } from "react-leaflet";
import type { LatLng, Segment } from "../types";
import { buildRouteGeometry, locateOnRoute, speedColor } from "../util";

const CAR_COUNT = 26;
// Zeitraffer: reale km/h waeren auf 40 km kaum sichtbar -> beschleunigt.
const TIME_SCALE = 45;
const TICK_MS = 120;

interface Car {
  dist: number;
}

/**
 * Animierte "Fluss-Punkte": bewegen sich entlang der Route mit dem ECHTEN
 * aktuellen Tempo je Abschnitt. In Staubereichen werden sie langsamer und
 * ruecken dichter zusammen. Keine echten Einzelfahrzeuge – Fluss-Visualisierung.
 */
export default function FlowLayer({
  geometry,
  segments,
  avgSpeedKmh,
}: {
  geometry: LatLng[];
  segments: Segment[];
  avgSpeedKmh: number;
}) {
  const geo = useMemo(
    () => buildRouteGeometry(geometry, segments, avgSpeedKmh),
    [geometry, segments, avgSpeedKmh]
  );

  const carsRef = useRef<Car[]>([]);
  const [, force] = useState(0);

  // Autos gleichmaessig ueber die Route verteilen (einmalig bei Routenwechsel).
  useEffect(() => {
    carsRef.current = Array.from({ length: CAR_COUNT }, (_, i) => ({
      dist: (geo.total * i) / CAR_COUNT,
    }));
  }, [geo.total]);

  useEffect(() => {
    if (geo.total <= 0) return;
    const id = setInterval(() => {
      const dt = (TICK_MS / 1000) * TIME_SCALE;
      for (const car of carsRef.current) {
        const { speedKmh } = locateOnRoute(geo, car.dist);
        const mps = (speedKmh * 1000) / 3600;
        car.dist = (car.dist + mps * dt) % geo.total;
      }
      force((n) => n + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [geo]);

  if (geo.total <= 0) return null;

  return (
    <>
      {carsRef.current.map((car, i) => {
        const { pos, speedKmh } = locateOnRoute(geo, car.dist);
        return (
          <CircleMarker
            key={i}
            center={pos}
            radius={4}
            pathOptions={{
              color: "#0f172a",
              weight: 1,
              fillColor: speedColor(speedKmh),
              fillOpacity: 0.95,
            }}
          />
        );
      })}
    </>
  );
}
