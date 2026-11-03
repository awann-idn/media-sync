export const INDICATORS = ["A1", "A2", "A3", "D1", "D2", "D3"] as const;
export type Indicator = (typeof INDICATORS)[number];

export const ACTIVE_INDICATORS: Indicator[] = ["A1", "A2", "A3"];
export const DISCIPLINE_INDICATORS: Indicator[] = ["D1", "D2", "D3"];

export type EvaluationCategory =
  | "EXCELLENT"
  | "MODERATE"
  | "INTERVENTION_NEEDED";

export interface EvaluationEntry {
  indicator: Indicator;
  score: number;
  isSelf?: boolean;
}

export interface IndicatorScore {
  indicator: Indicator;
  peerScore: number;
  selfScore: number | null;
  finalScore: number;
}

export interface AggregatedEvaluation {
  activeScore: number;
  disciplineScore: number;
  totalScore: number;
  category: EvaluationCategory;
  indicators: IndicatorScore[];
}

export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

export function categorizeEvaluation(total: number): EvaluationCategory {
  if (total >= 25) return "EXCELLENT";
  if (total >= 18) return "MODERATE";
  return "INTERVENTION_NEEDED";
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function aggregateEvaluation(
  entries: EvaluationEntry[],
  peerWeight = 0.8,
): AggregatedEvaluation {
  const safeWeight = Math.min(1, Math.max(0, peerWeight));

  const indicators: IndicatorScore[] = INDICATORS.map((indicator) => {
    const peerScores = entries
      .filter((entry) => entry.indicator === indicator && !entry.isSelf)
      .map((entry) => entry.score);
    const selfScores = entries
      .filter((entry) => entry.indicator === indicator && entry.isSelf)
      .map((entry) => entry.score);

    const peerMean = peerScores.length > 0 ? mean(peerScores) : null;
    const selfMean = selfScores.length > 0 ? mean(selfScores) : null;

    let value: number;
    if (peerMean === null && selfMean === null) {
      value = 0;
    } else if (peerMean === null) {
      value = selfMean ?? 0;
    } else if (selfMean === null) {
      value = peerMean;
    } else {
      value = safeWeight * peerMean + (1 - safeWeight) * selfMean;
    }

    return {
      indicator,
      peerScore: peerMean === null ? 0 : roundHalfUp(peerMean * 10) / 10,
      selfScore: selfMean === null ? null : roundHalfUp(selfMean * 10) / 10,
      finalScore: roundHalfUp(value),
    };
  });

  const scoreFor = (list: Indicator[]) =>
    indicators
      .filter((item) => list.includes(item.indicator))
      .reduce((sum, item) => sum + item.finalScore, 0);

  const activeScore = scoreFor(ACTIVE_INDICATORS);
  const disciplineScore = scoreFor(DISCIPLINE_INDICATORS);
  const totalScore = activeScore + disciplineScore;

  return {
    activeScore,
    disciplineScore,
    totalScore,
    category: categorizeEvaluation(totalScore),
    indicators,
  };
}
