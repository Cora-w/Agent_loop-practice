import type { ApiConfig, CaseData, Evidence, HiddenClue, Suspect } from "../types";
import type { QA } from "./tools";
import { postChat, type ChatMessage } from "./model";

// =====================================================================
// 嫌疑人角色扮演
// =====================================================================

export interface SuspectReplyOptions {
  asker: "侦探" | "侦探长";
  question: string;
  /** 侦探长出示的物证 */
  presented?: Evidence;
  /** 出示的物证命中破绽：必须吐露的事实 */
  crack?: HiddenClue;
  history: QA[];
}

function suspectSystemPrompt(c: CaseData, s: Suspect): string {
  const statement = c.statements.find((st) => st.personId === s.id)?.content ?? "";
  return [
    `你正在一场推理游戏中扮演嫌疑人「${s.name}」（${s.role}）。案件：《${c.title}》。${c.brief}`,
    `你的身份背景：${s.info}`,
    `你最初向警方给出的证词：${statement}`,
    `你内心的秘密（绝不主动说出）：${s.secret}`,
    "表演规则：",
    "1. 始终以第一人称、口语化地回答，1 到 3 句话，带一点情绪或小动作描写（用括号），不要旁白式解说。",
    "2. 坚持你最初的证词；没被拿出确凿证据时，对敏感问题含糊、回避、反问或撒谎。",
    "3. 不要提及你没有理由知道的信息，不要透露其他人的秘密，不要编造与案情矛盾的新事实。",
    "4. 如果你是凶手，无论如何都不能直接认罪；只能在被证据逼到时承认局部事实，并为自己辩解。",
    "5. 只输出角色说的话，不要输出任何解释。",
  ].join("\n");
}

export async function suspectReply(
  config: ApiConfig,
  c: CaseData,
  s: Suspect,
  opts: SuspectReplyOptions,
  signal?: AbortSignal
): Promise<string> {
  const messages: ChatMessage[] = [{ role: "system", content: suspectSystemPrompt(c, s) }];
  for (const qa of opts.history.slice(-6)) {
    messages.push({
      role: "user",
      content: `${qa.by}${qa.evidence ? `（出示了物证「${qa.evidence}」）` : ""}：${qa.q}`,
    });
    messages.push({ role: "assistant", content: qa.a });
  }

  let prompt = `${opts.asker}${opts.presented ? `把物证「${opts.presented.name}」摆在你面前` : ""}问你：${opts.question}`;
  if (opts.presented) prompt += `\n\n【物证内容】${opts.presented.content}`;
  if (opts.crack) {
    prompt += `\n\n【导演提示，只有你能看到】这件物证击中了你的软肋，你的说法撑不住了。你必须在回答中露出破绽，承认以下事实（用你自己的口吻，可以辩解）：${opts.crack.content}`;
  } else if (opts.presented) {
    prompt += "\n\n【导演提示，只有你能看到】这件物证并没有击中你真正隐瞒的事，你可以合理解释、否认或表示与你无关。";
  }
  messages.push({ role: "user", content: prompt });

  const { message } = await postChat(config, { messages, max_tokens: 1024 }, signal);
  const text = (message.content ?? "").trim();
  if (!text) throw new Error("嫌疑人没有回答，请重试。");
  return text;
}

// =====================================================================
// 推理评审：给侦探长的指认理由打分
// =====================================================================

export interface JudgeResult {
  score: number; // 0 - 20
  comment: string;
}

export async function judgeReasoning(
  config: ApiConfig,
  c: CaseData,
  accused: string,
  reasoning: string,
  signal?: AbortSignal
): Promise<JudgeResult> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是推理游戏的评审，负责评价玩家（侦探长）的结案推理。依据真相，从动机、机会、证据、排除其他嫌疑人四个方面打分，满分 20 分。指认错人时最高 6 分。" +
        '只输出 JSON：{"score": 整数, "comment": "两到三句中文点评，指出做得好的地方和遗漏"}。点评要具体，可以点出玩家遗漏的关键证据。',
    },
    {
      role: "user",
      content: `案件：《${c.title}》\n真凶：${c.truth.culprit}\n真相：${c.truth.reasoning}\n\n玩家指认：${accused}\n玩家推理：${reasoning || "（空）"}`,
    },
  ];
  const { message } = await postChat(config, { messages, max_tokens: 1024 }, signal);
  const raw = (message.content ?? "").trim();
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (json) {
    try {
      const obj = JSON.parse(json) as { score?: unknown; comment?: unknown };
      const score = Math.max(0, Math.min(20, Math.round(Number(obj.score) || 0)));
      return { score, comment: String(obj.comment ?? "").trim() || "（评审没有给出点评）" };
    } catch {
      /* fall through */
    }
  }
  return { score: 8, comment: raw || "（评审结果无法解析，按 8 分计）" };
}
