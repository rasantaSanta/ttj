import { COLLECT_INTERVAL_MIN } from "./config.js";
import { listRoutes, appendSample } from "./store.js";
import { fetchTomTom } from "./sources/tomtom.js";
import type { Sample } from "./types.js";

/** Misst fuer jede Route einmal die aktuelle Fahrzeit und speichert sie. */
export async function collectOnce() {
  for (const route of listRoutes()) {
    try {
      const t = await fetchTomTom(route.origin, route.destination);
      if (t.info.status !== "live" || t.travel.currentSeconds == null) continue;
      const now = new Date();
      const sample: Sample = {
        routeId: route.id,
        ts: now.toISOString(),
        dow: now.getDay(),
        hour: now.getHours(),
        travelSeconds: t.travel.currentSeconds,
        freeflowSeconds: t.travel.freeflowSeconds,
        delaySeconds: t.travel.delaySeconds,
      };
      appendSample(sample);
    } catch (err) {
      console.error(`[collector] Route ${route.id}:`, err);
    }
  }
}

/** Startet die periodische Messung (sofort + alle COLLECT_INTERVAL_MIN Minuten). */
export function startCollector() {
  const intervalMs = COLLECT_INTERVAL_MIN * 60_000;
  console.log(`Collector aktiv: misst alle ${COLLECT_INTERVAL_MIN} min`);
  collectOnce();
  setInterval(collectOnce, intervalMs);
}
