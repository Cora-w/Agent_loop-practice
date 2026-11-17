import type { CaseData, Judgement, PoolCard, Puzzle } from "../types";

interface Props {
  caseData: CaseData;
  puzzle: Puzzle;
  judgement: Judgement;
}

function CardList({ label, cards, empty }: { label: string; cards: PoolCard[]; empty: string }) {
  return (
    <div className="use-group">
      <div className="use-label">
        {label} <em>{cards.length}</em>
      </div>
      {cards.length ? (
        <ul className="use-list">
          {cards.map((pc) => (
            <li key={pc.card.id}>{pc.card.title}</li>
          ))}
        </ul>
      ) : (
        <p className="use-empty">{empty}</p>
      )}
    </div>
  );
}

export default function VerdictCard({ puzzle, judgement: j }: Props) {
  const trueGiven = puzzle.cards.filter((pc) => pc.role === "true").length;
  const decoyGiven = puzzle.cards.filter((pc) => pc.role === "decoy").length;

  const headline = !j.accused ? "虚实难辨" : j.correct ? "去虚存实" : "以虚为实";
  const sub = !j.accused ? "AI 没能说出一个名字" : j.correct ? "AI 识破了你布下的虚" : "AI 把虚当成了实";
  const score = j.score;
  const dims: [string, number][] = score
    ? [
        ["动机", score.motive],
        ["机会", score.opportunity],
        ["证据", score.evidence],
        ["排除他人", score.exclusion],
      ]
    : [];

  return (
    <div className={`verdict ${j.correct ? "is-correct" : "is-wrong"}`}>
      <div className="verdict-top">
        <div>
          <div className="verdict-stamp">{headline}</div>
          <div className="verdict-sub">{sub}</div>
        </div>
        {score && !score.failed && (
          <div className="verdict-grade">
            <span className="grade-letter">{score.total}</span>
            <span className="grade-total">推理链 / 100</span>
          </div>
        )}
      </div>

      {/* 1. 凶手是否选对 */}
      <div className="verdict-compare">
        <div>
          <span className="verdict-label">你定下的真凶</span>
          <span className="verdict-name">{j.culprit}</span>
        </div>
        <div>
          <span className="verdict-label">AI 指认</span>
          <span className="verdict-name verdict-ai-name">{j.accused ?? "未指认"}</span>
        </div>
      </div>

      {/* 2. 证据是否用对 */}
      <div className="verdict-section">
        <div className="verdict-label">
          证据使用 · 实线索用到 {j.citedTrue.length}/{trueGiven}，虚线索引用 {j.citedDecoy.length}/{decoyGiven}
        </div>
        <div className="use-grid">
          <CardList label="用对的实线索" cards={j.citedTrue} empty="没有用上任何实线索" />
          <CardList
            label={j.correct ? "提到的虚线索（已识破）" : "被虚线索带偏"}
            cards={j.citedDecoy}
            empty={j.correct ? "没有提到虚线索" : "没有引用虚线索"}
          />
          <CardList label="漏掉的实线索" cards={j.missedTrue} empty="实线索全部用上了" />
          <CardList label="引用的中性材料" cards={j.citedNeutral} empty="—" />
        </div>
      </div>

      {/* 3. 推理链评分 */}
      {score && (
        <div className="verdict-section">
          <div className="verdict-label">推理链评分</div>
          {!score.failed && (
            <div className="score-table">
              {dims.map(([label, v]) => (
                <div key={label} className="score-line">
                  <span className="score-label">{label}</span>
                  <span className="score-bar">
                    <i style={{ width: `${(v / 25) * 100}%` }} />
                  </span>
                  <span className="score-num">
                    {v}
                    <em>/25</em>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="verdict-text">{score.comment}</p>
        </div>
      )}

      <div className="verdict-section verdict-truth">
        <div className="verdict-label">{j.accused ? "AI 的推理" : "AI 最后的说法"}</div>
        <p className="verdict-text">{j.reasoning || "（AI 在步数上限内没有给出指认）"}</p>
      </div>
    </div>
  );
}
