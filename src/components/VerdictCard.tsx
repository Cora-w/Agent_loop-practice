import type { CaseData, ToolResult, Verdict } from "../types";

interface Props {
  caseData: CaseData;
  verdict: Verdict;
  recommendation: ToolResult | null;
}

export default function VerdictCard({ caseData, verdict, recommendation }: Props) {
  const { correct } = verdict;

  return (
    <div className={`verdict ${correct ? "is-correct" : "is-wrong"}`}>
      <div className="verdict-top">
        <div>
          <div className="verdict-stamp">{correct ? "破案成功" : "指认错误"}</div>
          <div className="verdict-sub">{correct ? "CASE CLOSED" : "WRONG ACCUSATION"}</div>
        </div>
        <div className="verdict-grade">
          <span className="grade-letter">{verdict.grade}</span>
          <span className="grade-total">{verdict.total} 分</span>
        </div>
      </div>

      <div className="verdict-row">
        <span className="verdict-label">你指认</span>
        <span className="verdict-name">{verdict.accused}</span>
        {recommendation && (
          <span className="verdict-ai">
            AI 建议：{recommendation.accused}
            {recommendation.accused === verdict.accused ? "（一致）" : "（不同）"}
          </span>
        )}
      </div>

      <div className="score-table">
        {verdict.breakdown.map((l) => (
          <div key={l.label} className="score-line">
            <span className="score-label">{l.label}</span>
            <span className="score-bar">
              <i style={{ width: `${l.max ? (l.points / l.max) * 100 : 0}%` }} />
            </span>
            <span className="score-num">
              {l.points}
              <em>/{l.max}</em>
            </span>
          </div>
        ))}
      </div>

      <div className="verdict-section">
        <div className="verdict-label">评审点评</div>
        <p className="verdict-text">{verdict.judgeComment}</p>
      </div>

      <div className="verdict-section">
        <div className="verdict-label">你的推理</div>
        <p className="verdict-text">{verdict.reasoning}</p>
      </div>

      <div className="verdict-section verdict-truth">
        <div className="verdict-label">案件真相 · 真凶：{caseData.truth.culprit}</div>
        <p className="verdict-text">{caseData.truth.reasoning}</p>
      </div>
    </div>
  );
}
