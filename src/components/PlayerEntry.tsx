import type { PlayerEvent } from "../types";

interface Props {
  event: PlayerEvent;
}

const KIND_LABEL: Record<PlayerEvent["kind"], string> = {
  ask: "追问",
  present: "出示物证",
  mark: "标记矛盾",
  order: "下达指令",
};

/** 时间线上侦探长（玩家）的一次行动 */
export default function PlayerEntry({ event: e }: Props) {
  return (
    <li className={`tl-entry tl-player ${e.pending ? "is-pending" : ""}`}>
      <div className="tl-rail">
        <span className="tl-badge tl-badge-player">长</span>
        <span className="tl-line" />
      </div>

      <div className="tl-body">
        <div className="pl-head">
          <span className="tl-tag">侦探长 · {KIND_LABEL[e.kind]}</span>
          {!!e.apCost && <span className="pl-cost">-{e.apCost} 行动点</span>}
        </div>

        {e.kind === "order" && <p className="pl-order">{e.text}</p>}

        {(e.kind === "ask" || e.kind === "present") && (
          <div className="dialogue">
            <p className="dlg-line dlg-chief">
              <span className="dlg-who">你</span>
              <span>
                {e.evidenceName && <span className="dlg-evidence">出示「{e.evidenceName}」</span>}
                {e.question}
              </span>
            </p>
            {e.pending ? (
              <p className="dlg-line dlg-suspect">
                <span className="dlg-who">{e.suspectName}</span>
                <span className="shimmer-text">正在斟酌怎么回答</span>
              </p>
            ) : e.error ? (
              <p className="dlg-line dlg-error">
                <span className="dlg-who">失败</span>
                <span>{e.error}（行动点已退还）</span>
              </p>
            ) : (
              <p className="dlg-line dlg-suspect">
                <span className="dlg-who">{e.suspectName}</span>
                <span>{e.reply}</span>
              </p>
            )}
          </div>
        )}

        {e.kind === "mark" && (
          <p className={`pl-mark ${e.ok ? "is-ok" : "is-bad"}`}>
            {e.text}
            <span className="pl-mark-result">{e.ok ? "矛盾成立" : "没有矛盾"}</span>
          </p>
        )}

        {e.unlocked && (
          <div className="pl-unlock">
            <span className="pl-unlock-tag">{e.kind === "mark" ? "确认矛盾" : "击破 · 新供述"}</span>
            <strong>{e.unlocked.title}</strong>
            <p>{e.unlocked.snippet}</p>
          </div>
        )}

        {e.kind === "present" && e.ok === false && !e.pending && !e.error && (
          <p className="pl-miss">这件物证没能击中{e.suspectName}的要害。</p>
        )}
      </div>
    </li>
  );
}
