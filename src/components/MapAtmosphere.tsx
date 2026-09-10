import type { CSSProperties } from "react";
import { getMap, type ArenaMapId } from "../game/content";

function Repeated({ count, className, offset = 0 }: { count: number; className: string; offset?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={`${className}-${index}`}
          className={className}
          style={{
            "--item": index,
            "--left": `${offset + (index * (86 / Math.max(1, count - 1))) % 92}%`,
            "--height": `${32 + ((index * 19) % 48)}%`,
          } as CSSProperties}
        />
      ))}
    </>
  );
}

export function MapAtmosphere({ mapId, compact = false }: { mapId: ArenaMapId; compact?: boolean }) {
  const map = getMap(mapId);
  const style = {
    "--map-accent": map.accent,
    "--map-secondary": map.secondary,
    "--map-sky": map.sky,
    "--map-ground": map.ground,
    "--map-glow": map.glow,
    "--map-particle": map.particle,
  } as CSSProperties;

  return (
    <div className={`map-atmosphere map-${mapId} ${compact ? "is-compact" : ""}`} style={style} aria-hidden="true">
      <div className="map-sky" />
      <div className="map-celestial" />
      <div className="map-glow-orb" />

      <div className="scene-layer scene-far">
        {mapId === "cherry-blossom" && <><span className="scenery japan-mountain one"/><span className="scenery japan-mountain two"/><span className="scenery japan-mountain three"/><span className="scenery distant-haze"/></>}
        {mapId === "city" && <><Repeated count={compact ? 10 : 18} className="scenery city-tower far"/><span className="scenery city-haze"/></>}
        {mapId === "mountain" && <><span className="scenery alpine-peak one"/><span className="scenery alpine-peak two"/><span className="scenery alpine-peak three"/><span className="scenery cloud-bank"/></>}
        {mapId === "coastal" && <><span className="scenery ocean-horizon"/><span className="scenery coast-island one"/><span className="scenery coast-island two"/><span className="scenery sea-glint"/></>}
        {mapId === "desert" && <><span className="scenery desert-mesa one"/><span className="scenery desert-mesa two"/><span className="scenery desert-mesa three"/><span className="scenery heat-haze"/></>}
        {mapId === "snow" && <><span className="scenery snow-peak one"/><span className="scenery snow-peak two"/><span className="scenery snow-peak three"/><span className="scenery cold-haze"/></>}
        {mapId === "aurora" && <><span className="scenery aurora-ribbon one"/><span className="scenery aurora-ribbon two"/><span className="scenery star-field"/><span className="scenery aurora-ridge"/></>}
        {mapId === "neon-grid" && <><Repeated count={compact ? 8 : 14} className="scenery neon-spire"/><span className="scenery neon-horizon"/></>}
      </div>

      <div className="scene-layer scene-mid">
        {mapId === "cherry-blossom" && (
          <>
            <Repeated count={compact ? 3 : 6} className="scenery japanese-house" offset={8}/>
            <span className="scenery pagoda"><i/><i/><i/></span>
            <span className="scenery torii-gate"><i/><i/></span>
            <span className="scenery village-mist"/>
          </>
        )}
        {mapId === "city" && (
          <>
            <Repeated count={compact ? 8 : 15} className="scenery city-building mid" offset={3}/>
            <span className="scenery neon-sign one"/><span className="scenery neon-sign two"/>
            <span className="scenery skybridge"/>
          </>
        )}
        {mapId === "mountain" && <><span className="scenery rocky-ridge one"/><span className="scenery rocky-ridge two"/><Repeated count={compact ? 8 : 18} className="scenery pine-tree mid"/><span className="scenery mountain-lodge"/></>}
        {mapId === "coastal" && <><span className="scenery coastal-cliff left"/><span className="scenery coastal-cliff right"/><span className="scenery lighthouse"><i/></span><span className="scenery shoreline"/></>}
        {mapId === "desert" && <><span className="scenery dune one"/><span className="scenery dune two"/><span className="scenery rock-arch"/><Repeated count={compact ? 3 : 6} className="scenery desert-shrub" offset={8}/></>}
        {mapId === "snow" && <><span className="scenery snowy-ridge"/><Repeated count={compact ? 8 : 17} className="scenery pine-tree snow"/><span className="scenery snow-cabin"><i/></span></>}
        {mapId === "aurora" && <><Repeated count={compact ? 7 : 14} className="scenery crystal-pine"/><span className="scenery frozen-lake"/></>}
        {mapId === "neon-grid" && <><span className="scenery grid-city left"/><span className="scenery grid-city right"/><span className="scenery portal-ring"/></>}
      </div>

      <div className="scene-layer scene-near">
        {mapId === "cherry-blossom" && <><span className="scenery sakura-tree left"><i/><i/><i/></span><span className="scenery sakura-tree right"><i/><i/><i/></span><Repeated count={compact ? 3 : 7} className="scenery stone-lantern" offset={5}/></>}
        {mapId === "city" && <><Repeated count={compact ? 6 : 12} className="scenery street-light"/><span className="scenery city-rail"/></>}
        {mapId === "mountain" && <><Repeated count={compact ? 5 : 11} className="scenery pine-tree near"/><span className="scenery rock-face left"/><span className="scenery rock-face right"/></>}
        {mapId === "coastal" && <><span className="scenery palm-tree left"><i/><i/><i/></span><span className="scenery palm-tree right"><i/><i/><i/></span><span className="scenery beach-rocks"/></>}
        {mapId === "desert" && <><span className="scenery cactus left"><i/><i/></span><span className="scenery cactus right"><i/><i/></span><span className="scenery foreground-dune"/></>}
        {mapId === "snow" && <><Repeated count={compact ? 4 : 9} className="scenery snow-post"/><span className="scenery snow-bank"/></>}
        {mapId === "aurora" && <><span className="scenery ice-crystal left"/><span className="scenery ice-crystal right"/><span className="scenery ice-bank"/></>}
        {mapId === "neon-grid" && <><span className="scenery circuit-bank left"/><span className="scenery circuit-bank right"/><span className="scenery grid-flare"/></>}
      </div>

      <div className="weather-layer">
        {mapId === "cherry-blossom" && Array.from({ length: compact ? 7 : 15 }, (_, i) => <i key={i} className="petal" style={{ left: `${(i * 17) % 100}%`, animationDelay: `${(i % 7) * 0.48}s` }}/>) }
        {mapId === "snow" && Array.from({ length: compact ? 9 : 18 }, (_, i) => <i key={i} className="snowflake" style={{ left: `${(i * 13) % 100}%`, animationDelay: `${(i % 9) * 0.38}s` }}/>) }
        {mapId === "coastal" && <><i className="sea-bird one"/><i className="sea-bird two"/><i className="sea-bird three"/></>}
        {mapId === "desert" && <><i className="dust-stream one"/><i className="dust-stream two"/></>}
      </div>

      <div className="map-ground" />
      <div className="road-separation" />
      <div className="map-vignette" />
    </div>
  );
}