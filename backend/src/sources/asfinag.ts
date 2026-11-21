import { ASFINAG_FEED_URL } from "../config.js";
import type { Incident, SourceInfo } from "../types.js";
import { mockIncidents } from "./mock.js";

export interface AsfinagResult {
  info: SourceInfo;
  incidents: Incident[];
}

/**
 * ASFINAG Open Data (Verkehrsmeldungen A1/A9 usw.).
 *
 * Hinweis: Das genaue Feed-Schema von ASFINAG variiert (JSON/XML, teils
 * Registrierung noetig). Setze die URL in .env (ASFINAG_FEED_URL). Dieser
 * Parser versucht, ein generisches JSON-Feed robust zu lesen; passe das
 * Feld-Mapping unten an dein konkretes Feed-Format an.
 */
export async function fetchAsfinag(): Promise<AsfinagResult> {
  if (!ASFINAG_FEED_URL) {
    return {
      info: { name: "ASFINAG", status: "mock", message: "Kein Feed-URL gesetzt" },
      incidents: mockIncidents().filter((i) => i.type === "ROAD_WORK"),
    };
  }

  try {
    const res = await fetch(ASFINAG_FEED_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();

    // Feed-Array unter verschiedenen moeglichen Schluesseln suchen.
    const items: any[] =
      data.features ?? data.messages ?? data.items ?? data.data ?? [];

    const incidents: Incident[] = items.map((it: any, idx: number) => {
      const props = it.properties ?? it;
      const geom = it.geometry?.coordinates; // GeoJSON: [lon, lat]
      const lat = geom?.[1] ?? props.lat ?? props.latitude ?? null;
      const lon = geom?.[0] ?? props.lon ?? props.longitude ?? null;
      return {
        id: String(props.id ?? it.id ?? `asfinag-${idx}`),
        source: "ASFINAG",
        type: String(props.category ?? props.type ?? "TRAFFIC").toUpperCase(),
        description:
          props.description ?? props.title ?? props.text ?? "ASFINAG-Meldung",
        severity: "unknown",
        location: lat != null && lon != null ? [Number(lat), Number(lon)] : null,
      };
    });

    return { info: { name: "ASFINAG", status: "live" }, incidents };
  } catch (err: any) {
    return {
      info: {
        name: "ASFINAG",
        status: "error",
        message: String(err?.message ?? err),
      },
      incidents: [],
    };
  }
}
