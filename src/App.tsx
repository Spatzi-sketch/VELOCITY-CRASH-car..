import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { GarageModal } from "./components/GarageModal";
import { HazardBriefing } from "./components/HazardBriefing";
import { HazardLayer } from "./components/HazardLayer";
import { MapAtmosphere } from "./components/MapAtmosphere";
import {
  ARENA_MAPS,
  COIN_REWARDS,
  PAINTS,
  getMap,
  getPaint,
  getPaintByHex,
  type ArenaMapId,
  type Language,
  type PaintId,
} from "./game/content";
import { createHazards, stepHazards, type HazardRuntime } from "./game/hazards";
import { mapName, paintName, t } from "./game/i18n";
import {
  loadCoins,
  loadHazardTutorials,
  loadLanguage,
  loadSelectedMap,
  loadSelectedPaint,
  loadUnlockedMaps,
  loadUnlockedPaints,
  saveCoins,
  saveHazardTutorials,
  saveLanguage,
  saveSelectedMap,
  saveSelectedPaint,
  saveUnlockedMaps,
  saveUnlockedPaints,
} from "./game/progression";

type Phase = "lobby" | "briefing" | "countdown" | "racing" | "paused" | "replay" | "result";
type Difficulty = "Easy" | "Medium" | "Hard" | "Impossible";
type ArenaSpeed = "Slow" | "Normal" | "Fast" | "Turbo";
type MapSize = "Small" | "Medium" | "Large";
type BotStyle = "Aggressive" | "Tactical" | "Unpredictable";
type VisualTheme = "Neon" | "Minimalist" | "Cyberpunk";
type Outcome = "win" | "loss" | "draw";

interface Settings {
  difficulty: Difficulty;
  speed: ArenaSpeed;
  map: MapSize;
  botStyle: BotStyle;
  theme: VisualTheme;
  color: string;
}

interface RacerPhysics {
  x: number;
  velocity: number;
  braking: boolean;
  brakeTime: number | null;
  crashed: boolean;
  stopped: boolean;
}

interface GameFrame {
  elapsed: number;
  playerX: number;
  botX: number;
  playerVelocity: number;
  botVelocity: number;
  playerBraking: boolean;
  botBraking: boolean;
  playerCrashed: boolean;
  botCrashed: boolean;
  playerSlide?: boolean;
  botSlide?: boolean;
}

interface GameState {
  elapsed: number;
  acceleration: number;
  deceleration: number;
  playerBoundary: number;
  botBoundary: number;
  botBrakeAt: number;
  player: RacerPhysics;
  bot: RacerPhysics;
  ended: boolean;
  lastFrameAt: number;
  lastSnapshotAt: number;
  snapshots: GameFrame[];
  hazards: HazardRuntime;
}

interface MatchResult {
  outcome: Outcome;
  reason: string;
  playerBrake: number | null;
  botBrake: number | null;
  closed: number;
  clearance: number;
  duration: number;
  earned: number;
  coinsEarned: number;
}

interface ScoreEntry {
  id: number;
  score: number;
  brakeTime: number;
  difficulty: Difficulty;
  speed: ArenaSpeed;
  date: string;
}

interface EffectBurst {
  id: number;
  x: number;
  color: string;
  kind: "brake" | "impact";
}

const START_PLAYER_X = 7.5;
const START_BOT_X = 92.5;
const MAX_VELOCITY = 42;

const DEFAULT_SETTINGS: Settings = {
  difficulty: "Medium",
  speed: "Normal",
  map: "Medium",
  botStyle: "Unpredictable",
  theme: "Neon",
  color: "#21d4fd",
};

const SPEED_ACCELERATION: Record<ArenaSpeed, number> = {
  Slow: 4.5,
  Normal: 10,
  Fast: 16,
  Turbo: 24,
};

const MAP_BOUNDARY: Record<MapSize, number> = {
  Small: 45.5,
  Medium: 47.2,
  Large: 48.4,
};

const DIFFICULTY_SCORE: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 90,
  Hard: 220,
  Impossible: 420,
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  Easy: "+500 ms",
  Medium: "+250 ms",
  Hard: "+50 ms",
  Impossible: "-100 ms",
};

const COLORS = ["#21d4fd", "#ff3b5c", "#9b6cff", "#53f28c", "#ffd43b", "#ff7a31"];

const initialFrame: GameFrame = {
  elapsed: 0,
  playerX: START_PLAYER_X,
  botX: START_BOT_X,
  playerVelocity: 0,
  botVelocity: 0,
  playerBraking: false,
  botBraking: false,
  playerCrashed: false,
  botCrashed: false,
  playerSlide: false,
  botSlide: false,
};

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem("velocity-crash-settings");
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadScores(): ScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem("velocity-crash-scores") || "[]");
  } catch {
    return [];
  }
}

function makeGame(settings: Settings, selectedMap: ArenaMapId): GameState {
  const acceleration = SPEED_ACCELERATION[settings.speed];
  const deceleration = acceleration * 3.4;
  const playerBoundary = MAP_BOUNDARY[settings.map];
  const targetDistance = playerBoundary - START_PLAYER_X - 2.35;
  const optimalTime = Math.sqrt(
    targetDistance / (acceleration * 0.5 + (acceleration * acceleration) / (2 * deceleration)),
  );

  const difficultyOffset: Record<Difficulty, number> = {
    Easy: 0.22,
    Medium: 0.065,
    Hard: -0.035,
    Impossible: -0.11,
  };
  const styleOffset: Record<BotStyle, number> = {
    Aggressive: 0.075,
    Tactical: -0.03,
    Unpredictable: Math.random() * 0.28 - 0.12,
  };
  const variance: Record<Difficulty, number> = {
    Easy: 0.12,
    Medium: 0.075,
    Hard: 0.035,
    Impossible: 0.015,
  };
  const randomVariance = (Math.random() * 2 - 1) * variance[settings.difficulty];

  return {
    elapsed: 0,
    acceleration,
    deceleration,
    playerBoundary,
    botBoundary: 100 - playerBoundary,
    botBrakeAt: Math.max(0.65, optimalTime + difficultyOffset[settings.difficulty] + styleOffset[settings.botStyle] + randomVariance),
    player: {
      x: START_PLAYER_X,
      velocity: 0,
      braking: false,
      brakeTime: null,
      crashed: false,
      stopped: false,
    },
    bot: {
      x: START_BOT_X,
      velocity: 0,
      braking: false,
      brakeTime: null,
      crashed: false,
      stopped: false,
    },
    ended: false,
    lastFrameAt: 0,
    lastSnapshotAt: 0,
    snapshots: [],
    hazards: createHazards(settings.difficulty, selectedMap),
  };
}

function gameToFrame(game: GameState): GameFrame {
  return {
    elapsed: game.elapsed,
    playerX: game.player.x,
    botX: game.bot.x,
    playerVelocity: game.player.velocity,
    botVelocity: game.bot.velocity,
    playerBraking: game.player.braking,
    botBraking: game.bot.braking,
    playerCrashed: game.player.crashed,
    botCrashed: game.bot.crashed,
    playerSlide: game.hazards.playerSlide > 0,
    botSlide: game.hazards.botSlide > 0,
  };
}

function formatTime(value: number | null, lang: Language): string {
  return value === null ? t(lang, "noBrake") : `${value.toFixed(2)}s`;
}

function Icon({ name, size = 20 }: { name: "sound" | "mute" | "trophy" | "pause" | "play" | "restart" | "back" | "replay" | "garage" | "coin"; size?: number }) {
  const paths: Record<string, ReactNode> = {
    sound: <><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9.5c1.3 1.4 1.3 3.6 0 5M18.8 7c2.8 2.8 2.8 7.2 0 10"/></>,
    mute: <><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m17 10 5 5m0-5-5 5"/></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4M12 13v4m-4 3h8m-6-3h4"/></>,
    pause: <><path d="M8 5v14M16 5v14"/></>,
    play: <path d="m9 6 9 6-9 6V6Z"/>,
    restart: <><path d="M5 8V4m0 0h4M5 4a9 9 0 1 1-1 10"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    replay: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8"/><path d="M4 4v4h4"/></>,
    garage: <><path d="M3 10 12 4l9 6v10H3V10Z"/><path d="M9 20v-6h6v6"/></>,
    coin: <><circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5c.8-1 2.2-1 3 0s.7 2.5-1.5 2.5h0c-2 0-2.2 1.5-1.4 2.5.8 1 2.3 1 3.1 0"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Vehicle({ side, x, velocity, color, braking, crashed, sliding, label }: {
  side: "player" | "bot";
  x: number;
  velocity: number;
  color: string;
  braking: boolean;
  crashed: boolean;
  sliding?: boolean;
  label: string;
}) {
  const style = {
    left: `${x}%`,
    "--car-color": color,
    "--trail-scale": Math.min(1, velocity / MAX_VELOCITY),
    "--trail-width": `${Math.min(95, (velocity / MAX_VELOCITY) * 95)}px`,
  } as CSSProperties;

  return (
    <div className={`racer racer--${side} ${braking ? "is-braking" : ""} ${crashed ? "is-crashed" : ""} ${sliding ? "is-sliding" : ""}`} style={style}>
      <div className="racer-label">{label}</div>
      <div className="speed-trails"><i/><i/><i/></div>
      <div className="brake-wave"/>
      <svg className="vehicle-shell" viewBox="0 0 120 54" role="img" aria-label={`${side} vehicle`}>
        <path className="vehicle-glow" d="M4 28 20 8h55l37 17-16 20H30L4 28Z" />
        <path className="vehicle-body" d="M4 28 20 8h55l37 17-16 20H30L4 28Z" />
        <path className="vehicle-cut" d="m27 13 42 1 18 10-65 1 5-12Z" />
        <path className="vehicle-window" d="m73 16 25 10-34-1 9-9Z" />
        <path className="vehicle-core" d="M36 31h47l-8 8H29l7-8Z" />
        <path className="vehicle-edge" d="M7 28h103M30 45l6-14" />
      </svg>
    </div>
  );
}

function ParticleBurst({ burst }: { burst: EffectBurst }) {
  return (
    <div className={`particle-burst particle-burst--${burst.kind}`} style={{ left: `${burst.x}%`, "--burst-color": burst.color } as CSSProperties}>
      {Array.from({ length: burst.kind === "impact" ? 30 : 16 }, (_, index) => {
        const angle = (index / (burst.kind === "impact" ? 30 : 16)) * Math.PI * 2;
        const distance = (burst.kind === "impact" ? 65 : 38) + (index % 5) * 12;
        return <i key={index} style={{ "--dx": `${Math.cos(angle) * distance}px`, "--dy": `${Math.sin(angle) * distance}px`, "--delay": `${(index % 4) * 12}ms` } as CSSProperties}/>;
      })}
    </div>
  );
}

function SegmentedSetting<T extends string>({ label, value, options, onChange, note, optionLabels }: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  note?: string;
  optionLabels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="setting-row">
      <div className="setting-label"><span>{label}</span>{note && <small>{note}</small>}</div>
      <div className="segmented-control">
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? "is-selected" : ""} onClick={() => onChange(option)}>
            {optionLabels?.[option] ?? option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreModal({ scores, onClose, lang }: { scores: ScoreEntry[]; onClose: () => void; lang: Language }) {
  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={onClose}>
      <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="score-title" onPointerDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><span className="eyebrow">{t(lang, "localRecords")}</span><h2 id="score-title">{t(lang, "hallOfVelocity")}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label={t(lang, "close")}>X</button>
        </div>
        {scores.length ? (
          <div className="score-table">
            <div className="score-table-row score-table-head"><span>{t(lang, "rank")}</span><span>{t(lang, "mode")}</span><span>{t(lang, "brake")}</span><span>{t(lang, "score")}</span></div>
            {scores.slice(0, 8).map((entry, index) => (
              <div className="score-table-row" key={entry.id}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <span>{entry.difficulty} / {entry.speed}</span>
                <span>{entry.brakeTime.toFixed(2)}s</span>
                <b>{entry.score.toLocaleString()}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-scores"><Icon name="trophy" size={34}/><p>{t(lang, "noWins")}</p><span>{t(lang, "firstClean")}</span></div>
        )}
        <button className="secondary-button modal-close" onClick={onClose}>{t(lang, "close")}</button>
      </section>
    </div>
  );
}

export default function App() {
  const initialUnlockedMaps = loadUnlockedMaps();
  const initialUnlockedPaints = loadUnlockedPaints();
  const initialPaint = loadSelectedPaint(initialUnlockedPaints);
  const initialSettings = loadSettings();
  const paintDef = getPaint(initialPaint);
  if (initialSettings.color !== paintDef.hex) {
    initialSettings.color = paintDef.hex;
  }

  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [countdown, setCountdown] = useState("3");
  const [frame, setFrame] = useState<GameFrame>(initialFrame);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>(loadScores);
  const [showScores, setShowScores] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [bursts, setBursts] = useState<EffectBurst[]>([]);
  const [shaking, setShaking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [lang, setLang] = useState<Language>(loadLanguage);
  const [coins, setCoins] = useState(loadCoins);
  const [unlockedMaps, setUnlockedMaps] = useState<ArenaMapId[]>(initialUnlockedMaps);
  const [unlockedPaints, setUnlockedPaints] = useState<PaintId[]>(initialUnlockedPaints);
  const [selectedMap, setSelectedMap] = useState<ArenaMapId>(loadSelectedMap(initialUnlockedMaps));
  const [selectedPaint, setSelectedPaint] = useState<PaintId>(initialPaint);
  const [showGarage, setShowGarage] = useState(false);
  const [garageTab, setGarageTab] = useState<"maps" | "paints">("maps");
  const [hazardSnapshot, setHazardSnapshot] = useState<HazardRuntime | null>(null);
  const [hazardTutorials, setHazardTutorials] = useState(loadHazardTutorials);

  const phaseRef = useRef<Phase>(phase);
  const gameRef = useRef<GameState | null>(null);
  const scoreRef = useRef(score);
  const streakRef = useRef(streak);
  const coinsRef = useRef(coins);
  const countdownTimers = useRef<number[]>([]);
  const effectId = useRef(0);
  const replayAnimation = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const humNodes = useRef<{ oscillator: OscillatorNode; gain: GainNode } | null>(null);
  const audioEnabledRef = useRef(audioEnabled);
  const langRef = useRef(lang);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { coinsRef.current = coins; }, [coins]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { localStorage.setItem("velocity-crash-settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { saveLanguage(lang); document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { saveSelectedMap(selectedMap); }, [selectedMap]);
  useEffect(() => { saveSelectedPaint(selectedPaint); }, [selectedPaint]);

  const ensureAudio = useCallback(() => {
    if (!audioEnabledRef.current) return null;
    if (!audioContext.current) audioContext.current = new AudioContext();
    if (audioContext.current.state === "suspended") void audioContext.current.resume();
    return audioContext.current;
  }, []);

  const tone = useCallback((frequency: number, duration = 0.08, type: OscillatorType = "sine", volume = 0.08, endFrequency?: number) => {
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, context.currentTime + duration);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [ensureAudio]);

  const stopHum = useCallback(() => {
    if (!humNodes.current || !audioContext.current) return;
    const { oscillator, gain } = humNodes.current;
    gain.gain.cancelScheduledValues(audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.current.currentTime + 0.08);
    oscillator.stop(audioContext.current.currentTime + 0.1);
    humNodes.current = null;
  }, []);

  const startHum = useCallback(() => {
    const context = ensureAudio();
    if (!context || humNodes.current) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 48;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.025, context.currentTime + 0.3);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    humNodes.current = { oscillator, gain };
  }, [ensureAudio]);

  const playImpact = useCallback(() => {
    const context = ensureAudio();
    if (!context) return;
    tone(95, 0.38, "sawtooth", 0.18, 34);
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.22), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = context.createBufferSource();
    const gain = context.createGain();
    noise.buffer = buffer;
    gain.gain.value = 0.13;
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    noise.connect(gain).connect(context.destination);
    noise.start();
  }, [ensureAudio, tone]);

  const triggerBurst = useCallback((x: number, color: string, kind: EffectBurst["kind"]) => {
    const id = ++effectId.current;
    setBursts((current) => [...current, { id, x, color, kind }]);
    window.setTimeout(() => setBursts((current) => current.filter((burst) => burst.id !== id)), 900);
  }, []);

  const changeSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    tone(430, 0.045, "sine", 0.025, 520);
  }, [tone]);

  const clearCountdown = useCallback(() => {
    countdownTimers.current.forEach((timer) => window.clearTimeout(timer));
    countdownTimers.current = [];
  }, []);

  const beginCountdown = useCallback(() => {
    clearCountdown();
    setCountdown("3");
    phaseRef.current = "countdown";
    setPhase("countdown");
    tone(620, 0.09, "sine", 0.07);

    const schedule = (delay: number, action: () => void) => {
      countdownTimers.current.push(window.setTimeout(action, delay));
    };
    schedule(700, () => { setCountdown("2"); tone(660, 0.09, "sine", 0.07); });
    schedule(1400, () => { setCountdown("1"); tone(720, 0.09, "sine", 0.075); });
    schedule(2100, () => { setCountdown("GO"); tone(180, 0.24, "square", 0.07, 420); });
    schedule(2260, () => {
      if (!gameRef.current) return;
      gameRef.current.lastFrameAt = performance.now();
      phaseRef.current = "racing";
      setPhase("racing");
      startHum();
    });
  }, [clearCountdown, startHum, tone]);

  const prepareMatch = useCallback(() => {
    clearCountdown();
    if (replayAnimation.current) cancelAnimationFrame(replayAnimation.current);
    stopHum();
    ensureAudio();
    const game = makeGame(settings, selectedMap);
    gameRef.current = game;
    setHazardSnapshot(game.hazards);
    setFrame(initialFrame);
    setResult(null);
    setShaking(false);
    setBursts([]);
  }, [clearCountdown, ensureAudio, selectedMap, settings, stopHum]);

  const launchMatch = useCallback(() => {
    prepareMatch();
    const needsBriefing = hazardTutorials && (settings.difficulty === "Hard" || settings.difficulty === "Impossible");
    if (needsBriefing) {
      phaseRef.current = "briefing";
      setPhase("briefing");
      tone(280, 0.12, "triangle", 0.05);
      return;
    }
    beginCountdown();
  }, [beginCountdown, hazardTutorials, prepareMatch, settings.difficulty, tone]);

  const continueFromBriefing = useCallback((dontShowAgain: boolean) => {
    if (dontShowAgain) {
      setHazardTutorials(false);
      saveHazardTutorials(false);
    }
    beginCountdown();
  }, [beginCountdown]);

  const concludeMatch = useCallback((outcome: Outcome, game: GameState, reasonKey: string) => {
    if (game.ended) return;
    game.ended = true;
    stopHum();
    const playerDistance = Math.max(0, game.player.x - START_PLAYER_X);
    const availableDistance = game.playerBoundary - START_PLAYER_X;
    const closed = Math.min(100, (playerDistance / availableDistance) * 100);
    const clearance = Math.max(0, game.playerBoundary - game.player.x);
    const closeBonus = outcome === "win" ? Math.max(0, Math.round(120 - clearance * 20)) : 0;
    const earned = outcome === "win" ? 180 + DIFFICULTY_SCORE[settings.difficulty] + closeBonus + streakRef.current * 35 : 0;
    const coinsEarned = outcome === "win" ? COIN_REWARDS[settings.difficulty] + Math.min(12, streakRef.current * 2) : 0;
    const matchResult: MatchResult = {
      outcome,
      reason: t(langRef.current, reasonKey),
      playerBrake: game.player.brakeTime,
      botBrake: game.bot.brakeTime,
      closed,
      clearance,
      duration: game.elapsed,
      earned,
      coinsEarned,
    };
    setResult(matchResult);

    if (outcome === "win") {
      const nextScore = scoreRef.current + earned;
      setScore(nextScore);
      setStreak((value) => value + 1);
      const nextCoins = coinsRef.current + coinsEarned;
      setCoins(nextCoins);
      saveCoins(nextCoins);
      tone(520, 0.14, "sine", 0.08, 780);
      window.setTimeout(() => tone(820, 0.2, "sine", 0.07, 1040), 130);
      const entry: ScoreEntry = {
        id: Date.now(),
        score: nextScore,
        brakeTime: game.player.brakeTime ?? game.elapsed,
        difficulty: settings.difficulty,
        speed: settings.speed,
        date: new Date().toISOString(),
      };
      setScores((current) => {
        const next = [...current, entry].sort((a, b) => b.score - a.score).slice(0, 20);
        localStorage.setItem("velocity-crash-scores", JSON.stringify(next));
        return next;
      });
    } else {
      if (outcome === "loss") setStreak(0);
      if (outcome === "draw") tone(260, 0.24, "triangle", 0.07, 180);
    }

    if (game.player.crashed || game.bot.crashed) {
      setShaking(true);
      triggerBurst(50, game.player.crashed ? "#ff3b5c" : "#ffffff", "impact");
      playImpact();
      if (navigator.vibrate) navigator.vibrate([45, 25, 70]);
      window.setTimeout(() => setShaking(false), 420);
    }

    window.setTimeout(() => {
      phaseRef.current = "result";
      setPhase("result");
    }, game.player.crashed || game.bot.crashed ? 430 : 180);
  }, [playImpact, settings.difficulty, settings.speed, stopHum, tone, triggerBurst]);

  const activateBrake = useCallback(() => {
    if (phaseRef.current !== "racing") return;
    const game = gameRef.current;
    if (!game || game.ended || game.player.braking) return;
    game.player.braking = true;
    game.player.brakeTime = game.elapsed;
    triggerBurst(game.player.x, settings.color, "brake");
    tone(360, 0.28, "sawtooth", 0.08, 78);
    if (navigator.vibrate) navigator.vibrate(28);
  }, [settings.color, tone, triggerBurst]);

  useEffect(() => {
    if (phase !== "racing") return;
    let animationFrame = 0;

    const tick = (now: number) => {
      const game = gameRef.current;
      if (!game || game.ended || phaseRef.current !== "racing") return;
      const dt = Math.min(0.032, Math.max(0.001, (now - game.lastFrameAt) / 1000));
      game.lastFrameAt = now;
      game.elapsed += dt;

      if (!game.bot.braking && game.elapsed >= game.botBrakeAt) {
        game.bot.braking = true;
        game.bot.brakeTime = game.elapsed;
        triggerBurst(game.bot.x, "#ff315d", "brake");
        tone(240, 0.2, "sawtooth", 0.035, 80);
      }

      if (settings.botStyle === "Tactical" && game.player.brakeTime !== null && !game.bot.braking) {
        const responseDelay = settings.difficulty === "Easy" ? 0.24 : settings.difficulty === "Medium" ? 0.12 : 0.045;
        game.botBrakeAt = Math.min(game.botBrakeAt, game.player.brakeTime + responseDelay);
      }

      // Additive hazard layer; base physics remain intact.
      stepHazards(
        game.hazards,
        game.elapsed,
        dt,
        game.player.x,
        game.bot.x,
        game.player.braking,
        game.bot.braking,
      );
      setHazardSnapshot({ ...game.hazards, items: game.hazards.items.map((item) => ({ ...item })) });

      const updateRacer = (racer: RacerPhysics, direction: 1 | -1, brakeMul: number, speedMul: number, nudge: number) => {
        if (racer.crashed || racer.stopped) return;
        if (racer.braking) racer.velocity = Math.max(0, racer.velocity - game.deceleration * dt * brakeMul);
        else racer.velocity += game.acceleration * dt * speedMul;
        racer.x += racer.velocity * dt * direction + nudge;
        if (racer.braking && racer.velocity <= 0.01) {
          racer.velocity = 0;
          racer.stopped = true;
        }
      };

      updateRacer(game.player, 1, game.hazards.playerBrakeMul, game.hazards.playerSpeedMul, game.hazards.playerNudge);
      updateRacer(game.bot, -1, game.hazards.botBrakeMul, game.hazards.botSpeedMul, -game.hazards.botNudge);

      if (!game.player.stopped && game.player.x >= game.playerBoundary) {
        game.player.crashed = true;
        game.player.velocity = 0;
        game.player.x = Math.min(49.1, game.playerBoundary + 0.8);
      }
      if (!game.bot.stopped && game.bot.x <= game.botBoundary) {
        game.bot.crashed = true;
        game.bot.velocity = 0;
        game.bot.x = Math.max(50.9, game.botBoundary - 0.8);
      }

      const nextFrame = gameToFrame(game);
      setFrame(nextFrame);
      if (game.elapsed - game.lastSnapshotAt >= 0.028) {
        game.snapshots.push(nextFrame);
        if (game.snapshots.length > 110) game.snapshots.shift();
        game.lastSnapshotAt = game.elapsed;
      }

      if (humNodes.current && audioContext.current) {
        const averageVelocity = (game.player.velocity + game.bot.velocity) / 2;
        humNodes.current.oscillator.frequency.setTargetAtTime(48 + averageVelocity * 3.4, audioContext.current.currentTime, 0.05);
      }

      if (game.player.crashed || game.bot.crashed) {
        if (game.player.crashed && game.bot.crashed) concludeMatch("draw", game, "reasonBothCrash");
        else if (game.player.crashed) concludeMatch("loss", game, game.player.braking ? "reasonTooLate" : "reasonNoBrake");
        else concludeMatch("win", game, "reasonBotCrash");
        return;
      }

      if (game.player.stopped && game.bot.stopped) {
        const playerClearance = game.playerBoundary - game.player.x;
        const botClearance = game.bot.x - game.botBoundary;
        const difference = playerClearance - botClearance;
        if (Math.abs(difference) < 0.45) concludeMatch("draw", game, "reasonDraw");
        else if (difference < 0) concludeMatch("win", game, "reasonCloserWin");
        else concludeMatch("loss", game, "reasonCloserLoss");
        return;
      }

      animationFrame = requestAnimationFrame(tick);
    };

    const game = gameRef.current;
    if (game) game.lastFrameAt = performance.now();
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [concludeMatch, phase, settings.botStyle, settings.difficulty, tone, triggerBurst]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "racing") return;
    stopHum();
    phaseRef.current = "paused";
    setPhase("paused");
  }, [stopHum]);

  const resumeGame = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.lastFrameAt = performance.now();
    phaseRef.current = "racing";
    setPhase("racing");
    startHum();
  }, [startHum]);

  const returnToLobby = useCallback(() => {
    clearCountdown();
    stopHum();
    if (replayAnimation.current) cancelAnimationFrame(replayAnimation.current);
    phaseRef.current = "lobby";
    setPhase("lobby");
    setResult(null);
    setFrame(initialFrame);
    setHazardSnapshot(null);
  }, [clearCountdown, stopHum]);

  const watchReplay = useCallback(() => {
    const game = gameRef.current;
    if (!game || game.snapshots.length < 2) return;
    const snapshots = game.snapshots;
    const endTime = snapshots[snapshots.length - 1].elapsed;
    const foundIndex = snapshots.findIndex((snapshot) => snapshot.elapsed >= endTime - 0.9);
    const startIndex = Math.max(0, foundIndex);
    const replayFrames = snapshots.slice(startIndex);
    const sourceStart = replayFrames[0].elapsed;
    const startedAt = performance.now();
    phaseRef.current = "replay";
    setPhase("replay");
    tone(150, 0.22, "triangle", 0.045, 95);

    const replayTick = (now: number) => {
      const sourceElapsed = sourceStart + ((now - startedAt) / 1000) * 0.55;
      let selected = replayFrames[replayFrames.length - 1];
      for (const replayFrame of replayFrames) {
        if (replayFrame.elapsed >= sourceElapsed) {
          selected = replayFrame;
          break;
        }
      }
      setFrame(selected);
      if (sourceElapsed < endTime) replayAnimation.current = requestAnimationFrame(replayTick);
      else {
        setFrame(replayFrames[replayFrames.length - 1]);
        phaseRef.current = "result";
        setPhase("result");
      }
    };
    replayAnimation.current = requestAnimationFrame(replayTick);
  }, [tone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        activateBrake();
      }
      if (event.code === "Escape" || event.code === "KeyP") {
        if (phaseRef.current === "racing") pauseGame();
        else if (phaseRef.current === "paused") resumeGame();
      }
      if (event.code === "KeyR" && phaseRef.current === "result") launchMatch();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activateBrake, launchMatch, pauseGame, resumeGame]);

  useEffect(() => () => {
    clearCountdown();
    stopHum();
    if (replayAnimation.current) cancelAnimationFrame(replayAnimation.current);
    if (audioContext.current) void audioContext.current.close();
  }, [clearCountdown, stopHum]);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioEnabledRef.current = next;
    if (!next) stopHum();
    else tone(520, 0.06, "sine", 0.05);
  };

  const handleArenaPointer = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, .outcome-panel, .pause-panel, .hazard-briefing, .garage-modal")) return;
    activateBrake();
  };

  const selectPaint = (id: PaintId) => {
    if (!unlockedPaints.includes(id)) return;
    const paint = getPaint(id);
    setSelectedPaint(id);
    changeSetting("color", paint.hex);
  };

  const unlockMap = (id: ArenaMapId) => {
    const def = ARENA_MAPS.find((map) => map.id === id);
    if (!def || unlockedMaps.includes(id) || coins < def.price) return;
    const nextCoins = coins - def.price;
    const nextMaps = [...unlockedMaps, id];
    setCoins(nextCoins);
    saveCoins(nextCoins);
    setUnlockedMaps(nextMaps);
    saveUnlockedMaps(nextMaps);
    setSelectedMap(id);
    tone(640, 0.16, "sine", 0.07, 980);
  };

  const unlockPaint = (id: PaintId) => {
    const def = PAINTS.find((paint) => paint.id === id);
    if (!def || unlockedPaints.includes(id) || coins < def.price) return;
    const nextCoins = coins - def.price;
    const nextPaints = [...unlockedPaints, id];
    setCoins(nextCoins);
    saveCoins(nextCoins);
    setUnlockedPaints(nextPaints);
    saveUnlockedPaints(nextPaints);
    selectPaint(id);
    tone(700, 0.16, "sine", 0.07, 1100);
  };

  // Keep free color buttons in setup in sync with unlock ownership.
  const availableSetupColors = COLORS.filter((hex) => {
    const paint = getPaintByHex(hex);
    return !paint || unlockedPaints.includes(paint.id);
  });

  const playerRisk = (() => {
    const game = gameRef.current;
    if (!game || frame.playerBraking) return 0;
    const remaining = Math.max(0.01, game.playerBoundary - frame.playerX);
    const stoppingDistance = (frame.playerVelocity * frame.playerVelocity) / (2 * game.deceleration);
    return stoppingDistance / remaining;
  })();
  const distanceGap = Math.max(0, frame.botX - frame.playerX);
  const botColor = settings.theme === "Cyberpunk" ? "#ff2b93" : settings.theme === "Minimalist" ? "#f04444" : "#ff315d";
  const themeClass = `theme-${settings.theme.toLowerCase()}`;
  const lastScore = scores[0];
  const activeMap = getMap(selectedMap);
  const briefingKinds = Array.from(new Set((hazardSnapshot?.items ?? []).map((hazard) => hazard.kind)));

  if (phase === "lobby") {
    return (
      <main className={`app-shell lobby ${themeClass} map-skin-${selectedMap}`} style={{ "--player-color": settings.color, "--map-accent": activeMap.accent } as CSSProperties}>
        <div className="lobby-backdrop" aria-hidden="true">
          <MapAtmosphere mapId={selectedMap} />
          <div className="grid-plane"/>
          <div className="velocity-lines">{Array.from({ length: 12 }, (_, index) => <i key={index}/>)}</div>
          <div className="center-flare"/>
        </div>
        <header className="topbar">
          <div className="brand-mark"><i>V</i><span>VELOCITY<br/>CRASH</span></div>
          <div className="topbar-actions">
            <div className="coin-pill"><Icon name="coin" size={16} /> {coins.toLocaleString()} <span>{t(lang, "coins")}</span></div>
            <button className="text-button" onClick={() => setShowGarage(true)}><Icon name="garage"/> {t(lang, "garage")}</button>
            <button className="text-button" onClick={() => setShowScores(true)}><Icon name="trophy"/> {t(lang, "records")}</button>
            <div className="lang-toggle" role="group" aria-label={t(lang, "language")}>
              <button type="button" className={lang === "en" ? "is-selected" : ""} onClick={() => setLang("en")}>EN</button>
              <button type="button" className={lang === "de" ? "is-selected" : ""} onClick={() => setLang("de")}>DE</button>
            </div>
            <button className="icon-button" onClick={toggleAudio} aria-label={audioEnabled ? t(lang, "mute") : t(lang, "unmute")}><Icon name={audioEnabled ? "sound" : "mute"}/></button>
          </div>
        </header>

        <section className="lobby-composition">
          <div className="hero-copy">
            <span className="eyebrow">{t(lang, "tagline")}</span>
            <h1><span>VELOCITY</span><span>CRASH</span></h1>
            <p>{t(lang, "hook")}</p>
            <button className="play-button" onClick={launchMatch}><span>{t(lang, "play")}</span><Icon name="play" size={26}/></button>
            <div className="control-hint"><kbd>SPACE</kbd><span>{t(lang, "controlHint")}</span></div>
            <div className="selected-loadout">
              <span>{mapName(lang, selectedMap)}</span>
              <i />
              <span>{paintName(lang, selectedPaint)}</span>
            </div>
          </div>
          <div className="hero-duel" aria-hidden="true">
            <div className="duel-line duel-line-left"/><div className="duel-node"><i/></div><div className="duel-line duel-line-right"/>
            <span className="duel-arrow duel-arrow-left">&gt;&gt;</span><span className="duel-arrow duel-arrow-right">&lt;&lt;</span>
          </div>
        </section>

        <section className={`setup-panel ${settingsOpen ? "is-open" : ""}`}>
          <button className="setup-heading" onClick={() => setSettingsOpen((value) => !value)} aria-expanded={settingsOpen}>
            <span><i/> {t(lang, "matchSetup")}</span><b>{settings.difficulty} / {settings.speed} / {settings.map}</b><em>{settingsOpen ? t(lang, "hide") : t(lang, "edit")}</em>
          </button>
          {settingsOpen && (
            <div className="settings-body">
              <div className="settings-columns">
                <div>
                  <SegmentedSetting label={t(lang, "difficulty")} note={DIFFICULTY_LABEL[settings.difficulty]} value={settings.difficulty} options={["Easy", "Medium", "Hard", "Impossible"] as const} onChange={(value) => changeSetting("difficulty", value)}/>
                  <SegmentedSetting label={t(lang, "arenaSpeed")} value={settings.speed} options={["Slow", "Normal", "Fast", "Turbo"] as const} onChange={(value) => changeSetting("speed", value)}/>
                  <SegmentedSetting label={t(lang, "mapSize")} value={settings.map} options={["Small", "Medium", "Large"] as const} onChange={(value) => changeSetting("map", value)}/>
                </div>
                <div>
                  <SegmentedSetting label={t(lang, "botStyle")} value={settings.botStyle} options={["Aggressive", "Tactical", "Unpredictable"] as const} onChange={(value) => changeSetting("botStyle", value)}/>
                  <SegmentedSetting label={t(lang, "visualTheme")} value={settings.theme} options={["Neon", "Minimalist", "Cyberpunk"] as const} onChange={(value) => changeSetting("theme", value)}/>
                  <SegmentedSetting
                    label={t(lang, "hazardTutorials")}
                    note={t(lang, "tutorialHint")}
                    value={hazardTutorials ? "on" : "off"}
                    options={["on", "off"] as const}
                    optionLabels={{ on: t(lang, "tutorialOn"), off: t(lang, "tutorialOff") }}
                    onChange={(value) => {
                      const enabled = value === "on";
                      setHazardTutorials(enabled);
                      saveHazardTutorials(enabled);
                      tone(430, 0.045, "sine", 0.025, 520);
                    }}
                  />
                  <div className="setting-row color-setting">
                    <div className="setting-label"><span>{t(lang, "playerColor")}</span><small>{settings.color.toUpperCase()}</small></div>
                    <div className="color-options">
                      {availableSetupColors.map((color) => {
                        const paint = getPaintByHex(color);
                        return (
                          <button
                            key={color}
                            aria-label={`Select ${color}`}
                            className={settings.color === color ? "is-selected" : ""}
                            style={{ background: color }}
                            onClick={() => {
                              changeSetting("color", color);
                              if (paint) setSelectedPaint(paint.id);
                            }}
                          />
                        );
                      })}
                      <button type="button" className="color-more" onClick={() => { setGarageTab("paints"); setShowGarage(true); }}>+ {t(lang, "garage")}</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="settings-summary">
                <span>{t(lang, "lockedIn")}</span>
                <p>{t(lang, "lockedInCopy", {
                  difficulty: settings.difficulty,
                  style: settings.botStyle.toLowerCase(),
                  speed: settings.speed.toLowerCase(),
                  map: settings.map.toLowerCase(),
                })}</p>
                <div>{lastScore ? <>{t(lang, "localBest")} <b>{lastScore.score.toLocaleString()}</b></> : <>{t(lang, "noRecord")} <b>{t(lang, "beFirst")}</b></>}</div>
              </div>
            </div>
          )}
        </section>
        {showScores && <ScoreModal scores={scores} onClose={() => setShowScores(false)} lang={lang} />}
        {showGarage && (
          <GarageModal
            lang={lang}
            coins={coins}
            unlockedMaps={unlockedMaps}
            unlockedPaints={unlockedPaints}
            selectedMap={selectedMap}
            selectedPaint={selectedPaint}
            tab={garageTab}
            onTab={setGarageTab}
            onSelectMap={setSelectedMap}
            onSelectPaint={selectPaint}
            onUnlockMap={unlockMap}
            onUnlockPaint={unlockPaint}
            onClose={() => setShowGarage(false)}
          />
        )}
      </main>
    );
  }

  const collisionWidth = (50 - MAP_BOUNDARY[settings.map]) * 2;
  const outcomeTitle = result?.outcome === "win" ? t(lang, "victory") : result?.outcome === "draw" ? t(lang, "deadHeat") : t(lang, "defeat");
  const hazardItems = hazardSnapshot?.items ?? gameRef.current?.hazards.items ?? [];

  return (
    <main
      className={`app-shell game-screen ${themeClass} map-skin-${selectedMap} phase-${phase} ${shaking ? "screen-shake" : ""} ${playerRisk > 0.92 && !frame.playerBraking ? "danger-window" : playerRisk > 0.58 && !frame.playerBraking ? "brake-window" : ""} ${frame.playerSlide ? "is-sliding-view" : ""}`}
      style={{ "--player-color": settings.color, "--bot-color": botColor, "--map-accent": activeMap.accent } as CSSProperties}
      onPointerDown={handleArenaPointer}
    >
      <div className="game-backdrop" aria-hidden="true">
        <MapAtmosphere mapId={selectedMap} />
        <div className="grid-plane"/>
        <div className="road-lines">{Array.from({ length: 9 }, (_, index) => <i key={index}/>)}</div>
      </div>

      <header className="game-hud">
        <div className="hud-score">
          <span>{t(lang, "score")}</span>
          <strong>{score.toLocaleString()}</strong>
          <small>{streak > 1 ? `${streak}X ${t(lang, "streak")}` : t(lang, "liveRun")}</small>
        </div>
        <div className="hud-timer">
          <span>{t(lang, "matchTime")}</span>
          <strong>{frame.elapsed.toFixed(1)}</strong>
          <em>{mapName(lang, selectedMap)}</em>
        </div>
        <div className="hud-controls">
          <div className="coin-pill compact"><Icon name="coin" size={14} /> {coins.toLocaleString()}</div>
          <span>{settings.difficulty.toUpperCase()} // {settings.speed.toUpperCase()}</span>
          <button className="icon-button" onPointerDown={(event) => event.stopPropagation()} onClick={pauseGame} aria-label={t(lang, "pause")}><Icon name="pause"/></button>
        </div>
      </header>

      <div className="distance-meter">
        <div className="distance-meta"><span>{t(lang, "closingDistance")}</span><b>{Math.max(0, Math.round((distanceGap / 85) * 100))}% {t(lang, "gap")}</b></div>
        <div className="distance-track"><i style={{ width: `${Math.max(0, Math.min(100, (distanceGap / 85) * 100))}%` }}/></div>
      </div>

      <section className="arena" aria-label="Velocity Crash arena">
        <div className="collision-zone" style={{ width: `${collisionWidth}%` }}><span>COLLISION PLANE</span><i/><i/></div>
        <div className="center-axis"><i/><span>0</span></div>
        <div className="lane lane-top"/><div className="lane lane-bottom"/>
        <HazardLayer hazards={hazardItems} />
        <Vehicle side="player" x={frame.playerX} velocity={frame.playerVelocity} color={settings.color} braking={frame.playerBraking} crashed={frame.playerCrashed} sliding={frame.playerSlide} label={t(lang, "you")}/>
        <Vehicle side="bot" x={frame.botX} velocity={frame.botVelocity} color={botColor} braking={frame.botBraking} crashed={frame.botCrashed} sliding={frame.botSlide} label={t(lang, "bot")}/>
        {bursts.map((burst) => <ParticleBurst key={burst.id} burst={burst}/>)}
      </section>

      <div className="velocity-readout velocity-player"><span>{t(lang, "you")}</span><b>{Math.round(frame.playerVelocity * 8.4)}</b><small>KM/H</small><i style={{ width: `${Math.min(100, (frame.playerVelocity / MAX_VELOCITY) * 100)}%` }}/></div>
      <div className="velocity-readout velocity-bot"><span>{t(lang, "bot")}</span><b>{Math.round(frame.botVelocity * 8.4)}</b><small>KM/H</small><i style={{ width: `${Math.min(100, (frame.botVelocity / MAX_VELOCITY) * 100)}%` }}/></div>

      {(phase === "racing" || phase === "countdown") && (
        <div className={`brake-prompt ${frame.playerBraking ? "is-active" : ""}`}>
          <span>{frame.playerBraking ? t(lang, "brakesEngaged") : playerRisk > 0.92 ? t(lang, "brakeNow") : playerRisk > 0.58 ? t(lang, "windowOpen") : t(lang, "holdNerve")}</span>
          <b>{frame.playerBraking ? t(lang, "decelerating") : t(lang, "tapToBrake")}</b>
        </div>
      )}

      {phase === "countdown" && <div className="countdown" key={countdown}><span>{countdown}</span><small>{countdown === "GO" ? t(lang, "fullThrottle") : t(lang, "systemArmed")}</small></div>}
      {phase === "replay" && <div className="replay-label"><i/> {t(lang, "slowMo")}</div>}

      {phase === "briefing" && (
        <HazardBriefing
          lang={lang}
          difficulty={settings.difficulty}
          kinds={briefingKinds}
          onContinue={continueFromBriefing}
        />
      )}

      {phase === "paused" && (
        <div className="modal-backdrop game-modal" onPointerDown={(event) => event.stopPropagation()}>
          <section className="pause-panel">
            <span className="eyebrow">{t(lang, "raceInterrupted")}</span><h2>{t(lang, "paused")}</h2><p>{t(lang, "pauseCopy")}</p>
            <button className="primary-action" onClick={resumeGame}><Icon name="play"/> {t(lang, "resume")}</button>
            <button className="secondary-button" onClick={launchMatch}><Icon name="restart"/> {t(lang, "restartMatch")}</button>
            <button className="text-button" onClick={returnToLobby}><Icon name="back"/> {t(lang, "changeSettings")}</button>
          </section>
        </div>
      )}

      {phase === "result" && result && (
        <div className={`outcome-wrap outcome-${result.outcome}`} onPointerDown={(event) => event.stopPropagation()}>
          {result.outcome === "win" && <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--x": `${(index * 43) % 100}%`, "--delay": `${(index % 8) * 90}ms`, "--color": index % 3 === 0 ? settings.color : index % 3 === 1 ? "#ffffff" : "#ffd43b" } as CSSProperties}/>)}</div>}
          <section className="outcome-panel">
            <span className="outcome-kicker">
              {result.outcome === "win"
                ? `+${result.earned} ${t(lang, "points")}`
                : result.outcome === "draw"
                  ? t(lang, "timingMatched")
                  : t(lang, "collisionLogged")}
            </span>
            <h2>{outcomeTitle}</h2>
            {result.outcome === "win" && result.coinsEarned > 0 && (
              <div className="coin-reward-banner">
                <Icon name="coin" size={22} />
                <div>
                  <span>{t(lang, "coinsEarned")}</span>
                  <strong>+{result.coinsEarned} {t(lang, "coins")}</strong>
                </div>
              </div>
            )}
            <p>{result.reason}</p>
            <div className="result-stats">
              <div><span>{t(lang, "yourBrake")}</span><strong>{formatTime(result.playerBrake, lang)}</strong></div>
              <div><span>{t(lang, "botBrake")}</span><strong>{formatTime(result.botBrake, lang)}</strong></div>
              <div><span>{t(lang, "distanceClosed")}</span><strong>{Math.round(result.closed)}%</strong></div>
              <div><span>{t(lang, "difficultyShort")}</span><strong>{settings.difficulty}</strong></div>
            </div>

            <button className="watch-replay-featured" onClick={watchReplay}>
              <Icon name="replay" size={28} />
              <span>
                <b>{t(lang, "watchReplay")}</b>
                <small>{t(lang, "watchReplaySub")}</small>
              </span>
            </button>

            <div className="outcome-actions">
              <button className="primary-action replay-action" onClick={launchMatch}><Icon name="restart" size={22}/><span>{t(lang, "replaySame")}<small>{t(lang, "sameSettings")}</small></span></button>
              <button className="secondary-button" onClick={returnToLobby}><Icon name="back"/> {t(lang, "changeSettings")}</button>
            </div>
            <small className="result-shortcut">{t(lang, "pressR")}</small>
          </section>
        </div>
      )}
      <Analytics />
      <SpeedInsights />
    </main>
  );
}
