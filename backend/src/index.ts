import express from "express";
import cors from "cors";
import { PORT, CACHE_TTL_SECONDS } from "./config.js";
import { buildStatus } from "./aggregate.js";
import { predict } from "./predict.js";
import { fetchVehicles } from "./sources/gtfs.js";
import { geocode, geocodeCandidates } from "./geocode.js";
import { listRoutes, getRoute, addRoute, deleteRoute } from "./store.js";
import { startCollector } from "./collector.js";
import type { Place, Route, StatusResponse } from "./types.js";

function isPlace(p: any): p is Place {
  return p && typeof p.lat === "number" && typeof p.lon === "number";
}

const app = express();
app.use(cors());
app.use(express.json());

// Per-Route-Cache fuer /api/status (schont die Rate-Limits).
const statusCache = new Map<string, { data: StatusResponse; expires: number }>();

function resolveRoute(routeId: unknown): Route | undefined {
  const routes = listRoutes();
  if (typeof routeId === "string" && routeId) return getRoute(routeId);
  return routes[0];
}

// --- Routen-Verwaltung -----------------------------------------------------

app.get("/api/routes", (_req, res) => res.json(listRoutes()));

// Adress-Vorschlaege (fuer den Auswahl-Dialog im Frontend).
app.get("/api/geocode", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json([]);
    res.json(await geocodeCandidates(q));
  } catch (err: any) {
    res.status(400).json({ error: String(err?.message ?? err) });
  }
});

app.post("/api/routes", async (req, res) => {
  try {
    const { name, originQuery, destQuery } = req.body ?? {};
    // Bevorzugt: explizit gewaehlte Orte (aus dem Auswahl-Dialog).
    // Fallback: Freitext-Query, den der Server aufloest.
    let origin: Place;
    let destination: Place;
    if (isPlace(req.body?.origin) && isPlace(req.body?.destination)) {
      origin = req.body.origin;
      destination = req.body.destination;
    } else if (originQuery && destQuery) {
      [origin, destination] = await Promise.all([
        geocode(String(originQuery)),
        geocode(String(destQuery)),
      ]);
    } else {
      return res
        .status(400)
        .json({ error: "origin/destination (Orte) oder originQuery/destQuery erforderlich" });
    }
    const id = `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const route: Route = {
      id,
      name: String(name || `${origin.label} → ${destination.label}`),
      origin,
      destination,
      createdAt: new Date().toISOString(),
    };
    addRoute(route);
    res.status(201).json(route);
  } catch (err: any) {
    res.status(400).json({ error: String(err?.message ?? err) });
  }
});

app.delete("/api/routes/:id", (req, res) => {
  const ok = deleteRoute(req.params.id);
  statusCache.delete(req.params.id);
  res.status(ok ? 200 : 404).json({ ok });
});

// --- Live-Status -----------------------------------------------------------

app.get("/api/status", async (req, res) => {
  try {
    const route = resolveRoute(req.query.routeId);
    if (!route) return res.status(404).json({ error: "Route nicht gefunden" });

    const now = Date.now();
    const cached = statusCache.get(route.id);
    if (cached && cached.expires > now) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.data);
    }
    const data = await buildStatus(route);
    statusCache.set(route.id, { data, expires: now + CACHE_TTL_SECONDS * 1000 });
    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (err: any) {
    console.error("[/api/status]", err);
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

// --- Vorhersage ------------------------------------------------------------

app.get("/api/predict", (req, res) => {
  const route = resolveRoute(req.query.routeId);
  if (!route) return res.status(404).json({ error: "Route nicht gefunden" });
  const now = new Date();
  const dow = req.query.dow != null ? Number(req.query.dow) : now.getDay();
  const hour = req.query.hour != null ? Number(req.query.hour) : now.getHours();
  const windowH = req.query.window != null ? Number(req.query.window) : 3;
  res.json(predict(route.id, dow, hour, windowH));
});

// --- OeV-Fahrzeuge (GTFS-Realtime) -----------------------------------------

app.get("/api/vehicles", async (req, res) => {
  try {
    const route = resolveRoute(req.query.routeId);
    if (!route) return res.status(404).json({ error: "Route nicht gefunden" });
    const r = await fetchVehicles(route.origin, route.destination);
    res.json(r);
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Serverstart -----------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
  console.log(`  -> Status: http://localhost:${PORT}/api/status`);
  startCollector();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[FEHLER] Port ${PORT} ist bereits belegt. Ein anderer Backend-Prozess läuft schon.\n` +
        `  -> Beende ihn oder setze in backend/.env einen anderen PORT.\n`
    );
    process.exit(1);
  }
  throw err;
});
