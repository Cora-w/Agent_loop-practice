// ===================== 案件数据 =====================

export interface Suspect {
  id: string;
  name: string;
  role: string;
  info: string;
  /** 只给扮演该嫌疑人的 AI 看的内心秘密，玩家不可见 */
  secret: string;
}

export interface Statement {
  personId: string;
  personName: string;
  content: string;
}

export interface Evidence {
  id: string;
  name: string;
  content: string;
}

export interface Contradiction {
  id: string;
  involved: string[];
  finding: string;
  /** AI 交叉比对时给出的模糊提示（不直接说破） */
  hint: string;
  /** 能构成该矛盾的线索对（线索 id：stmt-xxx / ev-xxx），玩家标记任意一对即判定成功 */
  pairs: [string, string][];
}

/** 隐藏供述：向指定嫌疑人出示指定物证后解锁 */
export interface HiddenClue {
  id: string;
  suspectId: string;
  triggerEvidenceId: string;
  title: string;
  content: string;
}

export interface Truth {
  culprit: string;
  reasoning: string;
}

export interface CaseData {
  id: string;
  title: string;
  icon: string;
  difficulty: string;
  tagline: string;
  brief: string;
  time: string;
  location: string;
  suspects: Suspect[];
  statements: Statement[];
  evidence: Evidence[];
  contradictions: Contradiction[];
  hiddenClues: HiddenClue[];
  truth: Truth;
  goal: string;
  /** 行动点预算（AI 与玩家共用） */
  apBudget: number;
}

// ===================== Agent 运行时 =====================

export interface Action {
  tool: string;
  input: Record<string, string>;
}

export interface ClueItem {
  id: string;
  type: "statement" | "evidence" | "confession" | "contradiction";
  title: string;
  snippet: string;
}

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
  /** recommendAccusation：AI 的调查结束，等待侦探长指认 */
  isFinalAction?: boolean;
  accused?: string;
  reasoning?: string;
  /** 本次消耗的行动点 */
  apCost?: number;
  /** 本次工具调用新产生的线索（用于线索板自动收集） */
  clues?: ClueItem[];
}

export interface TimelineStep {
  step: number;
  thinking?: string;
  action?: Action;
  result?: ToolResult;
}

/** 侦探长（玩家）的行动 */
export interface PlayerEvent {
  kind: "ask" | "present" | "mark" | "order";
  suspectName?: string;
  question?: string;
  evidenceName?: string;
  reply?: string;
  pending?: boolean;
  /** 出示物证逼出的隐藏供述 / 标记成功的矛盾 */
  unlocked?: ClueItem;
  ok?: boolean;
  text?: string;
  apCost?: number;
  error?: string;
}

export type TimelineItem =
  | { id: string; kind: "agent"; step: TimelineStep }
  | { id: string; kind: "player"; event: PlayerEvent };

export type LoopPhase = "observe" | "decide" | "act" | "evaluate" | null;

/**
 * idle 未开始 / running AI 推进中 / paused 暂停 /
 * ready AI 已停止，等待侦探长指认或继续 / success 已指认结案 / error 出错
 */
export type AgentStatus = "idle" | "running" | "paused" | "ready" | "success" | "error";

// ===================== 配置 & 模型 =====================

/** 只需要 OpenRouter API Key，地址和模型固定 */
export interface ApiConfig {
  apiKey: string;
}

/** 已完成的一轮：assistant 发起 tool_call，tool 返回结果 */
export interface HistoryEntry {
  step: number;
  thinking?: string;
  /** assistant 消息原文（回传给模型用；thinking 可能是推理摘要） */
  content?: string;
  action: Action;
  toolCallId: string;
  result: ToolResult;
}

/** 侦探长的插话，在第 afterStep 轮之后作为 user 消息插入上下文 */
export interface AgentNote {
  afterStep: number;
  text: string;
}

export interface AgentContext {
  goal: string;
  history: HistoryEntry[];
  notes: AgentNote[];
}

export interface ModelResponse {
  done: boolean;
  action?: Action;
  toolCallId?: string;
  answer?: string;
  thinking?: string;
  content?: string;
}

export interface LoopOutcome {
  reason: "recommend" | "done" | "ap" | "maxSteps";
  steps: number;
  finalResult?: ToolResult;
  answer?: string;
}

export interface ScoreLine {
  label: string;
  points: number;
  max: number;
}

export interface Verdict {
  accused: string;
  reasoning: string;
  correct: boolean;
  judgeComment: string;
  breakdown: ScoreLine[];
  total: number;
  grade: "S" | "A" | "B" | "C" | "D";
}

export type Page = "home" | "investigate";
