import { useState } from "react";
import type { HazardDifficulty } from "../game/hazards";
import type { HazardKind, Language } from "../game/content";
import { hazardBody, hazardTitle, t } from "../game/i18n";

interface HazardBriefingProps {
  lang: Language;
  difficulty: HazardDifficulty;
  kinds: HazardKind[];
  onContinue: (dontShowAgain: boolean) => void;
}

export function HazardBriefing({ lang, difficulty, kinds, onContinue }: HazardBriefingProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="modal-backdrop game-modal hazard-briefing-wrap" onPointerDown={(event) => event.stopPropagation()}>
      <section className="hazard-briefing" role="dialog" aria-modal="true">
        <span className="eyebrow">{t(lang, "hazardBriefing")}</span>
        <h2>{difficulty === "Impossible" ? t(lang, "impossibleBriefTitle") : t(lang, "hardBriefTitle")}</h2>
        <p className="hazard-lead">
          {difficulty === "Impossible" ? t(lang, "impossibleBriefLead") : t(lang, "hardBriefLead")}
        </p>
        <div className="hazard-list">
          {kinds.map((kind) => (
            <article key={kind} className={`hazard-item hazard-${kind}`}>
              <div className="hazard-icon" aria-hidden="true" />
              <div>
                <h3>{hazardTitle(lang, kind)}</h3>
                <p>{hazardBody(lang, kind)}</p>
              </div>
            </article>
          ))}
        </div>
        <label className="tutorial-choice">
          <input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />
          <span aria-hidden="true" />
          <b>{t(lang, "dontShowAgain")}</b>
        </label>
        <button type="button" className="primary-action hazard-continue" onClick={() => onContinue(dontShowAgain)}>
          {t(lang, "hazardContinue")}
        </button>
      </section>
    </div>
  );
}
