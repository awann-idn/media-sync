export interface DecisionCriterion {
  id: string;
  weight: number;
  minThreshold?: number | null;
}

export type DecisionMethod = "CONSENSUS" | "MAJORITY" | "PM_TIEBREAK";

export interface RankedIdea {
  id: string;
  score: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeDecisionScore(
  criteria: DecisionCriterion[],
  scores: Record<string, number[]>,
): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const values = scores[criterion.id] ?? [];
    if (values.length === 0 || criterion.weight <= 0) continue;
    weighted += criterion.weight * mean(values);
    totalWeight += criterion.weight;
  }

  if (totalWeight === 0) return 0;

  const normalized = weighted / (5 * totalWeight);
  return Math.round(normalized * 1000) / 10;
}

export function failedThresholds(
  criteria: DecisionCriterion[],
  scores: Record<string, number[]>,
): DecisionCriterion[] {
  return criteria.filter((criterion) => {
    if (criterion.minThreshold === null || criterion.minThreshold === undefined) {
      return false;
    }
    const values = scores[criterion.id] ?? [];
    if (values.length === 0) return false;
    return mean(values) < criterion.minThreshold;
  });
}

export function isEliminated(
  criteria: DecisionCriterion[],
  scores: Record<string, number[]>,
): boolean {
  return failedThresholds(criteria, scores).length > 0;
}

export function determineDecisionMethod(
  ranked: RankedIdea[],
  allAgree: boolean,
): { method: DecisionMethod; winnerId: string | null; needsTiebreak: boolean } {
  const sorted = [...ranked].sort((a, b) => b.score - a.score);
  const top = sorted[0];

  if (!top) {
    return { method: "PM_TIEBREAK", winnerId: null, needsTiebreak: true };
  }

  if (allAgree) {
    return { method: "CONSENSUS", winnerId: top.id, needsTiebreak: false };
  }

  const runnerUp = sorted[1];
  if (!runnerUp || top.score - runnerUp.score >= 5) {
    return { method: "MAJORITY", winnerId: top.id, needsTiebreak: false };
  }

  return { method: "PM_TIEBREAK", winnerId: null, needsTiebreak: true };
}

export function withinPrototypeRange(a: number, b: number): boolean {
  return Math.abs(a - b) <= 5;
}
