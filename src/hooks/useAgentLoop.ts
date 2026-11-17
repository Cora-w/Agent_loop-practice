import { useEffect, useRef, useState } from "react";
import type {
  AgentStatus,
  ApiConfig,
  CaseData,
  Judgement,
  LoopOutcome,
  LoopPhase,
  Puzzle,
  ReasoningScore,
  TimelineStep,
  ToolResult,
} from "../types";
import { isAbortError, runAgentLoop, type LoopCallbacks } from "../lib/agentLoop";
import { buildJudgement, scoreReasoning } from "../lib/judge";
import { shuffle } from "../lib/pool";
import type { ToolEnv } from "../lib/tools";

/** 出题模式下的 Agent Loop：AI 只拿到出题人挑的卡片，推理结束后自动判定 */
export function useAgentLoop(caseData: CaseData, puzzle: Puzzle, config: ApiConfig) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [phase, setPhase] = useState<LoopPhase>(null);
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [citedIds, setCitedIds] = useState<string[]>([]);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // 卸载时中止
  useEffect(() => () => abortRef.current?.abort(), []);

  const updateStep = (step: number, patch: Partial<TimelineStep>) =>
    setSteps((prev) => prev.map((s) => (s.step === step ? { ...s, ...patch } : s)));

  const finish = async (ctrl: AbortController, outcome: LoopOutcome) => {
    setPhase(null);
    const final = outcome.finalResult;
    if (!final?.accused) {
      // AI 没能给出指认：出题人的局成功了
      setJudgement(buildJudgement(caseData, puzzle, null, outcome.answer ?? "", [], null));
      setStatus("success");
      return;
    }
    setStatus("judging");
    let score: ReasoningScore | null;
    try {
      score = await scoreReasoning(config, caseData, puzzle, final.accused, final.reasoning ?? "", ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted || isAbortError(e)) return;
      score = {
        motive: 0,
        opportunity: 0,
        evidence: 0,
        exclusion: 0,
        total: 0,
        comment: `推理链评分没能完成：${e instanceof Error ? e.message : String(e)}`,
        failed: true,
      };
    }
    if (ctrl.signal.aborted) return;
    setJudgement(
      buildJudgement(caseData, puzzle, final.accused, final.reasoning ?? "", final.citedIds ?? [], score)
    );
    setStatus("success");
  };

  const makeCallbacks = (ctrl: AbortController): LoopCallbacks => {
    const guard =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (!ctrl.signal.aborted) fn(...args);
      };
    return {
      onStepStart: guard((step: number) => {
        setCurrentStep(step);
        setSteps((prev) => [...prev, { step }]);
      }),
      onPhase: guard((p: LoopPhase) => setPhase(p)),
      onThinking: guard((step: number, text: string) => updateStep(step, { thinking: text })),
      onAction: guard((step: number, action) => updateStep(step, { action })),
      onResult: guard((step: number, result: ToolResult) => {
        updateStep(step, { result });
        if (result.viewedIds?.length) setViewedIds((prev) => [...prev, ...result.viewedIds!]);
        if (result.citedIds) setCitedIds(result.citedIds);
      }),
      onStepEnd: guard(() => {}),
      onComplete: guard((outcome: LoopOutcome) => {
        void finish(ctrl, outcome);
      }),
    };
  };

  const start = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("running");
    setPhase(null);
    setSteps([]);
    setCurrentStep(0);
    setViewedIds([]);
    setCitedIds([]);
    setJudgement(null);
    setError(null);

    const env: ToolEnv = { cards: shuffle(puzzle.cards.map((pc) => pc.card)), viewed: [] };
    try {
      await runAgentLoop({ config, caseData, env, callbacks: makeCallbacks(ctrl), signal: ctrl.signal });
    } catch (e) {
      if (ctrl.signal.aborted || isAbortError(e)) return;
      setPhase(null);
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const stop = () => {
    if (status !== "running" && status !== "judging") return;
    abortRef.current?.abort();
    setPhase(null);
    setStatus("error");
    setError("推理已被手动停止。");
  };

  return { status, phase, steps, currentStep, viewedIds, citedIds, judgement, error, start, stop };
}
