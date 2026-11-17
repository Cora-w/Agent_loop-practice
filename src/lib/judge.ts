import type { ApiConfig, CaseData, Judgement, PoolCard, Puzzle, ReasoningScore } from "../types";
import { postChat, type ChatMessage } from "./model";

/** 把 AI 引用的卡片按真线索 / 干扰 / 中性分类 */
export function analyzeCitations(puzzle: Puzzle, citedIds: string[]) {
  const cited = puzzle.cards.filter((pc) => citedIds.includes(pc.card.id));
  return {
    citedTrue: cited.filter((pc) => pc.role === "true"),
    citedDecoy: cited.filter((pc) => pc.role === "decoy"),
    citedNeutral: cited.filter((pc) => pc.role === "neutral"),
    missedTrue: puzzle.cards.filter((pc) => pc.role === "true" && !citedIds.includes(pc.card.id)),
  };
}

const clamp = (n: unknown) => Math.max(0, Math.min(25, Math.round(Number(n) || 0)));
const list = (cards: PoolCard[]) => cards.map((pc) => `· ${pc.card.title}：${pc.card.content}`).join("\n") || "（无）";

/** 推理链评分：由另一个 AI 评审按 动机 / 机会 / 证据 / 排除他人 各 25 分打分 */
export async function scoreReasoning(
  config: ApiConfig,
  c: CaseData,
  puzzle: Puzzle,
  accused: string,
  reasoning: string,
  signal?: AbortSignal
): Promise<ReasoningScore> {
  const culprit = c.suspects.find((s) => s.id === puzzle.culpritId)?.name ?? "";
  const by = (role: PoolCard["role"]) => puzzle.cards.filter((pc) => pc.role === role);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是推理游戏的评审。出题人指定了真凶，并挑选了一组材料交给 AI 侦探，其中混有误导性的干扰材料。" +
        "请评价 AI 侦探的推理链条，从四个方面各打 0 到 25 分：motive 动机是否成立、opportunity 作案机会与时间线是否论证清楚、" +
        "evidence 是否基于真线索而非干扰材料、exclusion 是否合理排除了其他嫌疑人。" +
        "指认错人时，四项总分不超过 40。" +
        '只输出 JSON：{"motive":整数,"opportunity":整数,"evidence":整数,"exclusion":整数,"comment":"两到三句中文点评，说清做得好的地方和被误导或遗漏之处"}',
    },
    {
      role: "user",
      content:
        `案件：《${c.title}》\n出题人指定的真凶：${culprit}\n\n` +
        `交给 AI 的真线索：\n${list(by("true"))}\n\n交给 AI 的干扰材料：\n${list(by("decoy"))}\n\n` +
        `交给 AI 的中性材料：\n${list(by("neutral"))}\n\n` +
        `AI 指认：${accused}\nAI 的推理：${reasoning}`,
    },
  ];
  const { message } = await postChat(config, { messages, max_tokens: 1200 }, signal);
  const raw = (message.content ?? "").trim();
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("评审没有返回可解析的结果");
  const obj = JSON.parse(json) as Record<string, unknown>;
  const motive = clamp(obj.motive);
  const opportunity = clamp(obj.opportunity);
  const evidence = clamp(obj.evidence);
  const exclusion = clamp(obj.exclusion);
  return {
    motive,
    opportunity,
    evidence,
    exclusion,
    total: motive + opportunity + evidence + exclusion,
    comment: String(obj.comment ?? "").trim() || "（评审没有给出点评）",
  };
}

/** 汇总判定 */
export function buildJudgement(
  c: CaseData,
  puzzle: Puzzle,
  accused: string | null,
  reasoning: string,
  citedIds: string[],
  score: ReasoningScore | null
): Judgement {
  const culprit = c.suspects.find((s) => s.id === puzzle.culpritId)?.name ?? "";
  return {
    accused,
    reasoning,
    correct: !!accused && accused === culprit,
    culprit,
    ...analyzeCitations(puzzle, citedIds),
    score,
  };
}
