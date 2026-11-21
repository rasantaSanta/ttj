import { useState } from "react";
import type { Place, Route } from "../types";
import { geocode, createRoute, deleteRoute } from "../api";

/** Adress-Eingabe mit Vorschlagsliste und Auswahl. */
function PlaceSearch({
  placeholder,
  value,
  onPick,
}: {
  placeholder: string;
  value: Place | null;
  onPick: (p: Place | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      setResults(await geocode(q));
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="place-chip">
        <span title={value.label}>{value.label}</span>
        <button onClick={() => onPick(null)} title="Ändern">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="place-search">
      <div className="row">
        <input
          value={q}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button onClick={search} disabled={busy}>
          {busy ? "…" : "Suchen"}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="suggestions">
          {results.map((r, i) => (
            <li key={i} onClick={() => { onPick(r); setResults([]); setQ(""); }}>
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RoutePicker({
  routes,
  selectedId,
  onSelect,
  onChanged,
}: {
  routes: Route[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = routes.find((r) => r.id === selectedId);

  const save = async () => {
    if (!origin || !dest) {
      setError("Bitte Start und Ziel auswählen.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const route = await createRoute({ name: name.trim() || undefined, origin, destination: dest });
      setAdding(false);
      setName("");
      setOrigin(null);
      setDest(null);
      onChanged();
      onSelect(route.id);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || routes.length <= 1) return;
    if (!confirm(`Route "${selected.name}" löschen?`)) return;
    await deleteRoute(selected.id);
    const rest = routes.filter((r) => r.id !== selected.id);
    onChanged();
    if (rest[0]) onSelect(rest[0].id);
  };

  return (
    <section className="route-picker">
      <div className="row">
        <select value={selectedId} onChange={(e) => onSelect(e.target.value)}>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          onClick={remove}
          disabled={routes.length <= 1}
          title={routes.length <= 1 ? "Letzte Route kann nicht gelöscht werden" : "Route löschen"}
        >
          🗑
        </button>
      </div>

      {!adding && (
        <button className="link-btn" onClick={() => setAdding(true)}>
          + Neue Strecke anlegen
        </button>
      )}

      {adding && (
        <div className="add-form">
          <label>Start</label>
          <PlaceSearch placeholder="z.B. Hauptplatz 1, Linz" value={origin} onPick={setOrigin} />
          <label>Ziel</label>
          <PlaceSearch placeholder="z.B. Steyr" value={dest} onPick={setDest} />
          <label>Name (optional)</label>
          <input value={name} placeholder="z.B. Weg zur Arbeit" onChange={(e) => setName(e.target.value)} />
          {error && <div className="banner error">{error}</div>}
          <div className="row">
            <button onClick={save} disabled={saving}>
              {saving ? "Speichere…" : "Speichern"}
            </button>
            <button className="ghost" onClick={() => { setAdding(false); setError(null); }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
