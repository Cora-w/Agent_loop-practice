import { useEffect, useRef } from "react";
import type { AgentStatus, CaseData, TimelineItem, ToolResult, Verdict } from "../types";
import TimelineEntry from "./TimelineEntry";
import PlayerEntry from "./PlayerEntry";
import VerdictCard from "./VerdictCard";

interface Props {
  caseData: CaseData;
  items: TimelineItem[];
  status: AgentStatus;
  goal: string;
  verdict: Verdict | null;
  recommendation: ToolResult | null;
  stopNote: string | null;
  error: string | null;
}

export default function Timeline({ caseData, items, status, goal, verdict, recommendation, stopNote, error }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const loopOn = status === "running" || status === "paused";

  const agentSteps = items.filter((i) => i.kind === "agent").length;
  const lastAgentId = [...items].reverse().find((i) => i.kind === "agent")?.id;

  // 有新内容时滚到底部；出现结论时让结论卡片顶部可见
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const v = verdictRef.current;
    if (v) el.scrollTo({ top: v.offsetTop - 12, behavior: "smooth" });
    else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items, verdict, stopNote, error]);

  const empty = items.length === 0 && !error;

  return (
    <section className="timeline">
      <div className="timeline-head">
        <h2 className="timeline-title">调查时间线</h2>
        <span className="timeline-count">
          AI {agentSteps} 步 · 侦探长 {items.length - agentSteps} 次
        </span>
      </div>

      <div className="timeline-scroll" ref={scrollRef}>
        {empty ? (
          <div className="timeline-empty">
            <div className="empty-lens" aria-hidden="true" />
            <p className="empty-title">卷宗已就位，等待侦探出动</p>
            <p className="empty-sub">
              下达调查指令后，AI 侦探会按「观察、决策、行动、评估」自主推进。
              <br />
              你是侦探长：随时在下方审讯室追问嫌疑人、出示物证逼出破绽，
              <br />
              在线索板上标记矛盾，最后由你亲自指认真凶。
            </p>
          </div>
        ) : (
          <>
            {goal && (
              <div className="timeline-goal">
                <span className="goal-label">调查指令</span>
                <span className="goal-text">{goal}</span>
              </div>
            )}

            <ol className="timeline-list">
              {items.map((it) =>
                it.kind === "agent" ? (
                  <TimelineEntry
                    key={it.id}
                    step={it.step}
                    isLatest={it.id === lastAgentId}
                    running={loopOn}
                  />
                ) : (
                  <PlayerEntry key={it.id} event={it.event} />
                )
              )}
            </ol>

            {stopNote && !verdict && (
              <div className="final-answer">
                <div className="final-answer-label">
                  {recommendation ? `AI 侦探建议指认：${recommendation.accused}` : "AI 侦探已停下"}
                </div>
                <p>{stopNote}</p>
              </div>
            )}

            {error && !verdict && (
              <div className="timeline-error">
                <span className="error-label">调查中断</span>
                <p>{error}</p>
              </div>
            )}

            {verdict && (
              <div ref={verdictRef}>
                <VerdictCard caseData={caseData} verdict={verdict} recommendation={recommendation} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
