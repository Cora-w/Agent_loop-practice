import type { ApiConfig, CaseData } from "../types";
import { CASES } from "../data/cases";
import { isConfigReady } from "../lib/model";
import CaseCard from "./CaseCard";

interface Props {
  apiConfig: ApiConfig;
  onSelectCase: (c: CaseData) => void;
  onOpenApi: () => void;
}

export default function HomePage({ apiConfig, onSelectCase, onOpenApi }: Props) {
  const ready = isConfigReady(apiConfig);

  return (
    <div className="home">
      <header className="home-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">DETECTIVE AGENT</span>
        </div>
        <button className={`btn btn-ghost api-btn ${ready ? "is-ready" : ""}`} onClick={onOpenApi}>
          {ready && <span className="check-mark" aria-hidden="true" />}
          {ready ? "OpenRouter 已连接" : "填写 OpenRouter Key"}
        </button>
      </header>

      <section className="hero">
        <p className="hero-kicker">TRUE OR FALSE</p>
        <h1 className="hero-title">
          虚<span className="hero-title-accent">实</span>
        </h1>
        <p className="hero-desc">
          线索有虚有实，虚实由你来定。
          <br />
          它只能在你给的虚实之间，找到那唯一的实。
        </p>
      </section>

      <section className="case-section">
        <div className="section-head">
          <h2 className="section-title">案件卷宗</h2>
          <span className="section-sub">共 {CASES.length} 宗待破悬案</span>
        </div>
        <div className="case-grid">
          {CASES.map((c, i) => (
            <CaseCard key={c.id} caseData={c} index={i} onClick={() => onSelectCase(c)} />
          ))}
        </div>
      </section>

      <footer className="home-footer">
        由 OpenRouter · GPT-5.6 Luna 驱动 · API Key 仅保存在本地浏览器
      </footer>
    </div>
  );
}
