import { readSamples } from "./store.js";
import type { HourPrediction, PredictionResponse, Sample } from "./types.js";

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

/** Fasst Messwerte je (Wochentag, Stunde) zusammen. */
function bucketize(samples: Sample[]): Map<string, HourPrediction> {
  const groups = new Map<string, number[]>();
  for (const s of samples) {
    const key = `${s.dow}-${s.hour}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s.travelSeconds);
  }
  const out = new Map<string, HourPrediction>();
  for (const [key, arr] of groups) {
    arr.sort((a, b) => a - b);
    const [dow, hour] = key.split("-").map(Number);
    out.set(key, {
      dow,
      hour,
      medianSeconds: Math.round(quantile(arr, 0.5)),
      p90Seconds: Math.round(quantile(arr, 0.9)),
      count: arr.length,
    });
  }
  return out;
}

/**
 * Vorhersage fuer eine Route.
 * @param dow gewuenschter Wochentag (0=So..6=Sa)
 * @param hour gewuenschte Abfahrtsstunde (0..23)
 * @param windowHours Fenster fuer die Suche nach der besten Abfahrtszeit
 */
export function predict(
  routeId: string,
  dow: number,
  hour: number,
  windowHours = 3
): PredictionResponse {
  const samples = readSamples(routeId);
  const buckets = bucketize(samples);

  const forDeparture = buckets.get(`${dow}-${hour}`) ?? null;

  // Beste Abfahrtsstunde im Fenster [hour, hour+windowHours] am selben Wochentag.
  let best: HourPrediction | null = null;
  for (let h = hour; h <= hour + windowHours; h++) {
    const cand = buckets.get(`${dow}-${h % 24}`);
    if (cand && (!best || cand.medianSeconds < best.medianSeconds)) best = cand;
  }

  // Wochen-Matrix [dow][hour] fuer die Heatmap.
  const weekly: (number | null)[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => null as number | null)
  );
  for (const b of buckets.values()) weekly[b.dow][b.hour] = b.medianSeconds;

  return {
    routeId,
    sampleCount: samples.length,
    forDeparture,
    bestDeparture: best,
    weekly,
  };
}
