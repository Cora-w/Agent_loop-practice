import { useEffect, useRef } from "react";
import type { AgentStatus, CaseData, Judgement, Puzzle, TimelineStep } from "../types";
import TimelineEntry from "./TimelineEntry";
import VerdictCard from "./VerdictCard";

interface Props {
  caseData: CaseData;
  puzzle: Puzzle;
  steps: TimelineStep[];
  status: AgentStatus;
  judgement: Judgement | null;
  error: string | null;
}

export default function Timeline({ caseData, puzzle, steps, status, judgement, error }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const running = status === "running";

  // 有新内容时滚到底部；出现结论时让结论卡片顶部可见
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const v = verdictRef.current;
    if (v) el.scrollTo({ top: v.offsetTop - 12, behavior: "smooth" });
    else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [steps, judgement, error, status]);

  return (
    <section className="timeline">
      <div className="timeline-head">
        <h2 className="timeline-title">推理时间线</h2>
        <span className="timeline-count">{steps.length} 步</span>
      </div>

      <div className="timeline-scroll" ref={scrollRef}>
        {steps.length === 0 && !error ? (
          <div className="timeline-empty">
            <div className="empty-lens" aria-hidden="true" />
            <p className="empty-title">等待 AI 侦探出动</p>
            <p className="empty-sub">AI 的每一步思考、行动和结果都会按顺序记录在这里。</p>
          </div>
        ) : (
          <>
            <ol className="timeline-list">
              {steps.map((s, i) => (
                <TimelineEntry key={s.step} step={s} isLatest={i === steps.length - 1} running={running} />
              ))}
            </ol>

            {status === "judging" && (
              <div className="final-answer">
                <div className="final-answer-label">评审中</div>
                <p>
                  <span className="shimmer-text">评审正在按动机、机会、证据、排除他人给 AI 的推理链打分</span>
                </p>
              </div>
            )}

            {error && (
              <div className="timeline-error">
                <span className="error-label">推理中断</span>
                <p>{error}</p>
              </div>
            )}

            {judgement && (
              <div ref={verdictRef}>
                <VerdictCard caseData={caseData} puzzle={puzzle} judgement={judgement} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
