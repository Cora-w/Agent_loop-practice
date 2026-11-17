import type { CaseData, ScoreLine, Verdict } from "../types";
import type { InvestigationMemory } from "./tools";

/**
 * 评分（满分 100）
 * - 指认真凶 40
 * - 推理质量 20（AI 评审）
 * - 确认矛盾 20（每处 5 分）
 * - 逼出供述 15（每条 3 分）
 * - 节约行动点 5
 * 指认错误直接评为 D。
 */
export function computeVerdict(
  c: CaseData,
  mem: InvestigationMemory,
  accused: string,
  reasoning: string,
  judge: { score: number; comment: string }
): Verdict {
  const correct = accused === c.truth.culprit;
  const ctMax = c.contradictions.length * 5;
  const hcMax = Math.min(15, c.hiddenClues.length * 3);

  const breakdown: ScoreLine[] = [
    { label: "指认真凶", points: correct ? 40 : 0, max: 40 },
    { label: "推理质量", points: judge.score, max: 20 },
    { label: "确认矛盾", points: Math.min(ctMax, mem.markedContradictions.length * 5), max: ctMax },
    { label: "逼出供述", points: Math.min(hcMax, mem.unlockedHidden.length * 3), max: hcMax },
    { label: "节约行动点", points: Math.round((Math.max(0, mem.ap) / c.apBudget) * 5), max: 5 },
  ];
  const total = breakdown.reduce((sum, l) => sum + l.points, 0);
  const grade: Verdict["grade"] = !correct
    ? "D"
    : total >= 90
      ? "S"
      : total >= 78
        ? "A"
        : total >= 64
          ? "B"
          : "C";

  return { accused, reasoning, correct, judgeComment: judge.comment, breakdown, total, grade };
}
