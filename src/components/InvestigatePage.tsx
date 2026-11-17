import { useState } from "react";
import type { AgentStatus, ApiConfig, CaseData } from "../types";
import { useAgentLoop } from "../hooks/useAgentLoop";
import { MODEL_LABEL, isConfigReady } from "../lib/model";
import CasePanel from "./CasePanel";
import InstructionInput from "./InstructionInput";
import LoopIndicator from "./LoopIndicator";
import Timeline from "./Timeline";
import InterrogationBar from "./InterrogationBar";
import ClueBoard from "./ClueBoard";
import AccusationModal from "./AccusationModal";

interface Props {
  caseData: CaseData;
  apiConfig: ApiConfig;
  onBack: () => void;
  onOpenApi: (hint?: string) => void;
}

const STATUS_TEXT: Record<AgentStatus, string> = {
  idle: "待命",
  running: "调查中",
  paused: "已暂停",
  ready: "等待指认",
  success: "已结案",
  error: "已中断",
};

export default function InvestigatePage({ caseData, apiConfig, onBack, onOpenApi }: Props) {
  const game = useAgentLoop(caseData, apiConfig);
  const [instruction, setInstruction] = useState("");
  const [selectedSuspect, setSelectedSuspect] = useState(caseData.suspects[0].id);
  const [accuseOpen, setAccuseOpen] = useState(false);

  const { status, memory } = game;
  const ready = isConfigReady(apiConfig);
  const started = status !== "idle";
  const finished = status === "success";
  const loopActive = status === "running" || status === "paused";

  const requireApi = () => {
    if (ready) return true;
    onOpenApi("开始调查前，请先填写 OpenRouter API Key。");
    return false;
  };

  const handlePrimary = () => {
    if (status === "idle") {
      if (!requireApi()) return;
      game.start(instruction.trim() || caseData.goal);
      setInstruction("");
    } else if (loopActive) {
      game.sendOrder(instruction);
      setInstruction("");
    } else if (status === "ready" || status === "error") {
      if (!requireApi()) return;
      game.continueInvestigation(instruction);
      setInstruction("");
    } else if (finished) {
      game.restart();
    }
  };

  const handleBack = () => {
    game.reset();
    onBack();
  };

  const apRatio = memory.ap / caseData.apBudget;

  return (
    <div className="investigate">
      <header className="inv-header">
        <button className="btn btn-ghost back-btn" onClick={handleBack}>
          返回案件
        </button>
        <div className="inv-title">
          <span className="inv-title-icon">{caseData.icon}</span>
          <h1>{caseData.title}</h1>
          <span className="inv-difficulty">{caseData.difficulty}</span>
        </div>
        <div className="inv-header-right">
          <div className={`ap-meter ${apRatio <= 0.2 ? "is-low" : ""}`} title="行动点：AI 与侦探长共用">
            <span className="ap-label">行动点</span>
            <span className="ap-track">
              <i style={{ width: `${Math.max(0, apRatio) * 100}%` }} />
            </span>
            <span className="ap-value">
              {memory.ap}
              <em>/{caseData.apBudget}</em>
            </span>
          </div>
          {started && <span className="mode-tag">{MODEL_LABEL}</span>}
          <div className={`status-indicator status-${status}`}>
            <span className="status-dot" />
            <span>{STATUS_TEXT[status]}</span>
            {game.currentStep > 0 && <span className="status-step">STEP {game.currentStep}</span>}
          </div>
        </div>
        {status === "running" && (
          <div className="inv-progress" aria-hidden="true">
            <span />
          </div>
        )}
      </header>

      <div className="inv-grid">
        <aside className="inv-col inv-left">
          <CasePanel
            caseData={caseData}
            accused={game.verdict?.accused ?? null}
            selected={selectedSuspect}
            onSelect={setSelectedSuspect}
            interrogated={memory.interrogated}
            unlocked={memory.unlocked}
            selectable={started && !finished}
          />
        </aside>

        <main className="inv-col inv-center">
          <InstructionInput
            value={instruction}
            onChange={setInstruction}
            status={status}
            onPrimary={handlePrimary}
            onTogglePause={status === "paused" ? game.resume : game.pause}
            onAccuse={() => setAccuseOpen(true)}
            canAccuse={started && !finished && !game.judging}
            apiReady={ready}
            onOpenApi={() => onOpenApi()}
          />
          <LoopIndicator
            phase={game.phase}
            step={game.currentStep}
            running={status === "running"}
            paused={status === "paused"}
            completed={status === "ready" || finished}
          />
          <Timeline
            caseData={caseData}
            items={game.items}
            status={status}
            goal={game.goal}
            verdict={game.verdict}
            recommendation={game.recommendation}
            stopNote={game.stopNote}
            error={game.error}
          />
          <InterrogationBar
            caseData={caseData}
            selected={selectedSuspect}
            onSelect={setSelectedSuspect}
            examined={memory.examined}
            ap={memory.ap}
            disabled={!started || finished}
            closed={finished}
            busy={game.playerBusy}
            onSubmit={game.interrogate}
          />
        </main>

        <aside className="inv-col inv-right">
          <ClueBoard
            clues={game.clues}
            canMark={started && !finished}
            markedCount={memory.marked.length}
            totalContradictions={caseData.contradictions.length}
            onMark={game.markContradiction}
          />
        </aside>
      </div>

      {accuseOpen && (
        <AccusationModal
          caseData={caseData}
          recommendation={game.recommendation}
          judging={game.judging}
          onClose={() => setAccuseOpen(false)}
          onSubmit={async (name, reasoning) => {
            const res = await game.accuse(name, reasoning);
            if (res.ok) setAccuseOpen(false);
          }}
        />
      )}
    </div>
  );
}
