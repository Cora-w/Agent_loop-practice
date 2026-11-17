import type { Action, AgentContext, ApiConfig, CaseData, LoopOutcome, LoopPhase, ToolResult } from "../types";
import { callModel } from "./model";
import { executeTool, type ToolEnv } from "./tools";

export const MAX_STEPS = 20;

export interface LoopCallbacks {
  onStepStart: (step: number) => void;
  onPhase: (phase: LoopPhase) => void;
  onThinking: (step: number, text: string) => void;
  onAction: (step: number, action: Action) => void;
  onResult: (step: number, result: ToolResult) => void;
  onStepEnd: (step: number) => void;
  onComplete: (outcome: LoopOutcome) => void;
}

export function isAbortError(e: unknown): boolean {
  return (e as { name?: string })?.name === "AbortError";
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

/** 可被中止的延迟 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface RunAgentLoopOptions {
  config: ApiConfig;
  caseData: CaseData;
  env: ToolEnv;
  callbacks: LoopCallbacks;
  signal?: AbortSignal;
}

/**
 * Agent Loop：观察 → 决策(调用模型) → 行动(执行工具) → 评估。
 * AI 只能通过工具接触侦探长交给它的卡片。
 */
export async function runAgentLoop({ config, caseData, env, callbacks: cb, signal }: RunAgentLoopOptions) {
  const context: AgentContext = { history: [] };

  for (let i = 0; i < MAX_STEPS; i++) {
    throwIfAborted(signal);
    const step = i + 1;

    // 观察：整理上下文
    cb.onStepStart(step);
    cb.onPhase("observe");
    await sleep(300, signal);

    // 决策：调用模型
    cb.onPhase("decide");
    const res = await callModel(config, caseData, context, env.cards.length, (t) => cb.onThinking(step, t), signal);
    throwIfAborted(signal);

    if (res.done) {
      cb.onPhase("evaluate");
      cb.onStepEnd(step);
      cb.onComplete({ reason: "done", steps: step, answer: res.answer });
      return;
    }

    // 行动：执行工具
    const action = res.action!;
    cb.onPhase("act");
    cb.onAction(step, action);
    await sleep(250, signal);
    const result = executeTool(caseData, action, env);

    // 评估：处理结果
    cb.onPhase("evaluate");
    cb.onResult(step, result);

    if (result.isFinalAction) {
      cb.onStepEnd(step);
      cb.onComplete({ reason: "accused", steps: step, finalResult: result });
      return;
    }

    context.history.push({
      step,
      thinking: res.thinking,
      content: res.content,
      action,
      toolCallId: res.toolCallId ?? `call_${step}`,
      result,
    });
    cb.onStepEnd(step);
    await sleep(300, signal);
  }

  cb.onComplete({ reason: "maxSteps", steps: MAX_STEPS });
}
