import type { AgentStatus } from "../types";

interface Props {
  value: string;
  onChange: (v: string) => void;
  status: AgentStatus;
  onPrimary: () => void;
  onTogglePause: () => void;
  onAccuse: () => void;
  canAccuse: boolean;
  apiReady: boolean;
  onOpenApi: () => void;
}

const SUGGESTIONS = [
  { label: "全面调查", text: "全面调查此案，不放过任何细节，找出真凶" },
  { label: "先审后查", text: "先审问所有嫌疑人，再检查物证，找出说谎的人" },
  { label: "排查时间线", text: "重点排查每个人的不在场证明和时间线" },
  { label: "从动机查起", text: "从动机入手，谁最有理由犯案就先查谁" },
];

const PRIMARY_LABEL: Record<AgentStatus, string> = {
  idle: "开始调查",
  running: "下达指令",
  paused: "下达指令",
  ready: "继续调查",
  error: "继续调查",
  success: "重新开始",
};

const HINT: Record<AgentStatus, string> = {
  idle: "输入你希望侦探采取的调查策略，或点击下方推荐",
  running: "AI 侦探正在推进。你可以随时插话下达指令，它会在下一轮参考",
  paused: "已暂停。你可以从容地审讯、标记矛盾，或给出新的指令",
  ready: "AI 侦探已停下。可以下达新指令继续调查，或者由你来指认",
  error: "调查中断了。可以继续调查重试，或者直接指认",
  success: "本案已结案。可以重新开始，换一种打法",
};

export default function InstructionInput({
  value,
  onChange,
  status,
  onPrimary,
  onTogglePause,
  onAccuse,
  canAccuse,
  apiReady,
  onOpenApi,
}: Props) {
  const loopActive = status === "running" || status === "paused";
  const needsText = loopActive;
  const primaryDisabled = needsText && !value.trim();

  return (
    <section className="instruction">
      <div className="instruction-head">
        <div>
          <h2 className="instruction-title">调查指令</h2>
          <p className="instruction-hint">{HINT[status]}</p>
        </div>
        <button className={`api-pill ${apiReady ? "is-ready" : ""}`} onClick={onOpenApi} type="button">
          <span className="ready-dot" />
          {apiReady ? "OpenRouter 已连接" : "未填写 Key"}
        </button>
      </div>

      <div className="instruction-row">
        <input
          className="text-input instruction-input"
          placeholder={
            loopActive
              ? "例如：先别管赵强，重点盯住陈浩的时间线"
              : "例如：先审问所有嫌疑人，然后逐一检查物证，找出证词中的矛盾"
          }
          value={value}
          disabled={status === "success"}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && !primaryDisabled) onPrimary();
          }}
        />
        <button className="btn btn-primary" onClick={onPrimary} disabled={primaryDisabled}>
          {PRIMARY_LABEL[status]}
        </button>
        {loopActive && (
          <button className="btn btn-outline" onClick={onTogglePause}>
            {status === "paused" ? "继续" : "暂停"}
          </button>
        )}
        <button className="btn btn-outline btn-accuse" onClick={onAccuse} disabled={!canAccuse}>
          我来指认
        </button>
      </div>

      {(status === "idle" || status === "ready" || status === "error") && (
        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              className={`chip ${value === s.text ? "is-active" : ""}`}
              onClick={() => onChange(s.text)}
              title={s.text}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
