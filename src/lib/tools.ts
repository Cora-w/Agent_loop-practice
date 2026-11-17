import type { Action, Card, CaseData, Suspect, ToolResult } from "../types";
import { KIND_LABEL } from "./pool";

// =====================================================================
// 工具定义（OpenAI Function Calling 格式）
// AI 只能看到侦探长交给它的卡片，看不到卡片的真假性质。
// =====================================================================

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "getCaseOverview",
      description: "获取案件概览：案情、时间地点、嫌疑人列表，以及侦探长交给你的材料数量。调查开始时首先调用。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "interrogateWitness",
      description: "审问一名嫌疑人：返回材料中与此人相关的证词和剧情材料。",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "嫌疑人姓名，例如：张薇" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "examineEvidence",
      description: "查看一份材料的详细内容。材料标题可先通过 listAllEvidence 获取。",
      parameters: {
        type: "object",
        properties: { evidenceName: { type: "string", description: "材料标题，例如：走廊监控片段" } },
        required: ["evidenceName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listAllEvidence",
      description: "列出侦探长交给你的全部材料标题和类型（证据 / 剧情），以及哪些已经查看过。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "crossCheckStatements",
      description: "把已查看的材料按嫌疑人归类整理，便于比对各人的说法与客观记录之间的冲突。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "reviewClues",
      description: "回顾所有已查看材料的完整内容，以及尚未查看的材料。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "makeAccusation",
      description:
        "最终行动：指认凶手，给出完整推理链条（动机 + 机会 + 证据 + 排除其他人），并列出你依据的材料标题。调用后调查结束，只能调用一次。",
      parameters: {
        type: "object",
        properties: {
          suspect: { type: "string", description: "被指认的嫌疑人姓名" },
          reasoning: { type: "string", description: "完整推理链条" },
          evidence: { type: "string", description: "推理所依据的材料标题，用「、」分隔" },
        },
        required: ["suspect", "reasoning", "evidence"],
      },
    },
  },
] as const;

export const TOOL_LABELS: Record<string, string> = {
  getCaseOverview: "案件概览",
  interrogateWitness: "审问证人",
  examineEvidence: "查看材料",
  listAllEvidence: "材料清单",
  crossCheckStatements: "交叉比对",
  reviewClues: "回顾线索",
  makeAccusation: "指认凶手",
};

export const PARAM_LABELS: Record<string, string> = {
  name: "姓名",
  evidenceName: "材料",
  suspect: "嫌疑人",
  reasoning: "推理",
  evidence: "依据",
};

// =====================================================================
// 执行环境
// =====================================================================

export interface ToolEnv {
  /** 交给 AI 的卡片（已打乱顺序） */
  cards: Card[];
  /** AI 已查看的卡片 id */
  viewed: string[];
}

// ---------------- 模糊匹配 ----------------

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

function findBest<T>(items: T[], keysOf: (item: T) => string[], query: string, min = 10): T | undefined {
  let best: T | undefined;
  let bestScore = 0;
  for (const item of items) {
    const s = Math.max(...keysOf(item).map((k) => score(query, k)));
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return bestScore >= min ? best : undefined;
}

export function findSuspect(c: CaseData, query: string): Suspect | undefined {
  return findBest(c.suspects, (s) => [s.name, s.id], query);
}

export function findCard(cards: Card[], query: string, min = 10): Card | undefined {
  return findBest(cards, (card) => [card.title], query, min);
}

/** 从「依据」文本里解析出引用的卡片 */
export function parseCited(cards: Card[], evidence: string, reasoning: string): string[] {
  const ids = new Set<string>();
  evidence
    .split(/[、,，;；\n|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const card = findCard(cards, part, 30);
      if (card) ids.add(card.id);
    });
  // 推理正文里原样出现的标题也算引用
  const text = normalize(reasoning);
  cards.forEach((card) => {
    if (text.includes(normalize(card.title))) ids.add(card.id);
  });
  return [...ids];
}

// ---------------- 工具实现 ----------------

const ok = (result: string, extra: Partial<ToolResult> = {}): ToolResult => ({ success: true, result, ...extra });
const fail = (error: string): ToolResult => ({ success: false, error });

const cardLine = (card: Card) => `【${KIND_LABEL[card.kind]}】${card.title}\n${card.content}`;

function view(env: ToolEnv, cards: Card[]): string[] {
  const fresh = cards.filter((c) => !env.viewed.includes(c.id)).map((c) => c.id);
  env.viewed.push(...fresh);
  return fresh;
}

function getCaseOverview(c: CaseData, env: ToolEnv): ToolResult {
  const suspects = c.suspects.map((s, i) => `${i + 1}. ${s.name}（${s.role}）：${s.info}`).join("\n");
  const ev = env.cards.filter((x) => x.kind === "evidence").length;
  return ok(
    `【案件】${c.title}\n【时间】${c.time}\n【地点】${c.location}\n【案情】${c.brief}\n\n` +
      `【嫌疑人】共 ${c.suspects.length} 人：\n${suspects}\n\n` +
      `【材料】侦探长交给你 ${env.cards.length} 份材料（证据 ${ev} 份，剧情 ${env.cards.length - ev} 份）。注意：材料中可能混有误导性的内容。`
  );
}

function interrogateWitness(c: CaseData, input: Record<string, string>, env: ToolEnv): ToolResult {
  const query = input.name ?? "";
  if (!query.trim()) return fail("缺少参数 name。");
  const s = findSuspect(c, query);
  if (!s) return fail(`没有找到「${query}」。嫌疑人：${c.suspects.map((x) => x.name).join("、")}`);
  const related = env.cards.filter((card) => card.kind === "plot" && card.suspectIds.includes(s.id));
  if (!related.length) {
    return ok(`材料中没有${s.name}的证词或与其相关的剧情材料。可以查看证据类材料寻找线索。`);
  }
  const viewedIds = view(env, related);
  return ok(`【关于${s.name}（${s.role}）的材料，共 ${related.length} 份】\n\n${related.map(cardLine).join("\n\n")}`, {
    viewedIds,
  });
}

function examineEvidence(input: Record<string, string>, env: ToolEnv): ToolResult {
  const query = input.evidenceName ?? "";
  if (!query.trim()) return fail("缺少参数 evidenceName。");
  const card = findCard(env.cards, query);
  if (!card) return fail(`没有找到「${query}」。可用材料：${env.cards.map((x) => x.title).join("、")}`);
  const viewedIds = view(env, [card]);
  return ok(cardLine(card), { viewedIds });
}

function listAllEvidence(env: ToolEnv): ToolResult {
  const list = env.cards
    .map((card, i) => `${i + 1}. 【${KIND_LABEL[card.kind]}】${card.title}${env.viewed.includes(card.id) ? "（已查看）" : ""}`)
    .join("\n");
  return ok(`共 ${env.cards.length} 份材料：\n${list}`);
}

function crossCheckStatements(c: CaseData, env: ToolEnv): ToolResult {
  const seen = env.cards.filter((card) => env.viewed.includes(card.id));
  if (!seen.length) return ok("还没有查看任何材料，无法比对。请先审问嫌疑人或查看材料。");
  const groups = c.suspects.map((s) => {
    const mine = seen.filter((card) => card.suspectIds.includes(s.id));
    return mine.length ? `■ ${s.name}\n${mine.map((card) => `  · ${card.title}：${card.content}`).join("\n")}` : `■ ${s.name}\n  · （暂无相关材料）`;
  });
  const general = seen.filter((card) => card.suspectIds.length === 0);
  const unseen = env.cards.filter((card) => !env.viewed.includes(card.id));
  return ok(
    [
      "按嫌疑人整理已查看的材料：",
      ...groups,
      general.length ? `■ 案情客观记录\n${general.map((card) => `  · ${card.title}：${card.content}`).join("\n")}` : "",
      unseen.length ? `尚未查看 ${unseen.length} 份：${unseen.map((card) => card.title).join("、")}` : "全部材料均已查看。",
      "请比对：每个人的说法是否与客观记录冲突？谁同时具备动机、时间和直接证据？哪些材料只是间接的怀疑，可能是误导？",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

function reviewClues(env: ToolEnv): ToolResult {
  const seen = env.cards.filter((card) => env.viewed.includes(card.id));
  const unseen = env.cards.filter((card) => !env.viewed.includes(card.id));
  const parts = [
    seen.length ? `【已查看 ${seen.length} 份】\n\n${seen.map(cardLine).join("\n\n")}` : "【已查看】暂无",
    unseen.length ? `【尚未查看】${unseen.map((card) => card.title).join("、")}` : "【尚未查看】无",
  ];
  return ok(parts.join("\n\n"));
}

function makeAccusation(c: CaseData, input: Record<string, string>, env: ToolEnv): ToolResult {
  const query = input.suspect ?? "";
  if (!query.trim()) return fail("缺少参数 suspect。");
  const s = findSuspect(c, query);
  if (!s) return fail(`嫌疑人「${query}」不在名单中。嫌疑人：${c.suspects.map((x) => x.name).join("、")}`);
  const reasoning = (input.reasoning ?? "").trim() || "（未提供推理）";
  const citedIds = parseCited(env.cards, input.evidence ?? "", reasoning);
  const citedTitles = env.cards.filter((card) => citedIds.includes(card.id)).map((card) => card.title);
  return {
    success: true,
    result: `指认：${s.name}\n\n依据材料：${citedTitles.join("、") || "（未列出）"}\n\n${reasoning}`,
    isFinalAction: true,
    accused: s.name,
    reasoning,
    citedIds,
  };
}

/** 执行一个工具调用 */
export function executeTool(c: CaseData, action: Action, env: ToolEnv): ToolResult {
  const input = action.input ?? {};
  try {
    switch (action.tool) {
      case "getCaseOverview":
        return getCaseOverview(c, env);
      case "interrogateWitness":
        return interrogateWitness(c, input, env);
      case "examineEvidence":
        return examineEvidence(input, env);
      case "listAllEvidence":
        return listAllEvidence(env);
      case "crossCheckStatements":
        return crossCheckStatements(c, env);
      case "reviewClues":
        return reviewClues(env);
      case "makeAccusation":
        return makeAccusation(c, input, env);
      default:
        return fail(`未知工具「${action.tool}」。可用工具：${Object.keys(TOOL_LABELS).join("、")}`);
    }
  } catch (e) {
    return fail(`工具执行异常：${e instanceof Error ? e.message : String(e)}`);
  }
}

/** 转成发给模型的 tool 消息内容 */
export function toolResultToText(r: ToolResult): string {
  return r.success ? r.result ?? "" : `错误：${r.error ?? "未知错误"}`;
}
