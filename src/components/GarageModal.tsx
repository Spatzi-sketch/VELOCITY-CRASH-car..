import type { CSSProperties } from "react";
import { ARENA_MAPS, PAINTS, getPaint, type ArenaMapId, type Language, type PaintId } from "../game/content";
import { mapDesc, mapName, paintName, t } from "../game/i18n";
import { MapAtmosphere } from "./MapAtmosphere";

interface GarageModalProps {
  lang: Language;
  coins: number;
  unlockedMaps: ArenaMapId[];
  unlockedPaints: PaintId[];
  selectedMap: ArenaMapId;
  selectedPaint: PaintId;
  tab: "maps" | "paints";
  onTab: (tab: "maps" | "paints") => void;
  onSelectMap: (id: ArenaMapId) => void;
  onSelectPaint: (id: PaintId) => void;
  onUnlockMap: (id: ArenaMapId) => void;
  onUnlockPaint: (id: PaintId) => void;
  onClose: () => void;
}

function ShowroomVehicle({ color }: { color: string }) {
  return (
    <div className="showroom-vehicle" style={{ "--showroom-color": color } as CSSProperties}>
      <div className="showroom-light left" />
      <div className="showroom-light right" />
      <svg viewBox="0 0 420 180" role="img" aria-label="Selected Velocity Crash vehicle">
        <defs>
          <linearGradient id="garageBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="white" stopOpacity=".72" />
            <stop offset=".22" stopColor={color} />
            <stop offset="1" stopColor={color} stopOpacity=".22" />
          </linearGradient>
          <linearGradient id="garageGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity=".82" />
            <stop offset="1" stopColor="#0a1822" stopOpacity=".94" />
          </linearGradient>
        </defs>
        <ellipse className="showroom-shadow" cx="210" cy="150" rx="166" ry="18" />
        <path className="showroom-glow" d="M24 112 76 48h186l133 55-44 42H82L24 112Z" />
        <path className="showroom-body" d="M24 112 76 48h186l133 55-44 42H82L24 112Z" fill="url(#garageBody)" />
        <path className="showroom-glass" d="m94 58 153 2 67 38-245-2 25-38Z" fill="url(#garageGlass)" />
        <path className="showroom-divider" d="m207 60 13 37M68 103h319M112 112h158l-28 24H84l28-24Z" />
        <path className="showroom-core" d="M112 112h158l-28 24H84l28-24Z" />
        <path className="showroom-lightbar" d="m303 103 79 2-22 12h-64l7-14Z" />
      </svg>
      <div className="showroom-platform"><i /><span /></div>
    </div>
  );
}

export function GarageModal({
  lang,
  coins,
  unlockedMaps,
  unlockedPaints,
  selectedMap,
  selectedPaint,
  tab,
  onTab,
  onSelectMap,
  onSelectPaint,
  onUnlockMap,
  onUnlockPaint,
  onClose,
}: GarageModalProps) {
  const selectedPaintDef = getPaint(selectedPaint);

  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={onClose}>
      <section className="garage-modal" role="dialog" aria-modal="true" aria-labelledby="garage-title" onPointerDown={(event) => event.stopPropagation()}>
        <div className="modal-heading garage-heading">
          <div>
            <span className="eyebrow">{t(lang, "garage")}</span>
            <h2 id="garage-title">{t(lang, "garageTitle")}</h2>
            <p>{t(lang, "garageSub")}</p>
          </div>
          <div className="garage-heading-side">
            <div className="coin-pill large"><i /> {coins.toLocaleString()} <span>{t(lang, "coins")}</span></div>
            <button className="icon-button" onClick={onClose} aria-label={t(lang, "close")}>X</button>
          </div>
        </div>

        <div className="garage-tabs">
          <button type="button" className={tab === "maps" ? "is-selected" : ""} onClick={() => onTab("maps")}>{t(lang, "maps")}</button>
          <button type="button" className={tab === "paints" ? "is-selected" : ""} onClick={() => onTab("paints")}>{t(lang, "paints")}</button>
        </div>

        {tab === "maps" ? (
          <>
            <div className="garage-map-showcase">
              <MapAtmosphere mapId={selectedMap} />
              <div className="showcase-road"><i /><span /></div>
              <div className="showcase-vignette" />
              <div className="showcase-copy">
                <span>{t(lang, "currentArena")}</span>
                <h3>{mapName(lang, selectedMap)}</h3>
                <p>{mapDesc(lang, selectedMap)}</p>
              </div>
              <div className="showcase-status">{t(lang, "selected")}</div>
            </div>

            <div className="collection-heading">
              <span>{t(lang, "collection")}</span>
              <b>{unlockedMaps.length} / {ARENA_MAPS.length}</b>
            </div>
            <div className="garage-grid maps-grid">
              {ARENA_MAPS.map((map) => {
                const owned = unlockedMaps.includes(map.id);
                const selected = selectedMap === map.id;
                return (
                  <article key={map.id} className={`map-card ${owned ? "is-owned" : "is-locked"} ${selected ? "is-selected" : ""}`}>
                    <div className="map-card-preview">
                      <MapAtmosphere mapId={map.id} compact />
                      <div className="preview-road"><i /></div>
                      {!owned && <div className="lock-badge">{t(lang, "locked")}</div>}
                      {map.free && <div className="starter-badge">{t(lang, "starter")}</div>}
                      <strong>{mapName(lang, map.id)}</strong>
                    </div>
                    <div className="map-card-body">
                      <div className="map-card-title">
                        <h3>{mapName(lang, map.id)}</h3>
                        {owned ? <span className="owned-tag">{t(lang, "owned")}</span> : <span className="price-tag"><i /> {map.price} {t(lang, "coins")}</span>}
                      </div>
                      <p>{mapDesc(lang, map.id)}</p>
                      {owned ? (
                        <button type="button" className={`primary-action ${selected ? "is-quiet" : ""}`} onClick={() => onSelectMap(map.id)}>{selected ? t(lang, "selected") : t(lang, "select")}</button>
                      ) : (
                        <button type="button" className="secondary-button" disabled={coins < map.price} onClick={() => onUnlockMap(map.id)}>
                          {coins < map.price ? t(lang, "notEnough") : `${t(lang, "unlock")} · ${map.price} ${t(lang, "coins")}`}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="garage-showroom">
              <MapAtmosphere mapId={selectedMap} compact />
              <div className="showroom-grid" />
              <div className="showroom-copy">
                <span>{t(lang, "vehiclePreview")}</span>
                <h3>{paintName(lang, selectedPaint)}</h3>
                <b>{t(lang, "selected")}</b>
              </div>
              <ShowroomVehicle color={selectedPaintDef.hex} />
            </div>

            <div className="collection-heading">
              <span>{t(lang, "paintShop")}</span>
              <b>{unlockedPaints.length} / {PAINTS.length}</b>
            </div>
            <div className="garage-grid paints-grid">
              {PAINTS.map((paint) => {
                const owned = unlockedPaints.includes(paint.id);
                const selected = selectedPaint === paint.id;
                return (
                  <article key={paint.id} className={`paint-card ${owned ? "is-owned" : "is-locked"} ${selected ? "is-selected" : ""}`}>
                    <div className="paint-swatch" style={{ "--swatch": paint.hex } as CSSProperties}>
                      <span />
                      {paint.rare && <em>{t(lang, "rare")}</em>}
                    </div>
                    <div className="paint-card-body">
                      <h3>{paintName(lang, paint.id)}</h3>
                      <div className="map-card-meta">
                        {owned
                          ? <span className="owned-tag">{t(lang, "owned")}</span>
                          : <span className="price-tag"><i /> {paint.price || t(lang, "free")} {paint.price > 0 ? t(lang, "coins") : ""}</span>}
                      </div>
                      {owned ? (
                        <button type="button" className={`primary-action ${selected ? "is-quiet" : ""}`} onClick={() => onSelectPaint(paint.id)}>{selected ? t(lang, "selected") : t(lang, "select")}</button>
                      ) : (
                        <button type="button" className="secondary-button" disabled={coins < paint.price} onClick={() => onUnlockPaint(paint.id)}>
                          {coins < paint.price ? t(lang, "notEnough") : `${t(lang, "unlock")} · ${paint.price}`}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}