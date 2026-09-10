export type Language = "en" | "de";
export type ArenaMapId =
  | "neon-grid"
  | "cherry-blossom"
  | "city"
  | "mountain"
  | "coastal"
  | "desert"
  | "snow"
  | "aurora";

export type PaintId =
  | "cyan"
  | "crimson"
  | "violet"
  | "lime"
  | "amber"
  | "orange"
  | "gold"
  | "neon-pink"
  | "ice-blue"
  | "obsidian"
  | "prism";

export type HazardKind =
  | "banana"
  | "oil"
  | "barrier"
  | "pulse-gate"
  | "surge-wall"
  | "timing-flare";

export interface ArenaMapDef {
  id: ArenaMapId;
  price: number;
  free: boolean;
  accent: string;
  secondary: string;
  sky: string;
  ground: string;
  glow: string;
  particle: string;
}

export interface PaintDef {
  id: PaintId;
  hex: string;
  price: number;
  free: boolean;
  rare?: boolean;
}

export interface HazardDef {
  kind: HazardKind;
  difficulty: "Hard" | "Impossible";
}

export const COIN_REWARDS = {
  Easy: 8,
  Medium: 18,
  Hard: 38,
  Impossible: 70,
} as const;

export const ARENA_MAPS: ArenaMapDef[] = [
  {
    id: "neon-grid",
    price: 0,
    free: true,
    accent: "#21d4fd",
    secondary: "#7a93a8",
    sky: "linear-gradient(180deg, #041018 0%, #0a1c28 48%, #061018 100%)",
    ground: "linear-gradient(180deg, rgba(12, 28, 38, 0.2), rgba(8, 16, 24, 0.55))",
    glow: "rgba(33, 212, 253, 0.18)",
    particle: "#21d4fd",
  },
  {
    id: "cherry-blossom",
    price: 120,
    free: false,
    accent: "#ff8bb5",
    secondary: "#ffd6e7",
    sky: "linear-gradient(180deg, #1a0d18 0%, #3a1a2d 42%, #6a3048 100%)",
    ground: "linear-gradient(180deg, rgba(80, 30, 52, 0.25), rgba(28, 12, 24, 0.6))",
    glow: "rgba(255, 139, 181, 0.22)",
    particle: "#ffc1d8",
  },
  {
    id: "city",
    price: 260,
    free: false,
    accent: "#5ce1ff",
    secondary: "#ffd54a",
    sky: "linear-gradient(180deg, #05070f 0%, #12182a 45%, #1a2038 100%)",
    ground: "linear-gradient(180deg, rgba(20, 28, 48, 0.28), rgba(8, 10, 18, 0.7))",
    glow: "rgba(92, 225, 255, 0.2)",
    particle: "#ffd54a",
  },
  {
    id: "mountain",
    price: 420,
    free: false,
    accent: "#8fd48a",
    secondary: "#d7e8ff",
    sky: "linear-gradient(180deg, #0b1520 0%, #1d3344 40%, #2f4d3a 100%)",
    ground: "linear-gradient(180deg, rgba(34, 56, 42, 0.3), rgba(10, 18, 16, 0.65))",
    glow: "rgba(143, 212, 138, 0.18)",
    particle: "#b8e0b4",
  },
  {
    id: "coastal",
    price: 620,
    free: false,
    accent: "#48d7ff",
    secondary: "#ffe29a",
    sky: "linear-gradient(180deg, #071820 0%, #12384a 48%, #1c6a78 100%)",
    ground: "linear-gradient(180deg, rgba(20, 70, 82, 0.28), rgba(8, 24, 30, 0.62))",
    glow: "rgba(72, 215, 255, 0.2)",
    particle: "#9aecff",
  },
  {
    id: "desert",
    price: 900,
    free: false,
    accent: "#ffb347",
    secondary: "#ffe0a8",
    sky: "linear-gradient(180deg, #1a1008 0%, #4a2c12 45%, #8a5a24 100%)",
    ground: "linear-gradient(180deg, rgba(90, 50, 18, 0.3), rgba(28, 14, 6, 0.65))",
    glow: "rgba(255, 179, 71, 0.2)",
    particle: "#ffd28a",
  },
  {
    id: "snow",
    price: 1250,
    free: false,
    accent: "#b8e7ff",
    secondary: "#ffffff",
    sky: "linear-gradient(180deg, #0a1218 0%, #1a2c3a 48%, #3a5a70 100%)",
    ground: "linear-gradient(180deg, rgba(40, 60, 78, 0.28), rgba(12, 18, 26, 0.7))",
    glow: "rgba(184, 231, 255, 0.22)",
    particle: "#ffffff",
  },
  {
    id: "aurora",
    price: 1800,
    free: false,
    accent: "#7dffb3",
    secondary: "#c79bff",
    sky: "linear-gradient(180deg, #050812 0%, #102038 40%, #18304a 70%, #241838 100%)",
    ground: "linear-gradient(180deg, rgba(24, 40, 58, 0.3), rgba(10, 12, 24, 0.72))",
    glow: "rgba(125, 255, 179, 0.2)",
    particle: "#b8ffd6",
  },
];

export const PAINTS: PaintDef[] = [
  { id: "cyan", hex: "#21d4fd", price: 0, free: true },
  { id: "crimson", hex: "#ff3b5c", price: 0, free: true },
  { id: "violet", hex: "#9b6cff", price: 35, free: false },
  { id: "lime", hex: "#53f28c", price: 45, free: false },
  { id: "amber", hex: "#ffd43b", price: 55, free: false },
  { id: "orange", hex: "#ff7a31", price: 70, free: false },
  { id: "gold", hex: "#f6c453", price: 140, free: false, rare: true },
  { id: "neon-pink", hex: "#ff2bd6", price: 180, free: false, rare: true },
  { id: "ice-blue", hex: "#8af7ff", price: 200, free: false, rare: true },
  { id: "obsidian", hex: "#d7dde8", price: 260, free: false, rare: true },
  { id: "prism", hex: "#a8ff60", price: 360, free: false, rare: true },
];

export const HARD_HAZARDS: HazardDef[] = [
  { kind: "banana", difficulty: "Hard" },
  { kind: "oil", difficulty: "Hard" },
];

export const IMPOSSIBLE_HAZARDS: HazardDef[] = [
  { kind: "banana", difficulty: "Impossible" },
  { kind: "oil", difficulty: "Impossible" },
  { kind: "barrier", difficulty: "Impossible" },
  { kind: "pulse-gate", difficulty: "Impossible" },
  { kind: "surge-wall", difficulty: "Impossible" },
  { kind: "timing-flare", difficulty: "Impossible" },
];

export function getMap(id: ArenaMapId): ArenaMapDef {
  return ARENA_MAPS.find((map) => map.id === id) ?? ARENA_MAPS[0];
}

export function getPaint(id: PaintId): PaintDef {
  return PAINTS.find((paint) => paint.id === id) ?? PAINTS[0];
}

export function getPaintByHex(hex: string): PaintDef | undefined {
  return PAINTS.find((paint) => paint.hex.toLowerCase() === hex.toLowerCase());
}
