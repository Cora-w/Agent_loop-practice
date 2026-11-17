import type { CaseData, CardRole, PoolCard } from "../types";

export const ROLE_LABEL: Record<CardRole, string> = {
  true: "实线索",
  decoy: "虚线索",
  neutral: "中性",
};

export const KIND_LABEL = { evidence: "证据", plot: "剧情" } as const;

/** 交给 AI 的卡片数量限制 */
export const MIN_CARDS = 3;
export const MAX_CARDS = 12;

/**
 * 按指定的凶手生成卡池：
 * - 凶手的定罪卡 + 嫌疑卡：真线索
 * - 其他人的嫌疑卡：干扰线索
 * - 中性材料：中性
 * 其他人的定罪卡不会出现（它们与设定的真相矛盾）。
 */
export function buildPool(c: CaseData, culpritId: string): PoolCard[] {
  const out: PoolCard[] = [];
  const kit = c.kits.find((k) => k.suspectId === culpritId);
  if (kit) {
    kit.proof.forEach((card) => out.push({ card, role: "true" }));
    kit.suspicion.forEach((card) => out.push({ card, role: "true" }));
  }
  c.kits
    .filter((k) => k.suspectId !== culpritId)
    .forEach((k) => k.suspicion.forEach((card) => out.push({ card, role: "decoy" })));
  c.neutralCards.forEach((card) => out.push({ card, role: "neutral" }));
  return out;
}

/** 卡池总数（展示用） */
export function poolSize(c: CaseData): number {
  const kit = c.kits[0];
  return c.neutralCards.length + (kit ? kit.proof.length + kit.suspicion.length : 0) +
    c.kits.slice(1).reduce((n, k) => n + k.suspicion.length, 0);
}

/** 打乱顺序，避免卡片排列泄露真假 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
