import { useEffect, useState } from "react";
import type { TimelineStep } from "../types";
import { PARAM_LABELS, TOOL_LABELS } from "../lib/tools";

interface Props {
  step: TimelineStep;
  isLatest: boolean;
  running: boolean;
}

const LONG_RESULT = 260;

/** 逐字打出思考内容；挂载时 animate=false 则直接显示全文 */
function Typewriter({ text, animate }: { text: string; animate: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) return;
    const perTick = Math.max(1, Math.ceil(text.length / 70)); // 约 1.1 秒内打完
    const id = window.setInterval(() => {
      setShown((n) => {
        const next = Math.min(text.length, n + perTick);
        if (next >= text.length) window.clearInterval(id);
        return next;
      });
    }, 16);
    return () => window.clearInterval(id);
  }, [text, animate]);

  const typing = animate && shown < text.length;
  return (
    <p>
      {animate ? text.slice(0, shown) : text}
      {typing && <span className="caret" aria-hidden="true" />}
    </p>
  );
}

/** 加载占位：扫光文字 + 骨架线 */
function Loading({ label, lines = 0 }: { label: string; lines?: number }) {
  return (
    <div className="loading">
      <span className="shimmer-text">{label}</span>
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="skeleton-line" style={{ width: `${88 - i * 30}%` }} />
      ))}
    </div>
  );
}

export default function TimelineEntry({ step, isLatest, running }: Props) {
  const { thinking, action, result } = step;
  const [expanded, setExpanded] = useState(false);
  const pending = isLatest && running && !result;
  // 只有在进行中挂载/更新的思考才做打字效果
  const [animateThinking] = useState(pending && !thinking);

  const resultText = result ? (result.success ? result.result ?? "" : result.error ?? "未知错误") : "";
  const isLong = resultText.length > LONG_RESULT;
  const shownText = isLong && !expanded ? resultText.slice(0, LONG_RESULT) + "……" : resultText;

  return (
    <li className={`tl-entry ${pending ? "is-pending" : ""}`}>
      <div className="tl-rail">
        <span className="tl-badge">{step.step}</span>
        <span className="tl-line" />
      </div>

      <div className="tl-body">
        {/* 思考 */}
        {thinking ? (
          <div className="tl-thinking">
            <span className="tl-tag">THINKING</span>
            <Typewriter key={thinking} text={thinking} animate={animateThinking && pending} />
          </div>
        ) : (
          pending &&
          !action && (
            <div className="tl-thinking is-waiting">
              <span className="tl-tag">THINKING</span>
              <Loading label="侦探正在思考" lines={2} />
            </div>
          )
        )}

        {/* 行动 */}
        {action && (
          <div className={`tl-action ${action.tool === "makeAccusation" ? "is-final" : ""}`}>
            <div className="tl-action-head">
              <span className="tl-tag">ACTION</span>
              <code className="tl-tool">{action.tool}</code>
              <span className="tl-tool-label">{TOOL_LABELS[action.tool] ?? "未知工具"}</span>
            </div>
            {Object.keys(action.input).length > 0 ? (
              <dl className="tl-params">
                {Object.entries(action.input).map(([k, v]) => (
                  <div key={k} className="tl-param">
                    <dt>
                      <code>{k}</code>
                      {PARAM_LABELS[k] && <span>{PARAM_LABELS[k]}</span>}
                    </dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="tl-noparam">
                <code>()</code> 无参数
              </div>
            )}
          </div>
        )}

        {/* 结果 */}
        {action && !result && pending && (
          <div className="tl-result is-waiting">
            <span className="tl-tag">RESULT</span>
            <Loading label={`正在执行 ${TOOL_LABELS[action.tool] ?? action.tool}`} lines={1} />
          </div>
        )}
        {result && (
          <div className={`tl-result ${result.success ? "is-ok" : "is-fail"}`}>
            <div className="tl-result-head">
              <span className="tl-tag">{result.success ? "RESULT" : "ERROR"}</span>
              {result.clues && result.clues.length > 0 && (
                <span className="tl-clue-note">+{result.clues.length} 条线索</span>
              )}
            </div>
            <pre className="tl-result-text">{shownText}</pre>
            {isLong && (
              <button className="tl-expand" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "收起" : "展开全文"}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
