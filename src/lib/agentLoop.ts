import type { Action, AgentContext, ApiConfig, CaseData, LoopOutcome, LoopPhase, ToolResult } from "../types";
import { callModel } from "./model";
import { executeTool, type ToolEnv } from "./tools";

/** 每次启动 / 继续调查，AI 最多连续推进的步数 */
export const MAX_STEPS = 16;

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
  /** 跨多次「继续调查」保留的上下文 */
  context: AgentContext;
  /** 工具执行环境（共享记忆 + 嫌疑人扮演） */
  env: ToolEnv;
  /** 时间线上的起始步号 */
  startStep: number;
  /** 侦探长是否按下了暂停 */
  isPaused: () => boolean;
  callbacks: LoopCallbacks;
  signal?: AbortSignal;
}

/**
 * Agent Loop：观察 → 决策(调用模型) → 行动(执行工具) → 评估。
 * 侦探长的插话写入 context.notes，下一轮「观察」时自动进入模型上下文。
 */
export async function runAgentLoop(opts: RunAgentLoopOptions) {
  const { config, caseData, context, env, startStep, isPaused, callbacks: cb, signal } = opts;

  for (let i = 0; i < MAX_STEPS; i++) {
    // 暂停：停在两轮之间，侦探长仍可审讯、标记
    while (isPaused()) {
      cb.onPhase(null);
      await sleep(200, signal);
    }
    throwIfAborted(signal);

    if (env.memory.ap <= 0) {
      cb.onComplete({ reason: "ap", steps: i });
      return;
    }

    const step = startStep + i;

    // 观察：整理上下文（含侦探长插话）
    cb.onStepStart(step);
    cb.onPhase("observe");
    await sleep(300, signal);

    // 决策：调用模型
    cb.onPhase("decide");
    const res = await callModel(config, caseData, context, env.memory.ap, (t) => cb.onThinking(step, t), signal);
    throwIfAborted(signal);

    if (res.done) {
      cb.onPhase("evaluate");
      cb.onStepEnd(step);
      cb.onComplete({ reason: "done", steps: i + 1, answer: res.answer });
      return;
    }

    // 行动：执行工具
    const action = res.action!;
    cb.onPhase("act");
    cb.onAction(step, action);
    await sleep(250, signal);
    const result = await executeTool(caseData, action, env);
    throwIfAborted(signal);

    // 评估：处理结果
    cb.onPhase("evaluate");
    cb.onResult(step, result);

    context.history.push({
      step,
      thinking: res.thinking,
      content: res.content,
      action,
      toolCallId: res.toolCallId ?? `call_${step}`,
      result,
    });

    if (result.isFinalAction) {
      cb.onStepEnd(step);
      cb.onComplete({ reason: "recommend", steps: i + 1, finalResult: result });
      return;
    }

    cb.onStepEnd(step);
    await sleep(300, signal);
  }

  cb.onComplete({ reason: "maxSteps", steps: MAX_STEPS });
}
