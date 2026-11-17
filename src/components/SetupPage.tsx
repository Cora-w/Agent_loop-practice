import { useMemo, useState } from "react";
import type { ApiConfig, Card, CardRole, CaseData, PoolCard, Puzzle } from "../types";
import { KIND_LABEL, MAX_CARDS, MIN_CARDS, ROLE_LABEL, buildPool, shuffle } from "../lib/pool";
import { isConfigReady } from "../lib/model";

interface Props {
  caseData: CaseData;
  initial: Puzzle | null;
  apiConfig: ApiConfig;
  onBack: () => void;
  onStart: (p: Puzzle) => void;
  onOpenApi: (hint?: string) => void;
}

type Filter = "all" | CardRole;

let customSeq = 0;

/** 出题：指定凶手，挑选交给 AI 的证据和剧情 */
export default function SetupPage({ caseData, initial, apiConfig, onBack, onStart, onOpenApi }: Props) {
  const [culpritId, setCulpritId] = useState<string | null>(initial?.culpritId ?? null);
  const [customCards, setCustomCards] = useState<PoolCard[]>(initial?.cards.filter((pc) => pc.custom) ?? []);
  const [selected, setSelected] = useState<string[]>(initial?.cards.map((pc) => pc.card.id) ?? []);
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);

  const pool = useMemo<PoolCard[]>(
    () => (culpritId ? [...buildPool(caseData, culpritId), ...customCards] : []),
    [caseData, culpritId, customCards]
  );
  const hand = pool.filter((pc) => selected.includes(pc.card.id));
  const shown = filter === "all" ? pool : pool.filter((pc) => pc.role === filter);
  const count = (role: CardRole, list: PoolCard[]) => list.filter((pc) => pc.role === role).length;
  const nameOf = (id: string) => caseData.suspects.find((s) => s.id === id)?.name ?? id;

  const chooseCulprit = (id: string) => {
    if (id === culpritId) return;
    setCulpritId(id);
    // 换凶手后，原来选中的真线索 / 干扰卡失效，只保留中性卡与自定义卡
    const keep = new Set([...caseData.neutralCards.map((c) => c.id), ...customCards.map((pc) => pc.card.id)]);
    setSelected((prev) => prev.filter((cid) => keep.has(cid)));
  };

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_CARDS ? prev : [...prev, id]
    );

  const addMany = (ids: string[]) =>
    setSelected((prev) => {
      const next = [...prev];
      ids.forEach((id) => {
        if (!next.includes(id) && next.length < MAX_CARDS) next.push(id);
      });
      return next;
    });

  const pickTrue = () => addMany(pool.filter((pc) => pc.role === "true").map((pc) => pc.card.id));
  const pickDecoys = () =>
    addMany(
      shuffle(pool.filter((pc) => pc.role === "decoy" && !selected.includes(pc.card.id)))
        .slice(0, 2)
        .map((pc) => pc.card.id)
    );
  const pickStatements = () =>
    addMany(pool.filter((pc) => pc.role === "neutral" && pc.card.kind === "plot").map((pc) => pc.card.id));

  const addCustom = (card: Card, role: CardRole) => {
    setCustomCards((prev) => [...prev, { card, role, custom: true }]);
    setSelected((prev) => (prev.length >= MAX_CARDS ? prev : [...prev, card.id]));
    setFormOpen(false);
  };

  const removeCustom = (id: string) => {
    setCustomCards((prev) => prev.filter((pc) => pc.card.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const warnings: string[] = [];
  if (culpritId && hand.length > 0 && count("true", hand) === 0) {
    warnings.push("手牌里一张实线索都没有，AI 几乎不可能找到真凶。");
  }
  if (count("decoy", hand) > count("true", hand) && count("true", hand) > 0) {
    warnings.push("虚多于实，这是一个很难的局。");
  }

  const canStart = !!culpritId && hand.length >= MIN_CARDS && hand.length <= MAX_CARDS;

  const start = () => {
    if (!canStart || !culpritId) return;
    if (!isConfigReady(apiConfig)) {
      onOpenApi("把题交给 AI 之前，请先填写 OpenRouter API Key。");
      return;
    }
    onStart({ caseId: caseData.id, culpritId, cards: hand });
  };

  return (
    <div className="investigate setup">
      <header className="inv-header">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          返回案件
        </button>
        <div className="inv-title">
          <span className="inv-title-icon">{caseData.icon}</span>
          <h1>{caseData.title}</h1>
          <span className="inv-difficulty">布局</span>
        </div>
        <div className="inv-header-right">
          <span className="setup-steps">
            <span className={culpritId ? "is-done" : "is-active"}>01 定下真凶</span>
            <span className={!culpritId ? "" : hand.length >= MIN_CARDS ? "is-done" : "is-active"}>02 布置虚实</span>
            <span className={canStart ? "is-active" : ""}>03 交给 AI</span>
          </span>
        </div>
      </header>

      <div className="inv-grid setup-grid">
        {/* 左：案情 + 指定凶手 */}
        <aside className="inv-col inv-left">
          <div className="panel-block">
            <div className="panel-label">案情卷宗</div>
            <h2 className="panel-case-title">{caseData.title}</h2>
            <dl className="panel-facts">
              <div>
                <dt>时间</dt>
                <dd>{caseData.time}</dd>
              </div>
              <div>
                <dt>地点</dt>
                <dd>{caseData.location}</dd>
              </div>
            </dl>
            <p className="panel-brief">{caseData.brief}</p>
          </div>
          <div className="panel-block">
            <div className="panel-label">
              01 定下真凶 <span className="panel-tip">只有你知道</span>
            </div>
            <ul className="suspect-list">
              {caseData.suspects.map((s) => (
                <li
                  key={s.id}
                  className={`suspect-card is-selectable ${culpritId === s.id ? "is-culprit" : ""}`}
                  onClick={() => chooseCulprit(s.id)}
                >
                  <div className="suspect-avatar" aria-hidden="true">
                    {s.name.charAt(0)}
                  </div>
                  <div className="suspect-body">
                    <div className="suspect-name-row">
                      <span className="suspect-name">{s.name}</span>
                      {culpritId === s.id && <span className="accused-tag">凶手</span>}
                    </div>
                    <div className="suspect-role">{s.role}</div>
                    <div className="suspect-info">{s.info}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* 中：卡池 */}
        <main className="inv-col inv-center setup-center">
          {!culpritId ? (
            <div className="timeline-empty">
              <div className="empty-lens" aria-hidden="true" />
              <p className="empty-title">先在左边定下真凶</p>
              <p className="empty-sub">
                实，是指向真凶的线索；虚，是落在旁人身上的疑云。
                <br />
                给它多少实、掺多少虚，由你决定。
              </p>
            </div>
          ) : (
            <>
              <section className="pool-head">
                <div>
                  <h2 className="instruction-title">02 布置虚实</h2>
                  <p className="instruction-hint">
                    AI 看不到哪张是虚、哪张是实，它只能自己分辨。
                  </p>
                </div>
                <div className="pool-actions">
                  <button className="chip" onClick={pickTrue}>
                    加入全部实线索
                  </button>
                  <button className="chip" onClick={pickDecoys}>
                    随机加 2 张虚线索
                  </button>
                  <button className="chip" onClick={pickStatements}>
                    加入全部证词
                  </button>
                  <button className="chip" onClick={() => setSelected([])}>
                    清空
                  </button>
                </div>
                <div className="pool-filters">
                  {(["all", "true", "decoy", "neutral"] as Filter[]).map((f) => (
                    <button
                      key={f}
                      className={`pool-filter ${filter === f ? "is-active" : ""}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === "all" ? "全部" : ROLE_LABEL[f]}
                      <em>{f === "all" ? pool.length : count(f, pool)}</em>
                    </button>
                  ))}
                  <button className="pool-filter pool-add" onClick={() => setFormOpen((v) => !v)}>
                    {formOpen ? "收起" : "+ 自定义卡片"}
                  </button>
                </div>
              </section>

              {formOpen && <CustomCardForm caseData={caseData} onAdd={addCustom} />}

              <div className="pool-scroll">
                <ul className="pool-grid">
                  {shown.map((pc) => {
                    const on = selected.includes(pc.card.id);
                    return (
                      <li
                        key={pc.card.id}
                        className={`pool-card role-${pc.role} ${on ? "is-on" : ""}`}
                        onClick={() => toggle(pc.card.id)}
                      >
                        <div className="pool-card-head">
                          <span className="pick-box" aria-hidden="true" />
                          <span className={`role-tag role-tag-${pc.role}`}>{ROLE_LABEL[pc.role]}</span>
                          <span className="kind-tag">{KIND_LABEL[pc.card.kind]}</span>
                          {pc.custom && <span className="kind-tag">自定义</span>}
                        </div>
                        <div className="pool-card-title">{pc.card.title}</div>
                        <p className="pool-card-content">{pc.card.content}</p>
                        <div className="pool-card-foot">
                          {pc.card.suspectIds.length ? `涉及：${pc.card.suspectIds.map(nameOf).join("、")}` : "案情客观记录"}
                          {pc.custom && (
                            <button
                              className="link-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCustom(pc.card.id);
                              }}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </main>

        {/* 右：手牌 */}
        <aside className="inv-col inv-right">
          <div className="clue-board">
            <div className="clue-head">
              <h2 className="clue-title">03 交给 AI 的卡片</h2>
              <span className="clue-count">
                {hand.length}
                <em>/{MAX_CARDS}</em>
              </span>
            </div>
            <div className="clue-legend">
              <span className="legend-item legend-true">
                <span className="legend-dot" />
                实 {count("true", hand)}
              </span>
              <span className="legend-item legend-decoy">
                <span className="legend-dot" />
                虚 {count("decoy", hand)}
              </span>
              <span className="legend-item legend-neutral">
                <span className="legend-dot" />
                中性 {count("neutral", hand)}
              </span>
            </div>

            {hand.length === 0 ? (
              <div className="clue-empty">
                <p>从卡池里点选卡片，至少 {MIN_CARDS} 张，最多 {MAX_CARDS} 张。</p>
              </div>
            ) : (
              <ul className="hand-list">
                {hand.map((pc) => (
                  <li key={pc.card.id} className={`hand-item role-${pc.role}`}>
                    <span className={`role-tag role-tag-${pc.role}`}>{ROLE_LABEL[pc.role]}</span>
                    <span className="hand-title">{pc.card.title}</span>
                    <button className="link-btn" onClick={() => toggle(pc.card.id)} aria-label="移除">
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {warnings.map((w) => (
              <p key={w} className="setup-warning">
                {w}
              </p>
            ))}

            <button className="btn btn-primary setup-start" onClick={start} disabled={!canStart}>
              交给 AI 推理
            </button>
            <p className="setup-note">
              {!culpritId
                ? "先定下真凶。"
                : hand.length < MIN_CARDS
                  ? `还差 ${MIN_CARDS - hand.length} 张卡。`
                  : "AI 会按「观察、决策、行动、评估」逐步推理，最后说出一个名字。"}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 自定义卡片表单
// ---------------------------------------------------------------------

function CustomCardForm({ caseData, onAdd }: { caseData: CaseData; onAdd: (card: Card, role: CardRole) => void }) {
  const [kind, setKind] = useState<Card["kind"]>("evidence");
  const [role, setRole] = useState<CardRole>("decoy");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [suspectIds, setSuspectIds] = useState<string[]>([]);

  const can = title.trim().length > 0 && content.trim().length > 0;

  const submit = () => {
    if (!can) return;
    onAdd(
      { id: `custom-${Date.now()}-${customSeq++}`, kind, title: title.trim(), content: content.trim(), suspectIds },
      role
    );
  };

  return (
    <section className="custom-form">
      <div className="custom-row">
        <div className="seg">
          {(["evidence", "plot"] as const).map((k) => (
            <button key={k} className={kind === k ? "is-active" : ""} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="seg">
          {(["true", "decoy", "neutral"] as CardRole[]).map((r) => (
            <button key={r} className={role === r ? "is-active" : ""} onClick={() => setRole(r)}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>
      <input
        className="text-input"
        placeholder="卡片标题，例如：楼下便利店的小票"
        value={title}
        maxLength={30}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="text-input text-area"
        rows={3}
        placeholder="卡片内容：写清时间、人物和事实，AI 会把它当作真实材料来读"
        value={content}
        maxLength={300}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="custom-row">
        <span className="custom-label">涉及</span>
        {caseData.suspects.map((s) => (
          <button
            key={s.id}
            className={`chip ${suspectIds.includes(s.id) ? "is-active" : ""}`}
            onClick={() =>
              setSuspectIds((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))
            }
          >
            {s.name}
          </button>
        ))}
        <button className="btn btn-primary custom-add" disabled={!can} onClick={submit}>
          加入卡池
        </button>
      </div>
      <p className="setup-note">「实 / 虚 / 中性」只用于判定 AI 是否用对证据，AI 看不到。</p>
    </section>
  );
}
