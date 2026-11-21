import fs from "node:fs";
import { DATA_DIR, ROUTES_FILE, SAMPLES_FILE, DEFAULT_ROUTE } from "./config.js";
import type { Route, Sample } from "./types.js";

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- Routen ----------------------------------------------------------------

export function listRoutes(): Route[] {
  ensureDir();
  if (!fs.existsSync(ROUTES_FILE)) {
    saveRoutes([DEFAULT_ROUTE]);
    return [DEFAULT_ROUTE];
  }
  try {
    return JSON.parse(fs.readFileSync(ROUTES_FILE, "utf8")) as Route[];
  } catch {
    return [DEFAULT_ROUTE];
  }
}

function saveRoutes(routes: Route[]) {
  ensureDir();
  fs.writeFileSync(ROUTES_FILE, JSON.stringify(routes, null, 2));
}

export function getRoute(id: string): Route | undefined {
  return listRoutes().find((r) => r.id === id);
}

export function addRoute(route: Route): Route {
  const routes = listRoutes();
  routes.push(route);
  saveRoutes(routes);
  return route;
}

export function deleteRoute(id: string): boolean {
  const routes = listRoutes();
  const next = routes.filter((r) => r.id !== id);
  if (next.length === routes.length) return false;
  saveRoutes(next);
  return true;
}

// --- Messwerte (Historie) --------------------------------------------------

export function appendSample(sample: Sample) {
  ensureDir();
  fs.appendFileSync(SAMPLES_FILE, JSON.stringify(sample) + "\n");
}

export function readSamples(routeId?: string): Sample[] {
  ensureDir();
  if (!fs.existsSync(SAMPLES_FILE)) return [];
  const out: Sample[] = [];
  const lines = fs.readFileSync(SAMPLES_FILE, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const s = JSON.parse(line) as Sample;
      if (!routeId || s.routeId === routeId) out.push(s);
    } catch {
      // beschaedigte Zeile ueberspringen
    }
  }
  return out;
}
