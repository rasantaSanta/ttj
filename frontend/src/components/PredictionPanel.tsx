import { useEffect, useMemo, useState } from "react";
import type { PredictionResponse } from "../types";
import { fetchPredict } from "../api";
import { fmtDuration } from "../util";

const DOW = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default function PredictionPanel({ routeId }: { routeId: string }) {
  const now = new Date();
  const [dow, setDow] = useState(now.getDay());
  const [hour, setHour] = useState(now.getHours());
  const [pred, setPred] = useState<PredictionResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetchPredict(routeId, dow, hour)
      .then((p) => active && setPred(p))
      .catch(() => active && setPred(null));
    return () => {
      active = false;
    };
  }, [routeId, dow, hour]);

  // Farbskala fuer die Heatmap: relativ zu min/max der vorhandenen Werte.
  const [min, max] = useMemo(() => {
    const vals = (pred?.weekly ?? []).flat().filter((v): v is number => v != null);
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1];
  }, [pred]);

  const heat = (v: number | null): string => {
    if (v == null) return "transparent";
    const t = max > min ? (v - min) / (max - min) : 0;
    const hue = 120 - t * 120; // grün -> rot
    return `hsl(${hue} 70% 45%)`;
  };

  return (
    <section className="prediction">
      <h2>Vorhersage (lernend)</h2>

      <div className="row pick">
        <select value={dow} onChange={(e) => setDow(Number(e.target.value))}>
          {DOW.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
        <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>

      {!pred || pred.sampleCount === 0 ? (
        <p className="muted">
          Noch keine Verlaufsdaten. Die App sammelt ab jetzt laufend Messwerte –
          nach einigen Tagen erscheinen hier belastbare Vorhersagen.
        </p>
      ) : (
        <>
          <div className="pred-cards">
            <div className="kpi">
              <span className="kpi-value">
                {pred.forDeparture ? fmtDuration(pred.forDeparture.medianSeconds) : "–"}
              </span>
              <span className="kpi-label">erwartet ({DOW[dow]} {String(hour).padStart(2, "0")}:00)</span>
            </div>
            <div className="kpi">
              <span className="kpi-value" style={{ color: "#22c55e" }}>
                {pred.bestDeparture
                  ? `${String(pred.bestDeparture.hour).padStart(2, "0")}:00`
                  : "–"}
              </span>
              <span className="kpi-label">
                beste Abfahrt
                {pred.bestDeparture ? ` (${fmtDuration(pred.bestDeparture.medianSeconds)})` : ""}
              </span>
            </div>
          </div>

          <div className="heatmap">
            <div className="heat-row heat-head">
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="heat-hlabel">
                  {h % 6 === 0 ? h : ""}
                </span>
              ))}
            </div>
            {pred.weekly.map((row, d) => (
              <div key={d} className="heat-row">
                <span className="heat-dlabel">{DOW[d]}</span>
                {row.map((v, h) => (
                  <span
                    key={h}
                    className="heat-cell"
                    style={{ background: heat(v) }}
                    title={v != null ? `${DOW[d]} ${h}:00 – ${fmtDuration(v)}` : "keine Daten"}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="muted small">{pred.sampleCount} Messungen gesammelt</p>
        </>
      )}
    </section>
  );
}
