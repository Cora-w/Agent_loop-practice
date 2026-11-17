import type { Action, AgentContext, ApiConfig, CaseData, ModelResponse } from "../types";
import { TOOL_DEFINITIONS, toolResultToText } from "./tools";

export const SYSTEM_PROMPT =
  "你是一名资深刑侦侦探。工作方式：1.getCaseOverview 2.interrogateWitness逐个审问 3.examineEvidence检查物证 4.crossCheckStatements交叉比对 5.reviewClues回顾 6.makeAccusation指认。规则：每次只调一个工具，基于证据推理，注意证词矛盾，指认时给出完整推理链条：动机+机会+证据+排除其他人。\n\n" +
  "补充说明：你能看到的只有侦探长交给你的材料。材料里可能混有误导性的内容，例如只有动机、没有作案条件的怀疑。" +
  "请区分间接怀疑与客观、直接的证据，优先相信能同时证明作案时间和作案行为的材料。" +
  "指认时在 evidence 参数中列出你真正依据的材料标题。";

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

/** 构建消息：system + user(目标 + 历史步数) + 历史轮次(assistant 带 tool_calls，tool 返回结果) */
export function buildMessages(caseData: CaseData, context: AgentContext, cardCount: number): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `当前案件：《${caseData.title}》\n` +
        `调查目标：根据侦探长交给你的 ${cardCount} 份材料，查明真凶并给出完整的推理链条。\n` +
        `已执行步数：${context.history.length}（上限 20 步）\n` +
        `请在每次调用工具前，先用一两句话写出你的推理和下一步打算，然后调用一个工具。` +
        (context.history.length === 0 ? "现在开始调查。" : "请基于已有结果继续调查。"),
    },
  ];

  for (const h of context.history) {
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
  }
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
  cardCount: number,
  onThinking: (text: string) => void,
  signal?: AbortSignal
): Promise<ModelResponse> {
  const { message, finishReason } = await postChat(
    config,
    {
      messages: buildMessages(caseData, context, cardCount),
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
  if (finishReason === "length") throw new Error("模型输出被截断（推理占满了长度上限），请再推一次。");
  throw new Error("模型既没有调用工具也没有返回内容，请再推一次。");
}
