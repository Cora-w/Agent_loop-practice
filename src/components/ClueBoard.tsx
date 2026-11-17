import { useState } from "react";
import type { ClueItem } from "../types";
import type { ActionFeedback } from "../hooks/useAgentLoop";

interface Props {
  clues: ClueItem[];
  canMark: boolean;
  markedCount: number;
  totalContradictions: number;
  onMark: (a: string, b: string) => ActionFeedback;
}

const TYPE_LABEL: Record<ClueItem["type"], string> = {
  statement: "证词",
  evidence: "物证",
  confession: "供述",
  contradiction: "矛盾",
};

const markable = (c: ClueItem) => c.type === "statement" || c.type === "evidence";

export default function ClueBoard({ clues, canMark, markedCount, totalContradictions, onMark }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const count = (t: ClueItem["type"]) => clues.filter((c) => c.type === t).length;
  const markableCount = clues.filter(markable).length;

  const toggleMarking = () => {
    setMarking((m) => !m);
    setPicked([]);
    setFeedback(null);
  };

  const onCardClick = (c: ClueItem) => {
    if (marking && markable(c)) {
      setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : p.length >= 2 ? [p[1], c.id] : [...p, c.id]));
      return;
    }
    setOpenId(openId === c.id ? null : c.id);
  };

  const confirm = () => {
    if (picked.length !== 2) return;
    const res = onMark(picked[0], picked[1]);
    setFeedback(res);
    setPicked([]);
    if (res.ok) setMarking(false);
  };

  return (
    <div className="clue-board">
      <div className="clue-head">
        <h2 className="clue-title">线索板</h2>
        <span className="clue-count">{clues.length}</span>
      </div>

      <div className="clue-legend">
        {(Object.keys(TYPE_LABEL) as ClueItem["type"][]).map((t) => (
          <span key={t} className={`legend-item legend-${t}`}>
            <span className="legend-dot" />
            {TYPE_LABEL[t]} {count(t)}
          </span>
        ))}
      </div>

      <div className="mark-panel">
        <div className="mark-stat">
          已确认矛盾 <strong>{markedCount}</strong> / {totalContradictions}
        </div>
        <button
          className={`btn btn-outline mark-toggle ${marking ? "is-on" : ""}`}
          onClick={toggleMarking}
          disabled={!canMark || markableCount < 2}
        >
          {marking ? "取消标记" : "标记矛盾"}
        </button>
        {marking && (
          <div className="mark-hint">
            选出两条互相冲突的证词或物证（{picked.length}/2）。标错扣 1 行动点。
            <button className="btn btn-primary mark-confirm" disabled={picked.length !== 2} onClick={confirm}>
              确认标记
            </button>
          </div>
        )}
        {feedback && <div className={`mark-feedback ${feedback.ok ? "is-ok" : "is-bad"}`}>{feedback.message}</div>}
      </div>

      {clues.length === 0 ? (
        <div className="clue-empty">
          <p>证词、物证、逼出的供述和你确认的矛盾，都会出现在这里。</p>
        </div>
      ) : (
        <ul className="clue-list">
          {clues.map((c) => {
            const open = openId === c.id;
            const isPicked = picked.includes(c.id);
            const dim = marking && !markable(c);
            return (
              <li
                key={c.id}
                className={`clue-card clue-${c.type} ${open ? "is-open" : ""} ${isPicked ? "is-picked" : ""} ${
                  dim ? "is-dim" : ""
                } ${marking && markable(c) ? "is-pickable" : ""}`}
                onClick={() => onCardClick(c)}
              >
                <div className="clue-card-head">
                  {marking && markable(c) && <span className="pick-box" aria-hidden="true" />}
                  <span className="clue-type">{TYPE_LABEL[c.type]}</span>
                  <span className="clue-card-title">{c.title}</span>
                </div>
                <p className="clue-snippet">{c.snippet}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
