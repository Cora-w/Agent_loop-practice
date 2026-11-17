import type {
  Action,
  CaseData,
  ClueItem,
  Contradiction,
  Evidence,
  HiddenClue,
  Suspect,
  ToolResult,
} from "../types";

// =====================================================================
// 工具定义（OpenAI Function Calling 格式）
// =====================================================================

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "getCaseOverview",
      description: "获取案件概览：案件标题、时间地点、案情简介、嫌疑人列表及数量。不消耗行动点。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "interrogateWitness",
      description:
        "审问一名嫌疑人。首次审问返回其证词全文（消耗 2 行动点）；之后可带 question 追问，由嫌疑人本人回答（消耗 1 行动点）。嫌疑人可能说谎。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "被审问者姓名，例如：张薇" },
          question: { type: "string", description: "可选：要追问的具体问题" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "examineEvidence",
      description: "检查一件物证，返回详细内容。消耗 1 行动点。物证名称可先通过 listAllEvidence 获取。",
      parameters: {
        type: "object",
        properties: {
          evidenceName: { type: "string", description: "物证名称，例如：门禁记录" },
        },
        required: ["evidenceName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listAllEvidence",
      description: "列出本案所有可检查的物证名称。不消耗行动点。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "crossCheckStatements",
      description:
        "对已收集的证词和物证做交叉比对，返回可疑的冲突方向（只给提示，需侦探长在线索板上确认标记）。消耗 2 行动点。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "reviewClues",
      description:
        "回顾已收集的全部线索：证词、物证、侦探长逼出的供述、已确认的矛盾，以及剩余行动点和尚未调查的部分。不消耗行动点。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "recommendAccusation",
      description:
        "最终行动：向侦探长提交你的指认建议和完整推理链条（动机 + 机会 + 证据 + 排除其他人）。调用后你的调查结束，由侦探长做最终指认。",
      parameters: {
        type: "object",
        properties: {
          suspect: { type: "string", description: "建议指认的嫌疑人姓名" },
          reasoning: { type: "string", description: "完整推理链条" },
        },
        required: ["suspect", "reasoning"],
      },
    },
  },
] as const;

export const TOOL_LABELS: Record<string, string> = {
  getCaseOverview: "案件概览",
  interrogateWitness: "审问证人",
  examineEvidence: "检查物证",
  listAllEvidence: "物证清单",
  crossCheckStatements: "交叉比对",
  reviewClues: "回顾线索",
  recommendAccusation: "提交指认建议",
};

export const PARAM_LABELS: Record<string, string> = {
  name: "姓名",
  question: "追问",
  evidenceName: "物证",
  suspect: "嫌疑人",
  reasoning: "推理",
};

/** 行动点消耗 */
export const AP_COST = {
  interrogateFirst: 2,
  interrogateFollowUp: 1,
  examine: 1,
  crossCheck: 2,
  playerAsk: 1,
  playerPresent: 2,
  wrongMark: 1,
};

// =====================================================================
// 调查记忆：AI 与侦探长共享
// =====================================================================

export interface QA {
  by: "侦探" | "侦探长";
  q: string;
  a: string;
  evidence?: string;
}

export interface InvestigationMemory {
  ap: number;
  interrogated: string[]; // personId
  examined: string[]; // evidence id
  markedContradictions: string[]; // contradiction id
  unlockedHidden: string[]; // hidden clue id
  conversations: Record<string, QA[]>; // personId -> 问答
}

export function createMemory(apBudget: number): InvestigationMemory {
  return { ap: apBudget, interrogated: [], examined: [], markedContradictions: [], unlockedHidden: [], conversations: {} };
}

/** 已收集到的、可用于标记矛盾的线索 id */
export function collectedClueIds(mem: InvestigationMemory): Set<string> {
  return new Set([...mem.interrogated.map((id) => `stmt-${id}`), ...mem.examined.map((id) => `ev-${id}`)]);
}

/** 执行工具时由外部提供的能力：让嫌疑人（AI 扮演）回答问题 */
export interface ToolEnv {
  memory: InvestigationMemory;
  askSuspect: (suspect: Suspect, question: string) => Promise<string>;
}

// =====================================================================
// 模糊匹配：模型给出的名称可能带引号、括号或只写部分名称
// =====================================================================

function normalize(s: string): string {
  return s.replace(/[\s"'“”‘’《》「」【】()（）:：,，.。、\-_/]/g, "").toLowerCase();
}

function bigrams(s: string): string[] {
  if (s.length < 2) return s ? [s] : [];
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

function score(query: string, key: string): number {
  const q = normalize(query);
  const k = normalize(key);
  if (!q || !k) return 0;
  if (q === k) return 100;
  if (k.includes(q) || q.includes(k)) return 60 + Math.min(q.length, k.length);
  const kb = new Set(bigrams(k));
  return bigrams(q).filter((b) => kb.has(b)).length * 10;
}

function findBest<T>(items: T[], keysOf: (item: T) => string[], query: string): T | undefined {
  let best: T | undefined;
  let bestScore = 0;
  for (const item of items) {
    const s = Math.max(...keysOf(item).map((k) => score(query, k)));
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return bestScore >= 10 ? best : undefined;
}

export function findSuspect(caseData: CaseData, query: string): Suspect | undefined {
  return findBest(caseData.suspects, (s) => [s.name, s.id], query);
}

function findEvidence(caseData: CaseData, query: string): Evidence | undefined {
  return findBest(caseData.evidence, (e) => [e.name, e.id], query);
}

// =====================================================================
// 线索卡片
// =====================================================================

export function statementClue(c: CaseData, personId: string): ClueItem | null {
  const st = c.statements.find((s) => s.personId === personId);
  return st ? { id: `stmt-${personId}`, type: "statement", title: `${st.personName}的证词`, snippet: st.content } : null;
}

export function evidenceClue(ev: Evidence): ClueItem {
  return { id: `ev-${ev.id}`, type: "evidence", title: ev.name, snippet: ev.content };
}

export function hiddenClueItem(h: HiddenClue): ClueItem {
  return { id: `hc-${h.id}`, type: "confession", title: h.title, snippet: h.content };
}

export function contradictionClue(ct: Contradiction): ClueItem {
  return { id: `ct-${ct.id}`, type: "contradiction", title: ct.involved.join(" / "), snippet: ct.finding };
}

// =====================================================================
// 侦探长（玩家）专属判定
// =====================================================================

/** 玩家把两条线索标记为矛盾：命中则返回对应矛盾 */
export function checkMark(c: CaseData, mem: InvestigationMemory, a: string, b: string): Contradiction | null {
  return (
    c.contradictions.find(
      (ct) =>
        !mem.markedContradictions.includes(ct.id) &&
        ct.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
    ) ?? null
  );
}

/** 玩家向嫌疑人出示物证：命中触发条件则返回可解锁的隐藏供述 */
export function findTrigger(
  c: CaseData,
  mem: InvestigationMemory,
  suspectId: string,
  evidenceId: string
): HiddenClue | null {
  return (
    c.hiddenClues.find(
      (h) => h.suspectId === suspectId && h.triggerEvidenceId === evidenceId && !mem.unlockedHidden.includes(h.id)
    ) ?? null
  );
}

// =====================================================================
// 工具执行
// =====================================================================

function ok(result: string, extra: Partial<ToolResult> = {}): ToolResult {
  return { success: true, result, ...extra };
}

function fail(error: string): ToolResult {
  return { success: false, error, apCost: 0 };
}

function spend(mem: InvestigationMemory, cost: number): string | null {
  if (cost > mem.ap) return `行动点不足：需要 ${cost} 点，剩余 ${mem.ap} 点。请提交指认建议或回顾线索。`;
  mem.ap -= cost;
  return null;
}

function getCaseOverview(c: CaseData, mem: InvestigationMemory): ToolResult {
  const suspects = c.suspects.map((s, i) => `${i + 1}. ${s.name}（${s.role}）：${s.info}`).join("\n");
  return ok(
    `【案件】${c.title}\n【时间】${c.time}\n【地点】${c.location}\n【案情】${c.brief}\n\n【嫌疑人】共 ${c.suspects.length} 人：\n${suspects}\n\n【行动点】剩余 ${mem.ap} / ${c.apBudget}`,
    { apCost: 0 }
  );
}

async function interrogateWitness(c: CaseData, input: Record<string, string>, env: ToolEnv): Promise<ToolResult> {
  const mem = env.memory;
  const query = input.name ?? "";
  const question = (input.question ?? "").trim();
  if (!query.trim()) return fail("缺少参数 name，请提供要审问的人的姓名。");
  const suspect = findSuspect(c, query);
  if (!suspect) return fail(`没有找到名为「${query}」的人。可审问的人：${c.suspects.map((s) => s.name).join("、")}`);

  const first = !mem.interrogated.includes(suspect.id);
  if (!first && !question) {
    return fail(`已经审问过${suspect.name}。如需追问，请在 question 中写明要问的问题。`);
  }
  const cost = first ? AP_COST.interrogateFirst : AP_COST.interrogateFollowUp;
  const err = spend(mem, cost);
  if (err) return fail(err);

  const parts: string[] = [];
  const clues: ClueItem[] = [];
  if (first) {
    mem.interrogated.push(suspect.id);
    const clue = statementClue(c, suspect.id);
    if (clue) {
      parts.push(`【${suspect.name}（${suspect.role}）的证词】\n${clue.snippet}`);
      clues.push(clue);
    }
  }
  if (question) {
    try {
      const answer = await env.askSuspect(suspect, question);
      parts.push(`【追问】${question}\n【${suspect.name}】${answer}`);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") throw e;
      parts.push(`【追问】${question}\n（${suspect.name}没有回应：${e instanceof Error ? e.message : String(e)}）`);
    }
  }
  parts.push(`（消耗 ${cost} 行动点，剩余 ${mem.ap}）`);
  return ok(parts.join("\n\n"), { clues, apCost: cost });
}

function examineEvidence(c: CaseData, input: Record<string, string>, mem: InvestigationMemory): ToolResult {
  const query = input.evidenceName ?? "";
  if (!query.trim()) return fail("缺少参数 evidenceName，请提供物证名称。");
  const ev = findEvidence(c, query);
  if (!ev) return fail(`没有找到名为「${query}」的物证。可检查的物证：${c.evidence.map((e) => e.name).join("、")}`);
  if (mem.examined.includes(ev.id)) {
    return ok(`【物证：${ev.name}】（此前已检查，不再消耗行动点）\n${ev.content}`, { apCost: 0 });
  }
  const err = spend(mem, AP_COST.examine);
  if (err) return fail(err);
  mem.examined.push(ev.id);
  return ok(`【物证：${ev.name}】\n${ev.content}\n\n（消耗 ${AP_COST.examine} 行动点，剩余 ${mem.ap}）`, {
    clues: [evidenceClue(ev)],
    apCost: AP_COST.examine,
  });
}

function listAllEvidence(c: CaseData, mem: InvestigationMemory): ToolResult {
  const list = c.evidence
    .map((e, i) => `${i + 1}. ${e.name}${mem.examined.includes(e.id) ? "（已检查）" : ""}`)
    .join("\n");
  return ok(`本案共有 ${c.evidence.length} 件物证：\n${list}`, { apCost: 0 });
}

function crossCheckStatements(c: CaseData, mem: InvestigationMemory): ToolResult {
  const err = spend(mem, AP_COST.crossCheck);
  if (err) return fail(err);
  const have = collectedClueIds(mem);
  const confirmed: string[] = [];
  const hints: string[] = [];
  for (const ct of c.contradictions) {
    if (mem.markedContradictions.includes(ct.id)) confirmed.push(`· 已确认：${ct.finding}`);
    else if (ct.pairs.some(([a, b]) => have.has(a) && have.has(b))) hints.push(`· 疑点：${ct.hint}`);
  }
  const lines: string[] = [];
  if (hints.length) {
    lines.push(`在已收集的线索中发现 ${hints.length} 处可疑冲突：`, ...hints);
    lines.push("请提示侦探长在线索板上选出相关的两条线索并标记为矛盾，确认后才算成立。");
  } else {
    lines.push("在已收集的线索中暂未发现新的明显冲突，建议继续审问或检查物证。");
  }
  if (confirmed.length) lines.push("", `侦探长已确认的矛盾 ${confirmed.length} 处：`, ...confirmed);
  lines.push("", `（消耗 ${AP_COST.crossCheck} 行动点，剩余 ${mem.ap}）`);
  return ok(lines.join("\n"), { apCost: AP_COST.crossCheck });
}

function reviewClues(c: CaseData, mem: InvestigationMemory): ToolResult {
  const parts: string[] = [`【行动点】剩余 ${mem.ap} / ${c.apBudget}`];

  const stmts = c.statements.filter((s) => mem.interrogated.includes(s.personId));
  parts.push(
    stmts.length
      ? `【已审问 ${stmts.length} 人】\n${stmts.map((s) => `· ${s.personName}：${s.content}`).join("\n")}`
      : "【已审问】暂无"
  );
  const notAsked = c.suspects.filter((s) => !mem.interrogated.includes(s.id));
  if (notAsked.length) parts.push(`【尚未审问】${notAsked.map((s) => s.name).join("、")}`);

  const evs = c.evidence.filter((e) => mem.examined.includes(e.id));
  parts.push(
    evs.length
      ? `【已检查物证 ${evs.length} 件】\n${evs.map((e) => `· ${e.name}：${e.content.replace(/\n/g, " ")}`).join("\n")}`
      : "【已检查物证】暂无"
  );
  const notSeen = c.evidence.filter((e) => !mem.examined.includes(e.id));
  if (notSeen.length) parts.push(`【尚未检查】${notSeen.map((e) => e.name).join("、")}`);

  const hidden = c.hiddenClues.filter((h) => mem.unlockedHidden.includes(h.id));
  if (hidden.length) {
    parts.push(`【侦探长逼出的供述 ${hidden.length} 条】\n${hidden.map((h) => `· ${h.title}：${h.content}`).join("\n")}`);
  }

  const marked = c.contradictions.filter((ct) => mem.markedContradictions.includes(ct.id));
  parts.push(
    marked.length
      ? `【侦探长确认的矛盾 ${marked.length} 处】\n${marked.map((ct) => `· ${ct.finding}`).join("\n")}`
      : "【已确认矛盾】暂无"
  );

  const talks = Object.entries(mem.conversations).flatMap(([pid, qa]) => {
    const name = c.suspects.find((s) => s.id === pid)?.name ?? pid;
    return qa.map((x) => `· ${x.by}问${name}${x.evidence ? `（出示：${x.evidence}）` : ""}：${x.q} / 答：${x.a}`);
  });
  if (talks.length) parts.push(`【追问记录】\n${talks.slice(-12).join("\n")}`);

  return ok(parts.join("\n\n"), { apCost: 0 });
}

function recommendAccusation(c: CaseData, input: Record<string, string>): ToolResult {
  const query = input.suspect ?? "";
  const reasoning = (input.reasoning ?? "").trim();
  if (!query.trim()) return fail("缺少参数 suspect，请提供建议指认的嫌疑人姓名。");
  const suspect = findSuspect(c, query);
  if (!suspect) return fail(`嫌疑人「${query}」不在本案名单中。嫌疑人：${c.suspects.map((s) => s.name).join("、")}`);
  return {
    success: true,
    result: `已向侦探长提交指认建议：${suspect.name}。\n\n${reasoning || "（未提供推理）"}\n\n等待侦探长做出最终指认。`,
    isFinalAction: true,
    accused: suspect.name,
    reasoning: reasoning || "（未提供推理）",
    apCost: 0,
  };
}

/** 执行一个 AI 工具调用。数据来自当前 CaseData，进度与行动点记录在共享记忆中。 */
export async function executeTool(caseData: CaseData, action: Action, env: ToolEnv): Promise<ToolResult> {
  const input = action.input ?? {};
  try {
    switch (action.tool) {
      case "getCaseOverview":
        return getCaseOverview(caseData, env.memory);
      case "interrogateWitness":
        return await interrogateWitness(caseData, input, env);
      case "examineEvidence":
        return examineEvidence(caseData, input, env.memory);
      case "listAllEvidence":
        return listAllEvidence(caseData, env.memory);
      case "crossCheckStatements":
        return crossCheckStatements(caseData, env.memory);
      case "reviewClues":
        return reviewClues(caseData, env.memory);
      case "recommendAccusation":
        return recommendAccusation(caseData, input);
      default:
        return fail(`未知工具「${action.tool}」。可用工具：${Object.keys(TOOL_LABELS).join("、")}`);
    }
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    return fail(`工具执行异常：${e instanceof Error ? e.message : String(e)}`);
  }
}

/** 转成发给模型的 tool 消息内容 */
export function toolResultToText(r: ToolResult): string {
  return r.success ? r.result ?? "" : `错误：${r.error ?? "未知错误"}`;
}
