// ===================== 案件与卡池 =====================

export interface Suspect {
  id: string;
  name: string;
  role: string;
  info: string;
}

/** 一张线索卡：证据（物证、记录）或剧情（证词、背景、人物关系） */
export interface Card {
  id: string;
  kind: "evidence" | "plot";
  title: string;
  content: string;
  /** 与哪些嫌疑人相关（审问某人时，会给出与其相关的剧情卡） */
  suspectIds: string[];
}

/**
 * 每个嫌疑人的一套卡：
 * - suspicion 嫌疑卡：动机、可疑举动等间接线索。他是凶手时为真线索，不是凶手时为干扰线索。
 * - proof 定罪卡：作案机会与直接证据。只有他被指定为凶手时才会出现在卡池里。
 */
export interface SuspectKit {
  suspectId: string;
  suspicion: Card[];
  proof: Card[];
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
  /** 不论谁是凶手都成立的中性材料（案情事实、各人最初的证词） */
  neutralCards: Card[];
  kits: SuspectKit[];
}

/** 卡片在当前设局中的性质（只有出题人能看到） */
export type CardRole = "true" | "decoy" | "neutral";

export interface PoolCard {
  card: Card;
  role: CardRole;
  custom?: boolean;
}

/** 出题人的设局：指定凶手 + 交给 AI 的卡 */
export interface Puzzle {
  caseId: string;
  culpritId: string;
  cards: PoolCard[];
}

// ===================== Agent 运行时 =====================

export interface Action {
  tool: string;
  input: Record<string, string>;
}

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
  isFinalAction?: boolean;
  accused?: string;
  reasoning?: string;
  /** AI 指认时引用的卡片 id */
  citedIds?: string[];
  /** 本次 AI 新查看的卡片 id */
  viewedIds?: string[];
}

export interface TimelineStep {
  step: number;
  thinking?: string;
  action?: Action;
  result?: ToolResult;
}

export type LoopPhase = "observe" | "decide" | "act" | "evaluate" | null;

/** idle 未开始 / running 推理中 / judging 评审中 / success 已出结果 / error 出错或中止 */
export type AgentStatus = "idle" | "running" | "judging" | "success" | "error";

// ===================== 配置 & 模型 =====================

/** 只需要 OpenRouter API Key，地址和模型固定 */
export interface ApiConfig {
  apiKey: string;
}

export interface HistoryEntry {
  step: number;
  thinking?: string;
  content?: string;
  action: Action;
  toolCallId: string;
  result: ToolResult;
}

export interface AgentContext {
  history: HistoryEntry[];
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
  reason: "accused" | "done" | "maxSteps";
  steps: number;
  finalResult?: ToolResult;
  answer?: string;
}

// ===================== 判定 =====================

export interface ReasoningScore {
  motive: number; // 0-25
  opportunity: number;
  evidence: number;
  exclusion: number;
  total: number; // 0-100
  comment: string;
  failed?: boolean;
}

export interface Judgement {
  /** AI 是否给出了指认 */
  accused: string | null;
  reasoning: string;
  correct: boolean;
  culprit: string;
  /** 引用的卡片按性质分类 */
  citedTrue: PoolCard[];
  citedDecoy: PoolCard[];
  citedNeutral: PoolCard[];
  /** 交给了 AI 但没被引用的真线索 */
  missedTrue: PoolCard[];
  score: ReasoningScore | null;
}

export type Page = "home" | "setup" | "investigate";
