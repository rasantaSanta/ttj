import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Route } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Keys & Server ---------------------------------------------------------
export const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY?.trim() || "";
export const ASFINAG_FEED_URL = process.env.ASFINAG_FEED_URL?.trim() || "";
// GTFS-Realtime VehiclePositions-Feed (protobuf) fuer echte OeV-Fahrzeuge.
export const GTFS_RT_URL = process.env.GTFS_RT_URL?.trim() || "";
// Optionaler API-Key/Header fuer den GTFS-Feed (z.B. "Authorization: Bearer xy").
export const GTFS_RT_HEADER = process.env.GTFS_RT_HEADER?.trim() || "";

export const PORT = Number(process.env.PORT) || 3001;
export const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 60;
// Wie oft der Collector Fahrzeiten fuer jede Route misst (Minuten).
export const COLLECT_INTERVAL_MIN = Number(process.env.COLLECT_INTERVAL_MIN) || 10;

// --- Datenablage -----------------------------------------------------------
export const DATA_DIR = path.resolve(__dirname, "..", "data");
export const ROUTES_FILE = path.join(DATA_DIR, "routes.json");
export const SAMPLES_FILE = path.join(DATA_DIR, "samples.jsonl");

// --- Standard-Route (wird beim ersten Start angelegt) ----------------------
export const DEFAULT_ROUTE: Route = {
  id: "linz-steyr",
  name: "Linz → Steyr",
  origin: { label: "Linz Hauptbahnhof", lat: 48.2903, lon: 14.2913 },
  destination: { label: "Steyr", lat: 48.0402, lon: 14.4199 },
  createdAt: "2026-01-01T00:00:00.000Z",
};
