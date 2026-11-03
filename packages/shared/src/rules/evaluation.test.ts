import { describe, expect, it } from "vitest";

import {
  aggregateEvaluation,
  categorizeEvaluation,
  type EvaluationEntry,
} from "./evaluation";

describe("categorizeEvaluation", () => {
  it("maps boundaries 25/18", () => {
    expect(categorizeEvaluation(30)).toBe("EXCELLENT");
    expect(categorizeEvaluation(25)).toBe("EXCELLENT");
    expect(categorizeEvaluation(24)).toBe("MODERATE");
    expect(categorizeEvaluation(18)).toBe("MODERATE");
    expect(categorizeEvaluation(17)).toBe("INTERVENTION_NEEDED");
  });
});

describe("aggregateEvaluation", () => {
  const all = (score: number, isSelf: boolean): EvaluationEntry[] =>
    (["A1", "A2", "A3", "D1", "D2", "D3"] as const).map((indicator) => ({
      indicator,
      score,
      isSelf,
    }));

  it("returns 30/EXCELLENT when everyone gives 5", () => {
    const result = aggregateEvaluation([...all(5, false), ...all(5, true)]);
    expect(result.activeScore).toBe(15);
    expect(result.disciplineScore).toBe(15);
    expect(result.totalScore).toBe(30);
    expect(result.category).toBe("EXCELLENT");
  });

  it("returns 6/INTERVENTION_NEEDED when everyone gives 1", () => {
    const result = aggregateEvaluation([...all(1, false), ...all(1, true)]);
    expect(result.totalScore).toBe(6);
    expect(result.category).toBe("INTERVENTION_NEEDED");
  });

  it("applies 80/20 peer/self weighting", () => {
    const entries: EvaluationEntry[] = (["A1", "A2", "A3", "D1", "D2", "D3"] as const).map(
      (indicator) => ({ indicator, score: 5, isSelf: false }),
    );
    entries.push(
      ...(["A1", "A2", "A3", "D1", "D2", "D3"] as const).map((indicator) => ({
        indicator,
        score: 1,
        isSelf: true,
      })),
    );

    const result = aggregateEvaluation(entries);
    expect(result.indicators[0]?.finalScore).toBe(4);
    expect(result.totalScore).toBe(24);
    expect(result.category).toBe("MODERATE");
  });

  it("falls back to peer score when self score is missing", () => {
    const result = aggregateEvaluation([
      { indicator: "A1", score: 4 },
      { indicator: "A1", score: 2 },
    ]);
    expect(result.indicators[0]?.finalScore).toBe(3);
    expect(result.totalScore).toBe(3);
  });
});
