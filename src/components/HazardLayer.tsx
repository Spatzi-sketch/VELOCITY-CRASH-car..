import type { TrackHazard } from "../game/hazards";

export function HazardLayer({ hazards, playerY = 58 }: { hazards: TrackHazard[]; playerY?: number }) {
  if (!hazards.length) return null;
  return (
    <div className="hazard-layer" aria-hidden="true">
      {hazards.map((hazard) => (
        <div
          key={hazard.id}
          className={`track-hazard hazard-${hazard.kind} ${hazard.active ? "is-active" : "is-inactive"} lane-${hazard.lane}`}
          style={{
            left: `${hazard.x}%`,
            width: `${Math.max(1.8, hazard.width)}%`,
            top: hazard.lane === "bot" ? "28%" : hazard.lane === "both" ? "42%" : `${playerY}%`,
          }}
        >
          <span />
        </div>
      ))}
    </div>
  );
}
