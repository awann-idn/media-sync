export type HealthTone = "done" | "doing" | "blocked";
export type HealthLabel = "Sehat" | "Waspada" | "Kritis";

export interface HealthInput {
  onTime: number;
  participation: number;
  deadlockRounds: number;
  docCompliance: number;
}

export interface HealthResult {
  score: number;
  tone: HealthTone;
  label: HealthLabel;
  components: {
    onTime: number;
    participation: number;
    decisionStability: number;
    docCompliance: number;
  };
}

function ratio(value: number): number {
  const normalized = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, normalized));
}

export function computeHealth(input: HealthInput): HealthResult {
  const onTime = ratio(input.onTime);
  const participation = ratio(input.participation);
  const docCompliance = ratio(input.docCompliance);
  const decisionStability = 1 - Math.min(1, Math.max(0, input.deadlockRounds) / 3);

  const score = Math.round(
    100 *
      (0.35 * onTime +
        0.25 * participation +
        0.2 * decisionStability +
        0.2 * docCompliance),
  );

  const tone: HealthTone = score >= 75 ? "done" : score >= 50 ? "doing" : "blocked";
  const label: HealthLabel =
    score >= 75 ? "Sehat" : score >= 50 ? "Waspada" : "Kritis";

  return {
    score,
    tone,
    label,
    components: { onTime, participation, decisionStability, docCompliance },
  };
}
