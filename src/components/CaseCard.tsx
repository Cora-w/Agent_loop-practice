import type { CaseData } from "../types";
import { poolSize } from "../lib/pool";

interface Props {
  caseData: CaseData;
  index: number;
  onClick: () => void;
}

export default function CaseCard({ caseData, index, onClick }: Props) {
  const stars = Array.from(caseData.difficulty);

  return (
    <button
      className="case-card"
      onClick={onClick}
      style={{ animationDelay: `${index * 0.08}s` }}
      aria-label={`进入案件：${caseData.title}`}
    >
      <div className="case-card-top">
        <div className="case-icon">{caseData.icon}</div>
        <div className="case-card-heading">
          <span className="case-file-no">CASE FILE · {String(index + 1).padStart(3, "0")}</span>
          <h3 className="case-title">{caseData.title}</h3>
          <div className="case-difficulty">
            <span className="case-difficulty-label">难度</span>
            {stars.map((s, i) => (
              <span key={i} className={s === "★" ? "star filled" : "star"}>
                ★
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="case-tagline">{caseData.tagline}</p>
      <p className="case-brief">{caseData.brief}</p>

      <div className="case-meta">
        <div className="case-meta-item">
          <span className="meta-label">时间</span>
          <span className="meta-value">{caseData.time}</span>
        </div>
        <div className="case-meta-item">
          <span className="meta-label">地点</span>
          <span className="meta-value">{caseData.location}</span>
        </div>
        <div className="case-meta-item">
          <span className="meta-label">嫌疑人</span>
          <span className="meta-value">
            {caseData.suspects.length} 人 · 每种设局卡池 {poolSize(caseData)} 张
          </span>
        </div>
      </div>

      <span className="case-enter">开始出题</span>
    </button>
  );
}
