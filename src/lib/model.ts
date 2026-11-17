import type { Action, AgentContext, ApiConfig, CaseData, ModelResponse } from "../types";
import { AP_COST, TOOL_DEFINITIONS, toolResultToText } from "./tools";

export const SYSTEM_PROMPT =
  "你是一名资深刑侦侦探。工作方式：1.getCaseOverview 2.interrogateWitness逐个审问 3.examineEvidence检查物证 4.crossCheckStatements交叉比对 5.reviewClues回顾 6.recommendAccusation提交指认建议。规则：每次只调一个工具，基于证据推理，注意证词矛盾，指认时给出完整推理链条：动机+机会+证据+排除其他人。\n\n" +
  "你和侦探长（用户）搭档办案：\n" +
  "- 嫌疑人由真人般的角色扮演回答，可能说谎、隐瞒。\n" +
  "- 只有侦探长能向嫌疑人出示物证逼供、在线索板上确认矛盾、做最终指认。当你发现某件物证可能击破某人的说法时，在思考里明确建议侦探长「向某某出示某某物证」；交叉比对发现疑点时，建议侦探长标记哪两条线索。\n" +
  "- 侦探长的插话、指示、逼出的供述会以「侦探长」开头的消息告诉你，必须认真参考。\n" +
  "- 行动点有限，与侦探长共用，请节约使用；证据足够时就调用 recommendAccusation 结束你的调查。";

// ---------------- OpenRouter 固定配置 ----------------

export const MODEL_ID = "openai/gpt-5.6-luna";
export const MODEL_LABEL = "GPT-5.6 Luna";
export const OPENROUTER_DIRECT_URL = "https://openrouter.ai/api/v1/chat/completions";
/** 本地开发 / 预览时走 Vite 代理（见 vite.config.ts） */
export const OPENROUTER_PROXY_URL = "/openrouter/chat/completions";
/** GPT-5.6 Luna 是推理模型：用低推理强度，让每一步循环更快 */
const REASONING_EFFORT = "low";

// ---------------- OpenAI 兼容格式的消息类型 ----------------

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface AssistantMessage {
  content?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
  tool_calls?: ToolCall[];
}

interface ChatCompletionResponse {
  choices?: { message?: AssistantMessage; finish_reason?: string }[];
  error?: { message?: string; code?: number };
}

function isLocalHost(): boolean {
  const h = typeof location !== "undefined" ? location.hostname : "";
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

export function resolveEndpoint(): string {
  return import.meta.env.DEV || isLocalHost() ? OPENROUTER_PROXY_URL : OPENROUTER_DIRECT_URL;
}

export function isConfigReady(c: ApiConfig | null | undefined): c is ApiConfig {
  return !!c && !!c.apiKey.trim();
}

function explainHttpError(status: number, detail: string): string {
  const hints: Record<number, string> = {
    400: "请求格式错误",
    401: "API Key 无效，请检查是否填写正确",
    402: "账户额度不足，请到 OpenRouter 充值",
    403: "请求被拒绝（可能触发了内容审核）",
    404: "找不到该模型，请确认 OpenRouter 上 openai/gpt-5.6-luna 可用",
    408: "请求超时，请重试",
    429: "请求太频繁，请稍后再试",
    502: "模型服务商出错，请稍后再试",
    503: "暂时没有可用的服务商，请稍后再试",
  };
  const hint = hints[status] ?? "请求失败";
  return `OpenRouter ${hint}（HTTP ${status}）${detail ? "：" + detail : ""}`;
}

/** 发送一次 chat/completions 请求，返回 choices[0] */
export async function postChat(
  config: ApiConfig,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ message: AssistantMessage; finishReason?: string }> {
  let res: Response;
  try {
    res = await fetch(resolveEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof location !== "undefined" ? location.origin : "http://localhost",
        "X-Title": "Detective Agent Loop",
      },
      body: JSON.stringify({ model: MODEL_ID, reasoning: { effort: REASONING_EFFORT }, ...body }),
      signal,
    });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    throw new Error(
      isLocalHost()
        ? "无法连接 OpenRouter：本地代理没有响应。请确认是用 npm run dev 启动的，并且电脑能访问 openrouter.ai。"
        : "无法连接 OpenRouter：当前页面不允许访问外部 API（claude.ai 链接页面就是这种情况）。请在本地 D:\\Agent_loop 运行 npm run dev 后，在 http://localhost:5173 使用。",
      { cause: e }
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    throw new Error(explainHttpError(res.status, detail));
  }

  let data: ChatCompletionResponse;
  try {
    data = (await res.json()) as ChatCompletionResponse;
  } catch {
    throw new Error("OpenRouter 返回的内容不是 JSON。请确认是用 npm run dev 启动的（需要 Vite 代理转发请求）。");
  }
  if (data.error?.message) throw new Error(`OpenRouter 返回错误：${data.error.message}`);
  const choice = data.choices?.[0];
  if (!choice?.message) throw new Error("OpenRouter 返回格式异常：缺少 choices[0].message");
  return { message: choice.message, finishReason: choice.finish_reason };
}

/**
 * 构建消息：system + user(目标 + 步数 + 行动点) + 历史轮次。
 * 侦探长的插话按发生时机作为 user 消息插在对应轮次之后。
 */
export function buildMessages(caseData: CaseData, context: AgentContext, apLeft: number): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `当前案件：《${caseData.title}》\n` +
        `侦探长的调查指令：${context.goal}\n` +
        `已执行步数：${context.history.length}（本轮上限 16 步）\n` +
        `行动点：剩余 ${apLeft} / ${caseData.apBudget}（首次审问 ${AP_COST.interrogateFirst}、追问 ${AP_COST.interrogateFollowUp}、检查物证 ${AP_COST.examine}、交叉比对 ${AP_COST.crossCheck}，其余免费）\n` +
        `请在每次调用工具前，先用一两句话写出你的推理和下一步打算，然后调用一个工具。` +
        (context.history.length === 0 ? "现在开始调查。" : "请基于已有结果继续调查。"),
    },
  ];

  const notesAfter = (step: number) =>
    context.notes.filter((n) => n.afterStep === step).forEach((n) => messages.push({ role: "user", content: n.text }));

  notesAfter(0);
  context.history.forEach((h, i) => {
    messages.push({
      role: "assistant",
      content: h.content ?? null,
      tool_calls: [
        {
          id: h.toolCallId,
          type: "function",
          function: { name: h.action.tool, arguments: JSON.stringify(h.action.input) },
        },
      ],
    });
    messages.push({ role: "tool", tool_call_id: h.toolCallId, content: toolResultToText(h.result) });
    notesAfter(i + 1);
  });
  // 发生在当前轮之后（尚未对应历史轮次）的插话
  context.notes
    .filter((n) => n.afterStep > context.history.length)
    .forEach((n) => messages.push({ role: "user", content: n.text }));
  return messages;
}

function parseArguments(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const obj: unknown = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * 调用侦探模型一次。
 * - 返回 tool_calls：{ done:false, action }
 * - 只返回 content：{ done:true, answer }
 * - content（没有时用推理摘要）作为 thinking 通过回调抛出
 */
export async function callModel(
  config: ApiConfig,
  caseData: CaseData,
  context: AgentContext,
  apLeft: number,
  onThinking: (text: string) => void,
  signal?: AbortSignal
): Promise<ModelResponse> {
  const { message, finishReason } = await postChat(
    config,
    {
      messages: buildMessages(caseData, context, apLeft),
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      max_tokens: 4096,
    },
    signal
  );

  const content = (message.content ?? "").trim();
  const reasoning = (message.reasoning ?? message.reasoning_content ?? "").trim();
  const thinking = content || reasoning;
  if (thinking) onThinking(thinking);

  const call = message.tool_calls?.[0];
  if (call?.function?.name) {
    const action: Action = { tool: call.function.name, input: parseArguments(call.function.arguments) };
    return {
      done: false,
      action,
      toolCallId: call.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      thinking: thinking || undefined,
      content: content || undefined,
    };
  }

  if (content) return { done: true, answer: content, thinking: content, content };
  if (finishReason === "length") throw new Error("模型输出被截断（推理占满了长度上限），请继续调查重试。");
  throw new Error("模型既没有调用工具也没有返回内容，请继续调查重试。");
}
