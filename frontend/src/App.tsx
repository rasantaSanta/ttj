import { useEffect, useState, useCallback, useRef } from "react";
import type { Route, StatusResponse } from "./types";
import { fetchStatus, fetchRoutes } from "./api";
import MapView from "./components/MapView";
import RoutePicker from "./components/RoutePicker";
import PredictionPanel from "./components/PredictionPanel";
import { fmtDuration, fmtDistance, fmtTime, LEVEL_COLORS, LEVEL_LABELS } from "./util";

const REFRESH_MS = 60_000;

export default function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState<string>("");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFlow, setShowFlow] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const loadRoutes = useCallback(async () => {
    try {
      const rs = await fetchRoutes();
      setRoutes(rs);
      setRouteId((cur) => cur || rs[0]?.id || "");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const load = useCallback(async () => {
    if (!routeId) return false;
    setLoading(true);
    try {
      setStatus(await fetchStatus(routeId));
      setError(null);
      return true;
    } catch (e: any) {
      setError(String(e?.message ?? e));
      return false;
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  // Selbstheilendes Polling (schnell nachfassen bis erster Erfolg, dann 60 s).
  useEffect(() => {
    if (!routeId) return;
    setStatus(null);
    let active = true;
    const tick = async () => {
      const ok = await load();
      if (!active) return;
      timer.current = setTimeout(tick, ok ? REFRESH_MS : 3000);
    };
    tick();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load, routeId]);

  const delay = status?.travel.delaySeconds ?? null;
  const delayMin = delay != null ? Math.round(delay / 60) : null;

  return (
    <div className="app">
      <aside className="sidebar">
        <header>
          <h1>Verkehr live</h1>
        </header>

        <RoutePicker
          routes={routes}
          selectedId={routeId}
          onSelect={setRouteId}
          onChanged={loadRoutes}
        />

        {error && status && <div className="banner error">Aktualisierung fehlgeschlagen: {error}</div>}
        {error && !status && <div className="banner info">Verbinde mit Backend… (versuche erneut)</div>}

        {status && (
          <>
            <p className="route">
              {status.route.originLabel} → {status.route.destinationLabel}
            </p>

            <div className="kpis">
              <div className="kpi">
                <span className="kpi-value">{fmtDuration(status.travel.currentSeconds)}</span>
                <span className="kpi-label">aktuelle Fahrzeit</span>
              </div>
              <div className="kpi">
                <span className="kpi-value" style={{ color: delayMin && delayMin > 3 ? "#ef4444" : "#22c55e" }}>
                  {delayMin != null ? `+${delayMin} min` : "–"}
                </span>
                <span className="kpi-label">Verzögerung</span>
              </div>
              <div className="kpi">
                <span className="kpi-value">{fmtDistance(status.travel.distanceMeters)}</span>
                <span className="kpi-label">Strecke</span>
              </div>
            </div>

            <div className="legend">
              {LEVEL_COLORS.map((c, i) => (
                <span key={i} className="legend-item">
                  <i style={{ background: c }} /> {LEVEL_LABELS[i]}
                </span>
              ))}
            </div>

            <section>
              <h2>Karten-Ebenen</h2>
              <label className="toggle">
                <input type="checkbox" checked={showFlow} onChange={(e) => setShowFlow(e.target.checked)} />
                Fahrender Verkehr (Fluss-Punkte)
              </label>
              <label className="toggle">
                <input type="checkbox" checked={showVehicles} onChange={(e) => setShowVehicles(e.target.checked)} />
                ÖV-Fahrzeuge (Bus/Bahn, echt)
              </label>
            </section>

            <PredictionPanel routeId={status.route.id} />

            <section>
              <h2>Datenquellen</h2>
              <ul className="sources">
                {status.sources.map((s) => (
                  <li key={s.name}>
                    <span className={`dot ${s.status}`} />
                    {s.name}
                    <span className="src-status">{s.status}</span>
                    {s.message && <span className="src-msg">{s.message}</span>}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Meldungen ({status.incidents.length})</h2>
              <ul className="incidents">
                {status.incidents.length === 0 && <li className="muted">Keine Meldungen</li>}
                {status.incidents.slice(0, 40).map((inc) => (
                  <li key={inc.id} className={`sev-${inc.severity}`}>
                    <strong>{inc.type}</strong> <span className="src-tag">{inc.source}</span>
                    <div>{inc.description}</div>
                  </li>
                ))}
              </ul>
            </section>

            <footer>
              Stand: {fmtTime(status.updatedAt)} · alle 60 s
              {loading && " · lädt…"}
              <button onClick={load} disabled={loading}>Jetzt aktualisieren</button>
            </footer>
          </>
        )}

        {!status && !error && <p>Lade Daten…</p>}
      </aside>

      <main className="map-wrap">
        {status ? (
          <MapView status={status} showFlow={showFlow} showVehicles={showVehicles} />
        ) : (
          <div className="map-placeholder" />
        )}
      </main>
    </div>
  );
}
