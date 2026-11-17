import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentContext,
  AgentStatus,
  ApiConfig,
  CaseData,
  ClueItem,
  LoopOutcome,
  LoopPhase,
  PlayerEvent,
  Suspect,
  TimelineItem,
  TimelineStep,
  ToolResult,
  Verdict,
} from "../types";
import { isAbortError, runAgentLoop, type LoopCallbacks } from "../lib/agentLoop";
import {
  AP_COST,
  checkMark,
  contradictionClue,
  createMemory,
  findTrigger,
  hiddenClueItem,
  type InvestigationMemory,
} from "../lib/tools";
import { judgeReasoning, suspectReply } from "../lib/roleplay";
import { computeVerdict } from "../lib/scoring";

/** 供界面展示的记忆快照 */
export interface MemoryView {
  ap: number;
  interrogated: string[];
  examined: string[];
  unlocked: string[];
  marked: string[];
}

export interface ActionFeedback {
  ok: boolean;
  message: string;
}

const STOP_TEXT: Record<LoopOutcome["reason"], string> = {
  recommend: "AI 侦探已提交指认建议。你可以继续审讯、标记矛盾，准备好后点击「我来指认」。",
  done: "AI 侦探暂停了调查。你可以下达新指令继续，或直接指认。",
  ap: "行动点已耗尽，AI 侦探停止了调查。请根据现有线索做出指认。",
  maxSteps: "AI 侦探已连续推进 16 步。你可以下达新指令继续，或直接指认。",
};

let uid = 0;
const nextId = () => `p${Date.now().toString(36)}${(uid++).toString(36)}`;

export function useAgentLoop(caseData: CaseData, config: ApiConfig) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [phase, setPhase] = useState<LoopPhase>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [clues, setClues] = useState<ClueItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [recommendation, setRecommendation] = useState<ToolResult | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [stopNote, setStopNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [playerBusy, setPlayerBusy] = useState(false);
  const [judging, setJudging] = useState(false);
  const [memView, setMemView] = useState<MemoryView>({
    ap: caseData.apBudget,
    interrogated: [],
    examined: [],
    unlocked: [],
    marked: [],
  });

  const memoryRef = useRef<InvestigationMemory>(createMemory(caseData.apBudget));
  const contextRef = useRef<AgentContext>({ goal: "", history: [], notes: [] });
  const stepRef = useRef(0);
  const pausedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const playerAbortRef = useRef<AbortController>(new AbortController());
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // 卸载时中止所有请求
  useEffect(
    () => () => {
      abortRef.current?.abort();
      playerAbortRef.current.abort();
    },
    []
  );

  // ---------------- 小工具 ----------------

  const syncMemory = () => {
    const m = memoryRef.current;
    setMemView({
      ap: m.ap,
      interrogated: [...m.interrogated],
      examined: [...m.examined],
      unlocked: [...m.unlockedHidden],
      marked: [...m.markedContradictions],
    });
  };

  const addItem = (item: TimelineItem) => setItems((prev) => [...prev, item]);

  const updateAgent = (step: number, patch: Partial<TimelineStep>) =>
    setItems((prev) =>
      prev.map((it) => (it.kind === "agent" && it.step.step === step ? { ...it, step: { ...it.step, ...patch } } : it))
    );

  const updatePlayer = (id: string, patch: Partial<PlayerEvent>) =>
    setItems((prev) =>
      prev.map((it) => (it.kind === "player" && it.id === id ? { ...it, event: { ...it.event, ...patch } } : it))
    );

  const addClues = (list: ClueItem[]) =>
    setClues((prev) => {
      const known = new Set(prev.map((c) => c.id));
      const fresh = list.filter((c) => !known.has(c.id));
      return fresh.length ? [...fresh.reverse(), ...prev] : prev; // 新线索放最上方
    });

  /** 侦探长的插话：下一轮「观察」时进入 AI 上下文 */
  const addNote = (text: string) => {
    contextRef.current.notes.push({ afterStep: contextRef.current.history.length, text: `【侦探长】${text}` });
  };

  const clueTitle = (id: string) => {
    if (id.startsWith("stmt-")) {
      const s = caseData.statements.find((st) => `stmt-${st.personId}` === id);
      return s ? `${s.personName}的证词` : id;
    }
    if (id.startsWith("ev-")) return caseData.evidence.find((e) => `ev-${e.id}` === id)?.name ?? id;
    return id;
  };

  // ---------------- AI Agent Loop ----------------

  const makeAsk = (signal: AbortSignal) => async (suspect: Suspect, question: string) => {
    const mem = memoryRef.current;
    const history = mem.conversations[suspect.id] ?? [];
    const answer = await suspectReply(configRef.current, caseData, suspect, { asker: "侦探", question, history }, signal);
    (mem.conversations[suspect.id] ??= []).push({ by: "侦探", q: question, a: answer });
    return answer;
  };

  const makeCallbacks = (ctrl: AbortController): LoopCallbacks => {
    const guard =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (!ctrl.signal.aborted) fn(...args);
      };
    return {
      onStepStart: guard((step: number) => {
        stepRef.current = step;
        setCurrentStep(step);
        addItem({ id: `a${step}`, kind: "agent", step: { step } });
      }),
      onPhase: guard((p: LoopPhase) => setPhase(p)),
      onThinking: guard((step: number, text: string) => updateAgent(step, { thinking: text })),
      onAction: guard((step: number, action) => updateAgent(step, { action })),
      onResult: guard((step: number, result: ToolResult) => {
        updateAgent(step, { result });
        syncMemory();
        if (result.clues?.length) addClues(result.clues);
        if (result.isFinalAction) setRecommendation(result);
      }),
      onStepEnd: guard(() => {}),
      onComplete: guard((outcome: LoopOutcome) => {
        if (abortRef.current === ctrl) abortRef.current = null;
        pausedRef.current = false;
        setPhase(null);
        setStatus("ready");
        setStopNote(outcome.reason === "done" && outcome.answer ? outcome.answer : STOP_TEXT[outcome.reason]);
        syncMemory();
      }),
    };
  };

  const runLoop = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    pausedRef.current = false;
    setStatus("running");
    setError(null);
    setStopNote(null);
    try {
      await runAgentLoop({
        config: configRef.current,
        caseData,
        context: contextRef.current,
        env: { memory: memoryRef.current, askSuspect: makeAsk(ctrl.signal) },
        startStep: stepRef.current + 1,
        isPaused: () => pausedRef.current,
        callbacks: makeCallbacks(ctrl),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (ctrl.signal.aborted || isAbortError(e)) return;
      if (abortRef.current === ctrl) abortRef.current = null;
      setPhase(null);
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
      syncMemory();
    }
  };

  const resetAll = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    playerAbortRef.current.abort();
    playerAbortRef.current = new AbortController();
    memoryRef.current = createMemory(caseData.apBudget);
    contextRef.current = { goal: "", history: [], notes: [] };
    stepRef.current = 0;
    pausedRef.current = false;
    setStatus("idle");
    setPhase(null);
    setItems([]);
    setClues([]);
    setCurrentStep(0);
    setRecommendation(null);
    setVerdict(null);
    setStopNote(null);
    setError(null);
    setGoal("");
    setPlayerBusy(false);
    setJudging(false);
    syncMemory();
  };

  /** 全新开始一次调查 */
  const start = (runGoal: string) => {
    resetAll();
    contextRef.current.goal = runGoal;
    setGoal(runGoal);
    void runLoop();
  };

  /** AI 停下后，带着新指令继续调查（保留全部上下文） */
  const continueInvestigation = (instruction: string) => {
    const text = instruction.trim();
    if (text) {
      addNote(`新的调查指示：${text}`);
      addItem({ id: nextId(), kind: "player", event: { kind: "order", text } });
    }
    void runLoop();
  };

  /** 调查进行中下达插话指令 */
  const sendOrder = (text: string) => {
    const t = text.trim();
    if (!t) return;
    addNote(`插话指示：${t}`);
    addItem({ id: nextId(), kind: "player", event: { kind: "order", text: t } });
  };

  const pause = () => {
    if (status !== "running") return;
    pausedRef.current = true;
    setStatus("paused");
  };

  const resume = () => {
    if (status !== "paused") return;
    pausedRef.current = false;
    setStatus("running");
  };

  // ---------------- 侦探长：追问 / 出示物证 ----------------

  const interrogate = async (
    suspectId: string,
    question: string,
    evidenceId?: string
  ): Promise<ActionFeedback> => {
    const suspect = caseData.suspects.find((s) => s.id === suspectId);
    if (!suspect) return { ok: false, message: "请选择嫌疑人。" };
    const evidence = evidenceId ? caseData.evidence.find((e) => e.id === evidenceId) : undefined;
    const q = question.trim() || (evidence ? "这个你怎么解释？" : "");
    if (!q) return { ok: false, message: "请输入要追问的问题。" };

    const mem = memoryRef.current;
    const cost = evidence ? AP_COST.playerPresent : AP_COST.playerAsk;
    if (mem.ap < cost) return { ok: false, message: `行动点不足：需要 ${cost} 点，剩余 ${mem.ap} 点。` };
    mem.ap -= cost;
    syncMemory();

    const crack = evidence ? findTrigger(caseData, mem, suspect.id, evidence.id) : null;
    if (crack) mem.unlockedHidden.push(crack.id); // 先占位，避免重复触发

    const id = nextId();
    addItem({
      id,
      kind: "player",
      event: {
        kind: evidence ? "present" : "ask",
        suspectName: suspect.name,
        question: q,
        evidenceName: evidence?.name,
        pending: true,
        apCost: cost,
      },
    });
    setPlayerBusy(true);

    try {
      const reply = await suspectReply(
        configRef.current,
        caseData,
        suspect,
        {
          asker: "侦探长",
          question: q,
          presented: evidence,
          crack: crack ?? undefined,
          history: mem.conversations[suspect.id] ?? [],
        },
        playerAbortRef.current.signal
      );
      (mem.conversations[suspect.id] ??= []).push({ by: "侦探长", q, a: reply, evidence: evidence?.name });

      if (crack) {
        const clue = hiddenClueItem(crack);
        addClues([clue]);
        updatePlayer(id, { pending: false, reply, unlocked: clue, ok: true });
        addNote(
          `向${suspect.name}出示了「${evidence!.name}」，逼出了新的供述。${suspect.name}说：「${reply}」。确认的事实：${crack.content}`
        );
        syncMemory();
        return { ok: true, message: `击破！逼出新供述：${crack.title}` };
      }

      updatePlayer(id, { pending: false, reply, ok: !evidence ? undefined : false });
      addNote(
        evidence
          ? `向${suspect.name}出示了「${evidence.name}」并问：「${q}」，对方回答：「${reply}」（没有露出破绽）`
          : `追问了${suspect.name}：「${q}」，对方回答：「${reply}」`
      );
      return {
        ok: true,
        message: evidence ? `${suspect.name}没有被这件物证击破，换个物证或换个人试试。` : "已追问。",
      };
    } catch (e) {
      // 失败退还行动点，撤销占位
      mem.ap += cost;
      if (crack) mem.unlockedHidden = mem.unlockedHidden.filter((h) => h !== crack.id);
      syncMemory();
      if (isAbortError(e)) return { ok: false, message: "已取消。" };
      const msg = e instanceof Error ? e.message : String(e);
      updatePlayer(id, { pending: false, error: msg });
      return { ok: false, message: msg };
    } finally {
      setPlayerBusy(false);
    }
  };

  // ---------------- 侦探长：标记矛盾 ----------------

  const markContradiction = (a: string, b: string): ActionFeedback => {
    const mem = memoryRef.current;
    const done = caseData.contradictions.find(
      (ct) =>
        mem.markedContradictions.includes(ct.id) &&
        ct.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
    );
    if (done) return { ok: false, message: "这处矛盾已经确认过了。" };

    const pairText = `「${clueTitle(a)}」与「${clueTitle(b)}」`;
    const ct = checkMark(caseData, mem, a, b);
    if (ct) {
      mem.markedContradictions.push(ct.id);
      const clue = contradictionClue(ct);
      addClues([clue]);
      addItem({ id: nextId(), kind: "player", event: { kind: "mark", ok: true, text: pairText, unlocked: clue } });
      addNote(`在线索板上确认了一处矛盾：${ct.finding}`);
      syncMemory();
      return { ok: true, message: "矛盾成立！" };
    }

    const cost = Math.min(AP_COST.wrongMark, mem.ap);
    mem.ap -= cost;
    addItem({ id: nextId(), kind: "player", event: { kind: "mark", ok: false, text: pairText, apCost: cost } });
    syncMemory();
    return { ok: false, message: `这两条线索之间没有发现矛盾${cost ? `，扣除 ${cost} 行动点` : ""}。` };
  };

  // ---------------- 侦探长：最终指认 ----------------

  const accuse = async (suspectName: string, reasoning: string): Promise<ActionFeedback> => {
    abortRef.current?.abort();
    abortRef.current = null;
    pausedRef.current = false;
    setPhase(null);
    setJudging(true);
    let judge: { score: number; comment: string };
    try {
      judge = await judgeReasoning(configRef.current, caseData, suspectName, reasoning, playerAbortRef.current.signal);
    } catch (e) {
      if (isAbortError(e)) {
        setJudging(false);
        return { ok: false, message: "已取消。" };
      }
      judge = {
        score: suspectName === caseData.truth.culprit ? 10 : 0,
        comment: `推理评审没能完成（${e instanceof Error ? e.message : String(e)}），推理质量按默认分计算。`,
      };
    }
    const v = computeVerdict(caseData, memoryRef.current, suspectName, reasoning, judge);
    setVerdict(v);
    setStatus("success");
    setJudging(false);
    return { ok: true, message: "" };
  };

  const reset = useCallback(() => {
    abortRef.current?.abort();
    playerAbortRef.current.abort();
  }, []);

  return {
    status,
    phase,
    items,
    clues,
    currentStep,
    recommendation,
    verdict,
    stopNote,
    error,
    goal,
    playerBusy,
    judging,
    memory: memView,
    start,
    continueInvestigation,
    sendOrder,
    pause,
    resume,
    interrogate,
    markContradiction,
    accuse,
    restart: resetAll,
    reset,
  };
}
