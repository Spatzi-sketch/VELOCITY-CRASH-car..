import {
  ARENA_MAPS,
  PAINTS,
  type ArenaMapId,
  type PaintId,
} from "./content";

const COINS_KEY = "velocity-crash-coins";
const MAPS_KEY = "velocity-crash-unlocked-maps";
const PAINTS_KEY = "velocity-crash-unlocked-paints";
const LANG_KEY = "velocity-crash-language";
const SELECTED_MAP_KEY = "velocity-crash-selected-map";
const SELECTED_PAINT_KEY = "velocity-crash-selected-paint";
const HAZARD_TUTORIALS_KEY = "velocity-crash-hazard-tutorials";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadCoins(): number {
  const value = Number(localStorage.getItem(COINS_KEY) ?? "0");
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function saveCoins(coins: number): void {
  localStorage.setItem(COINS_KEY, String(Math.max(0, Math.floor(coins))));
}

export function loadUnlockedMaps(): ArenaMapId[] {
  const free = ARENA_MAPS.filter((map) => map.free).map((map) => map.id);
  const stored = safeParse<ArenaMapId[]>(localStorage.getItem(MAPS_KEY), free);
  return Array.from(new Set([...free, ...stored]));
}

export function saveUnlockedMaps(ids: ArenaMapId[]): void {
  localStorage.setItem(MAPS_KEY, JSON.stringify(ids));
}

export function loadUnlockedPaints(): PaintId[] {
  const free = PAINTS.filter((paint) => paint.free).map((paint) => paint.id);
  const stored = safeParse<PaintId[]>(localStorage.getItem(PAINTS_KEY), free);
  return Array.from(new Set([...free, ...stored]));
}

export function saveUnlockedPaints(ids: PaintId[]): void {
  localStorage.setItem(PAINTS_KEY, JSON.stringify(ids));
}

export function loadLanguage(): "en" | "de" {
  const value = localStorage.getItem(LANG_KEY);
  return value === "de" ? "de" : "en";
}

export function saveLanguage(lang: "en" | "de"): void {
  localStorage.setItem(LANG_KEY, lang);
}

export function loadSelectedMap(unlocked: ArenaMapId[]): ArenaMapId {
  const stored = localStorage.getItem(SELECTED_MAP_KEY) as ArenaMapId | null;
  if (stored && unlocked.includes(stored)) return stored;
  return unlocked[0] ?? "neon-grid";
}

export function saveSelectedMap(id: ArenaMapId): void {
  localStorage.setItem(SELECTED_MAP_KEY, id);
}

export function loadSelectedPaint(unlocked: PaintId[]): PaintId {
  const stored = localStorage.getItem(SELECTED_PAINT_KEY) as PaintId | null;
  if (stored && unlocked.includes(stored)) return stored;
  return unlocked[0] ?? "cyan";
}

export function saveSelectedPaint(id: PaintId): void {
  localStorage.setItem(SELECTED_PAINT_KEY, id);
}

export function loadHazardTutorials(): boolean {
  return localStorage.getItem(HAZARD_TUTORIALS_KEY) !== "off";
}

export function saveHazardTutorials(enabled: boolean): void {
  localStorage.setItem(HAZARD_TUTORIALS_KEY, enabled ? "on" : "off");
}
