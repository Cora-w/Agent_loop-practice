import type { CaseData } from "../types";

interface Props {
  caseData: CaseData;
  /** 出题人设定的凶手 */
  culprit: string;
  /** AI 指认的人 */
  accused: string | null;
}

export default function CasePanel({ caseData, culprit, accused }: Props) {
  return (
    <div className="case-panel">
      <section className="panel-block">
        <div className="panel-label">案情卷宗</div>
        <h2 className="panel-case-title">{caseData.title}</h2>
        <dl className="panel-facts">
          <div>
            <dt>时间</dt>
            <dd>{caseData.time}</dd>
          </div>
          <div>
            <dt>地点</dt>
            <dd>{caseData.location}</dd>
          </div>
        </dl>
        <p className="panel-brief">{caseData.brief}</p>
      </section>

      <section className="panel-block">
        <div className="panel-label">
          嫌疑人 <span className="panel-count">{caseData.suspects.length}</span>
        </div>
        <ul className="suspect-list">
          {caseData.suspects.map((s) => {
            const isCulprit = s.name === culprit;
            const isAccused = s.name === accused;
            return (
              <li
                key={s.id}
                className={`suspect-card ${isAccused ? "is-accused" : ""} ${isCulprit && !isAccused ? "is-culprit" : ""}`}
              >
                <div className="suspect-avatar" aria-hidden="true">
                  {s.name.charAt(0)}
                </div>
                <div className="suspect-body">
                  <div className="suspect-name-row">
                    <span className="suspect-name">{s.name}</span>
                    {isCulprit && <span className="culprit-tag">你设定的凶手</span>}
                    {isAccused && <span className="accused-tag">AI 指认</span>}
                  </div>
                  <div className="suspect-role">{s.role}</div>
                  <div className="suspect-info">{s.info}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
