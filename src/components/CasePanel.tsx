import { useEffect, useRef } from "react";
import type { CaseData } from "../types";

interface Props {
  caseData: CaseData;
  accused: string | null;
  selected: string;
  onSelect: (id: string) => void;
  interrogated: string[];
  unlocked: string[];
  selectable: boolean;
}

export default function CasePanel({ caseData, accused, selected, onSelect, interrogated, unlocked, selectable }: Props) {
  const accusedRef = useRef<HTMLLIElement>(null);

  // 指认后把被指认的嫌疑人卡片滚动到可见区域
  useEffect(() => {
    if (accused) accusedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [accused]);

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
          {selectable && <span className="panel-tip">点击选择审讯对象</span>}
        </div>
        <ul className="suspect-list">
          {caseData.suspects.map((s) => {
            const isAccused = accused === s.name;
            const total = caseData.hiddenClues.filter((h) => h.suspectId === s.id).length;
            const got = caseData.hiddenClues.filter((h) => h.suspectId === s.id && unlocked.includes(h.id)).length;
            const asked = interrogated.includes(s.id);
            return (
              <li
                key={s.id}
                ref={isAccused ? accusedRef : undefined}
                className={`suspect-card ${isAccused ? "is-accused" : ""} ${
                  selectable && selected === s.id ? "is-selected" : ""
                } ${selectable ? "is-selectable" : ""}`}
                onClick={() => selectable && onSelect(s.id)}
              >
                <div className="suspect-avatar" aria-hidden="true">
                  {s.name.charAt(0)}
                </div>
                <div className="suspect-body">
                  <div className="suspect-name-row">
                    <span className="suspect-name">{s.name}</span>
                    {isAccused && <span className="accused-tag">被指认</span>}
                  </div>
                  <div className="suspect-role">{s.role}</div>
                  <div className="suspect-info">{s.info}</div>
                  {selectable && (
                    <div className="suspect-progress">
                      <span className={asked ? "is-on" : ""}>{asked ? "已审问" : "未审问"}</span>
                      <span className={got ? "is-on" : ""}>
                        供述 {got}/{total}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
