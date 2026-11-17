import { useEffect } from "react";
import type { AgentStatus, ApiConfig, CaseData, Puzzle } from "../types";
import { useAgentLoop } from "../hooks/useAgentLoop";
import { MODEL_LABEL, isConfigReady } from "../lib/model";
import CasePanel from "./CasePanel";
import LoopIndicator from "./LoopIndicator";
import Timeline from "./Timeline";
import ClueBoard from "./ClueBoard";

interface Props {
  caseData: CaseData;
  puzzle: Puzzle;
  apiConfig: ApiConfig;
  onBack: () => void;
  onOpenApi: (hint?: string) => void;
}

const STATUS_TEXT: Record<AgentStatus, string> = {
  idle: "待命",
  running: "推理中",
  judging: "评审中",
  success: "已出结果",
  error: "已中断",
};

export default function InvestigatePage({ caseData, puzzle, apiConfig, onBack, onOpenApi }: Props) {
  const game = useAgentLoop(caseData, puzzle, apiConfig);
  const { status } = game;
  const busy = status === "running" || status === "judging";
  const culprit = caseData.suspects.find((s) => s.id === puzzle.culpritId);

  // 进入页面即开始推理
  useEffect(() => {
    if (isConfigReady(apiConfig)) void game.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rerun = () => {
    if (!isConfigReady(apiConfig)) {
      onOpenApi("请先填写 OpenRouter API Key。");
      return;
    }
    void game.start();
  };

  return (
    <div className="investigate">
      <header className="inv-header">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          修改设局
        </button>
        <div className="inv-title">
          <span className="inv-title-icon">{caseData.icon}</span>
          <h1>{caseData.title}</h1>
          <span className="inv-difficulty">AI 推理</span>
        </div>
        <div className="inv-header-right">
          <span className="mode-tag">{MODEL_LABEL}</span>
          <div className={`status-indicator status-${status}`}>
            <span className="status-dot" />
            <span>{STATUS_TEXT[status]}</span>
            {game.currentStep > 0 && <span className="status-step">STEP {game.currentStep}</span>}
          </div>
        </div>
        {busy && (
          <div className="inv-progress" aria-hidden="true">
            <span />
          </div>
        )}
      </header>

      <div className="inv-grid">
        <aside className="inv-col inv-left">
          <CasePanel caseData={caseData} culprit={culprit?.name ?? ""} accused={game.judgement?.accused ?? null} />
        </aside>

        <main className="inv-col inv-center">
          <section className="run-bar">
            <div>
              <h2 className="instruction-title">
                你设定的凶手是 <strong>{culprit?.name}</strong>，交给 AI {puzzle.cards.length} 张卡
              </h2>
              <p className="instruction-hint">
                {status === "running"
                  ? "AI 只能看到你给的卡，正在一步步翻看、比对、排除。"
                  : status === "judging"
                    ? "AI 已经指认，评审正在给它的推理链打分。"
                    : status === "success"
                      ? "结果出来了。可以让 AI 再推一次，或者回去修改设局。"
                      : status === "error"
                        ? "推理中断了。可以再推一次。"
                        : "准备开始。"}
              </p>
            </div>
            <div className="run-actions">
              {busy ? (
                <button className="btn btn-outline" onClick={game.stop}>
                  停止
                </button>
              ) : (
                <button className="btn btn-primary" onClick={rerun}>
                  {status === "idle" ? "开始推理" : "再推一次"}
                </button>
              )}
              <button className="btn btn-ghost" onClick={onBack} disabled={busy}>
                修改设局
              </button>
            </div>
          </section>
          <LoopIndicator
            phase={game.phase}
            step={game.currentStep}
            running={status === "running"}
            completed={status === "success" || status === "judging"}
          />
          <Timeline
            caseData={caseData}
            puzzle={puzzle}
            steps={game.steps}
            status={status}
            judgement={game.judgement}
            error={game.error}
          />
        </main>

        <aside className="inv-col inv-right">
          <ClueBoard
            cards={puzzle.cards}
            viewedIds={game.viewedIds}
            citedIds={game.citedIds}
            revealed={status === "success"}
          />
        </aside>
      </div>
    </div>
  );
}
