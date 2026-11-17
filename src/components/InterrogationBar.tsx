import { useState } from "react";
import type { CaseData } from "../types";
import type { ActionFeedback } from "../hooks/useAgentLoop";
import { AP_COST } from "../lib/tools";

interface Props {
  caseData: CaseData;
  selected: string;
  onSelect: (id: string) => void;
  examined: string[];
  ap: number;
  disabled: boolean;
  closed: boolean;
  busy: boolean;
  onSubmit: (suspectId: string, question: string, evidenceId?: string) => Promise<ActionFeedback>;
}

/** 审讯室：侦探长随时插话追问嫌疑人，或出示物证逼供 */
export default function InterrogationBar({
  caseData,
  selected,
  onSelect,
  examined,
  ap,
  disabled,
  closed,
  busy,
  onSubmit,
}: Props) {
  const [question, setQuestion] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const evidenceList = caseData.evidence.filter((e) => examined.includes(e.id));
  const presenting = !!evidenceId;
  const cost = presenting ? AP_COST.playerPresent : AP_COST.playerAsk;
  const canSubmit = !disabled && !busy && ap >= cost && (presenting || question.trim().length > 0);
  const suspect = caseData.suspects.find((s) => s.id === selected);

  const submit = async () => {
    if (!canSubmit) return;
    const q = question;
    setQuestion("");
    setFeedback(null);
    const res = await onSubmit(selected, q, evidenceId || undefined);
    setFeedback(res);
    if (res.ok) setEvidenceId("");
    else if (!res.ok && q) setQuestion(q);
  };

  return (
    <section className={`interrogation ${disabled ? "is-disabled" : ""}`}>
      <div className="interrogation-head">
        <span className="interrogation-title">审讯室</span>
        <div className="suspect-tabs" role="tablist">
          {caseData.suspects.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === selected}
              className={`suspect-tab ${s.id === selected ? "is-active" : ""}`}
              onClick={() => onSelect(s.id)}
              disabled={disabled}
            >
              {s.name}
            </button>
          ))}
        </div>
        <span className="interrogation-cost">
          追问 {AP_COST.playerAsk} 点 · 出示物证 {AP_COST.playerPresent} 点
        </span>
      </div>

      <div className="interrogation-row">
        <select
          className="text-input evidence-select"
          value={evidenceId}
          onChange={(e) => setEvidenceId(e.target.value)}
          disabled={disabled || busy}
          title="只能出示已经检查过的物证"
        >
          <option value="">不出示物证</option>
          {evidenceList.map((e) => (
            <option key={e.id} value={e.id}>
              出示：{e.name}
            </option>
          ))}
        </select>
        <input
          className="text-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) void submit();
          }}
          placeholder={
            closed
              ? "本案已结案"
              : disabled
                ? "开始调查后，你可以随时在这里追问嫌疑人"
                : presenting
                  ? `出示物证后要问${suspect?.name ?? ""}什么？（可留空）`
                  : `你想问${suspect?.name ?? ""}什么？`
          }
          disabled={disabled || busy}
        />
        <button className="btn btn-primary" onClick={() => void submit()} disabled={!canSubmit}>
          {busy ? "等待回答" : presenting ? "出示并追问" : "追问"}
        </button>
      </div>

      {(feedback || (!disabled && evidenceList.length === 0)) && (
        <div className={`interrogation-feedback ${feedback?.ok === false ? "is-bad" : ""}`}>
          {feedback
            ? feedback.message
            : "提示：物证被检查过之后，才能在这里出示给嫌疑人。出示对了物证，嫌疑人会露出破绽。"}
        </div>
      )}
    </section>
  );
}
