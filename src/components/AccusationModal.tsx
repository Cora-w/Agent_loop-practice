import { useEffect, useState } from "react";
import type { CaseData, ToolResult } from "../types";

interface Props {
  caseData: CaseData;
  recommendation: ToolResult | null;
  judging: boolean;
  onClose: () => void;
  onSubmit: (suspectName: string, reasoning: string) => void | Promise<void>;
}

/** 侦探长的最终指认 */
export default function AccusationModal({ caseData, recommendation, judging, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [reasoning, setReasoning] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !judging) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, judging]);

  const canSubmit = !!name && reasoning.trim().length >= 10 && !judging;

  return (
    <div className="modal-overlay" onClick={() => !judging && onClose()}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 className="modal-title">最终指认</h2>
            <p className="modal-sub">指认只有一次机会。推理越完整，评分越高。</p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={judging} aria-label="关闭">
            ×
          </button>
        </div>

        {recommendation && (
          <div className="modal-hint">
            AI 侦探建议指认 <strong>{recommendation.accused}</strong>。你可以采纳，也可以相信自己的判断。
          </div>
        )}

        <div className="form-field">
          <label>真凶是</label>
          <div className="accuse-options">
            {caseData.suspects.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`accuse-option ${name === s.name ? "is-active" : ""}`}
                onClick={() => setName(s.name)}
                disabled={judging}
              >
                <span className="accuse-name">{s.name}</span>
                <span className="accuse-role">{s.role}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="accuse-reason">你的推理</label>
          <textarea
            id="accuse-reason"
            className="text-input text-area"
            rows={6}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            disabled={judging}
            placeholder="动机是什么？他 / 她有什么作案机会？哪些证据指向他 / 她？为什么排除其他人？"
          />
          <span className="field-note">至少 10 个字。由 AI 评审按动机、机会、证据、排除他人四个方面打分。</span>
        </div>

        <div className="modal-foot">
          <span className="ready-state">{judging ? <span className="shimmer-text">评审正在审阅你的推理</span> : null}</span>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose} disabled={judging}>
              再想想
            </button>
            <button className="btn btn-primary" onClick={() => void onSubmit(name, reasoning.trim())} disabled={!canSubmit}>
              {judging ? "评审中" : "提交指认"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
