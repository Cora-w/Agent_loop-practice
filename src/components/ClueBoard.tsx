import { useState } from "react";
import type { PoolCard } from "../types";
import { KIND_LABEL, ROLE_LABEL } from "../lib/pool";

interface Props {
  cards: PoolCard[];
  viewedIds: string[];
  citedIds: string[];
  /** 出结果后显示「被引用」标记 */
  revealed: boolean;
}

/** 右栏：交给 AI 的卡片，实时显示 AI 查看了哪些 */
export default function ClueBoard({ cards, viewedIds, citedIds, revealed }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const viewed = cards.filter((pc) => viewedIds.includes(pc.card.id)).length;

  return (
    <div className="clue-board">
      <div className="clue-head">
        <h2 className="clue-title">交给 AI 的卡片</h2>
        <span className="clue-count">
          {viewed}
          <em>/{cards.length}</em>
        </span>
      </div>
      <div className="clue-legend">
        <span className="legend-item">AI 已查看 {viewed} 张</span>
        {revealed && <span className="legend-item">被引用 {citedIds.length} 张</span>}
      </div>

      <ul className="clue-list">
        {cards.map((pc) => {
          const seen = viewedIds.includes(pc.card.id);
          const cited = revealed && citedIds.includes(pc.card.id);
          const open = openId === pc.card.id;
          return (
            <li
              key={pc.card.id}
              className={`clue-card role-${pc.role} ${seen ? "is-seen" : "is-unseen"} ${cited ? "is-cited" : ""} ${
                open ? "is-open" : ""
              }`}
              onClick={() => setOpenId(open ? null : pc.card.id)}
            >
              <div className="clue-card-head">
                <span className={`role-tag role-tag-${pc.role}`}>{ROLE_LABEL[pc.role]}</span>
                <span className="clue-card-title">{pc.card.title}</span>
              </div>
              <p className="clue-snippet">{pc.card.content}</p>
              <div className="clue-state">
                <span>{KIND_LABEL[pc.card.kind]}</span>
                <span className={seen ? "is-on" : ""}>{seen ? "AI 已查看" : "未查看"}</span>
                {cited && <span className="is-on">被 AI 引用</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
