import { HARD_HAZARDS, IMPOSSIBLE_HAZARDS, type HazardKind } from "./content";

export type HazardDifficulty = "Easy" | "Medium" | "Hard" | "Impossible";

export interface TrackHazard {
  id: string;
  kind: HazardKind;
  x: number;
  anchorX: number;
  side: "left" | "right";
  width: number;
  lane: "player" | "bot" | "both";
  phase: number;
  period: number;
  active: boolean;
  hitPlayer?: boolean;
  hitBot?: boolean;
}

export interface HazardRuntime {
  items: TrackHazard[];
  playerSlide: number;
  botSlide: number;
  playerBrakeMul: number;
  botBrakeMul: number;
  playerSpeedMul: number;
  botSpeedMul: number;
  playerNudge: number;
  botNudge: number;
}

function makeId(kind: HazardKind, index: number): string {
  return `${kind}-${index}`;
}

const MAP_OFFSETS: Record<string, number> = {
  "neon-grid": 0,
  "cherry-blossom": 1.2,
  city: -0.8,
  mountain: 0.6,
  coastal: -1.1,
  desert: 1.6,
  snow: -0.4,
  aurora: 0.9,
};

export function createHazards(difficulty: HazardDifficulty, mapId = "neon-grid"): HazardRuntime {
  const empty: HazardRuntime = {
    items: [],
    playerSlide: 0,
    botSlide: 0,
    playerBrakeMul: 1,
    botBrakeMul: 1,
    playerSpeedMul: 1,
    botSpeedMul: 1,
    playerNudge: 0,
    botNudge: 0,
  };

  if (difficulty !== "Hard" && difficulty !== "Impossible") return empty;

  const items: TrackHazard[] = [];
  const mapOffset = MAP_OFFSETS[mapId] ?? 0;
  let itemIndex = 0;

  // Every obstacle is mirrored so both racers face the same type, spacing, and effect.
  const addMirrored = (kind: HazardKind, leftX: number, width: number, period = 1, phase = 0) => {
    const safeLeftX = Math.max(21, Math.min(42, leftX + mapOffset));
    const rightX = 100 - safeLeftX;
    items.push({
      id: makeId(kind, itemIndex++),
      kind,
      x: safeLeftX,
      anchorX: safeLeftX,
      side: "left",
      width,
      lane: "both",
      phase,
      period,
      active: true,
    });
    items.push({
      id: makeId(kind, itemIndex++),
      kind,
      x: rightX,
      anchorX: rightX,
      side: "right",
      width,
      lane: "both",
      phase,
      period,
      active: true,
    });
  };

  // Hard has only two encounters per side, leaving long, clear racing sections.
  addMirrored("banana", 27 + Math.random() * 1.8, 2.1);
  addMirrored("oil", 38 + Math.random() * 1.5, 2.8);

  if (difficulty === "Impossible") {
    // Two advanced pairs are sampled per round. Impossible stays varied but readable.
    const advanced: Array<{ kind: HazardKind; x: number; width: number; period: number; phase: number }> = [
      { kind: "barrier", x: 32.5, width: 3.4, period: 1.8, phase: 0 },
      { kind: "pulse-gate", x: 41, width: 3.8, period: 1.35, phase: 0.4 },
      { kind: "surge-wall", x: 33, width: 2.8, period: 2.1, phase: 0.2 },
      { kind: "timing-flare", x: 40, width: 2.2, period: 1.6, phase: 0.8 },
    ];
    const start = Math.floor(Math.random() * advanced.length);
    [advanced[start], advanced[(start + 2) % advanced.length]].forEach((hazard) => {
      addMirrored(hazard.kind, hazard.x, hazard.width, hazard.period, hazard.phase);
    });
  }

  return { ...empty, items };
}

export function activeHazardKinds(difficulty: HazardDifficulty): HazardKind[] {
  if (difficulty === "Hard") return HARD_HAZARDS.map((h) => h.kind);
  if (difficulty === "Impossible") {
    return Array.from(new Set(IMPOSSIBLE_HAZARDS.map((h) => h.kind)));
  }
  return [];
}

function overlaps(x: number, hazard: TrackHazard): boolean {
  return Math.abs(x - hazard.x) <= hazard.width * 0.5;
}

export function stepHazards(
  runtime: HazardRuntime,
  elapsed: number,
  dt: number,
  playerX: number,
  botX: number,
  playerBraking: boolean,
  botBraking: boolean,
): void {
  runtime.playerSlide = Math.max(0, runtime.playerSlide - dt);
  runtime.botSlide = Math.max(0, runtime.botSlide - dt);
  runtime.playerBrakeMul = 1;
  runtime.botBrakeMul = 1;
  runtime.playerSpeedMul = 1;
  runtime.botSpeedMul = 1;
  runtime.playerNudge = 0;
  runtime.botNudge = 0;

  for (const hazard of runtime.items) {
    if (hazard.kind === "barrier") {
      const direction = hazard.side === "left" ? 1 : -1;
      hazard.x = hazard.anchorX + Math.sin(elapsed * (Math.PI * 2) / hazard.period + hazard.phase) * 3.2 * direction;
      hazard.active = true;
    } else if (hazard.kind === "pulse-gate") {
      const wave = (Math.sin(elapsed * (Math.PI * 2) / hazard.period + hazard.phase) + 1) * 0.5;
      hazard.active = wave > 0.42;
    } else if (hazard.kind === "surge-wall") {
      const travel = (elapsed * 7) % 8;
      hazard.x = hazard.side === "left" ? hazard.anchorX - 4 + travel : hazard.anchorX + 4 - travel;
      hazard.active = true;
    } else if (hazard.kind === "timing-flare") {
      const wave = (Math.sin(elapsed * (Math.PI * 2) / hazard.period + hazard.phase) + 1) * 0.5;
      hazard.active = wave > 0.55;
    }

    if (!hazard.active) continue;

    const hitPlayer = (hazard.lane === "player" || hazard.lane === "both") && overlaps(playerX, hazard);
    const hitBot = (hazard.lane === "bot" || hazard.lane === "both") && overlaps(botX, hazard);

    if (hitPlayer && !hazard.hitPlayer) {
      hazard.hitPlayer = true;
      applyHit(runtime, "player", hazard.kind, playerBraking);
    } else if (!hitPlayer) {
      hazard.hitPlayer = false;
    }

    if (hitBot && !hazard.hitBot) {
      hazard.hitBot = true;
      applyHit(runtime, "bot", hazard.kind, botBraking);
    } else if (!hitBot) {
      hazard.hitBot = false;
    }

    // Continuous modifiers while overlapping dynamic hazards
    if (hitPlayer) {
      if (hazard.kind === "oil") runtime.playerBrakeMul = Math.min(runtime.playerBrakeMul, 0.72);
      if (hazard.kind === "pulse-gate" && hazard.active) runtime.playerSpeedMul = Math.min(runtime.playerSpeedMul, 0.82);
      if (hazard.kind === "barrier") runtime.playerNudge += Math.sin(elapsed * 18) * 0.015;
      if (hazard.kind === "surge-wall") runtime.playerBrakeMul = Math.min(runtime.playerBrakeMul, 0.64);
      if (hazard.kind === "timing-flare" && hazard.active) runtime.playerSpeedMul = Math.min(runtime.playerSpeedMul, 0.9);
    }
    if (hitBot) {
      if (hazard.kind === "oil") runtime.botBrakeMul = Math.min(runtime.botBrakeMul, 0.72);
      if (hazard.kind === "pulse-gate" && hazard.active) runtime.botSpeedMul = Math.min(runtime.botSpeedMul, 0.82);
      if (hazard.kind === "barrier") runtime.botNudge += Math.sin(elapsed * 18) * 0.015;
      if (hazard.kind === "surge-wall") runtime.botBrakeMul = Math.min(runtime.botBrakeMul, 0.64);
      if (hazard.kind === "timing-flare" && hazard.active) runtime.botSpeedMul = Math.min(runtime.botSpeedMul, 0.9);
    }
  }

  if (runtime.playerSlide > 0) {
    runtime.playerNudge += Math.sin(elapsed * 26) * 0.04;
    runtime.playerBrakeMul = Math.min(runtime.playerBrakeMul, 0.78);
  }
  if (runtime.botSlide > 0) {
    runtime.botNudge += Math.sin(elapsed * 26) * 0.04;
    runtime.botBrakeMul = Math.min(runtime.botBrakeMul, 0.78);
  }
}

function applyHit(
  runtime: HazardRuntime,
  side: "player" | "bot",
  kind: HazardKind,
  braking: boolean,
): void {
  if (kind === "banana") {
    if (side === "player") {
      runtime.playerSlide = Math.max(runtime.playerSlide, 0.55);
      runtime.playerNudge += braking ? 0.08 : 0.12;
    } else {
      runtime.botSlide = Math.max(runtime.botSlide, 0.55);
      runtime.botNudge += braking ? 0.08 : 0.12;
    }
  }
  if (kind === "oil") {
    if (side === "player") runtime.playerBrakeMul = Math.min(runtime.playerBrakeMul, 0.7);
    else runtime.botBrakeMul = Math.min(runtime.botBrakeMul, 0.7);
  }
  if (kind === "timing-flare") {
    if (side === "player") runtime.playerSlide = Math.max(runtime.playerSlide, 0.28);
    else runtime.botSlide = Math.max(runtime.botSlide, 0.28);
  }
}
