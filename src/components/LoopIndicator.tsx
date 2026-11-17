import type { ReactNode } from "react";
import type { LoopPhase } from "../types";

interface Props {
  phase: LoopPhase;
  step: number;
  running: boolean;
  paused?: boolean;
  completed: boolean;
}

type Phase = Exclude<LoopPhase, null>;

const PHASES: { key: Phase; label: string; en: string; icon: ReactNode }[] = [
  {
    key: "observe",
    label: "观察",
    en: "OBSERVE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: "decide",
    label: "决策",
    en: "DECIDE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "act",
    label: "行动",
    en: "ACT",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round">
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    ),
  },
  {
    key: "evaluate",
    label: "评估",
    en: "EVALUATE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    ),
  },
];

/**
 * Agent Loop 四阶段：观察 / 决策 / 行动 / 评估。
 * 每个阶段顶部一条细线：已完成为实线，进行中为扫光动画，未到达为浅灰。
 */
export default function LoopIndicator({ phase, step, running, paused, completed }: Props) {
  const activeIndex = PHASES.findIndex((p) => p.key === phase);

  return (
    <section className={`loop-indicator ${running ? "is-running" : ""}`}>
      <div className="loop-steps">
        {PHASES.map((p, i) => {
          const state =
            i === activeIndex ? "is-active" : completed || (activeIndex >= 0 && i < activeIndex) ? "is-done" : "";
          return (
            <div key={p.key} className={`loop-node ${state}`}>
              <span className="loop-bar" aria-hidden="true">
                <i />
              </span>
              <span className="loop-node-main">
                <span className="loop-icon">{p.icon}</span>
                <span className="loop-label">{p.label}</span>
                <span className="loop-en">{p.en}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="loop-counter">
        <span className="loop-counter-label">{paused ? "PAUSED" : "LOOP"}</span>
        <span className="loop-counter-value">{String(step).padStart(2, "0")}</span>
      </div>
    </section>
  );
}
