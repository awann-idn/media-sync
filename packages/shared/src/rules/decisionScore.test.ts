import { describe, expect, it } from "vitest";

import {
  computeDecisionScore,
  determineDecisionMethod,
  failedThresholds,
  isEliminated,
  withinPrototypeRange,
  type DecisionCriterion,
} from "./decisionScore";

const criteria: DecisionCriterion[] = [
  { id: "goal", weight: 20 },
  { id: "feasibility", weight: 15, minThreshold: 3 },
  { id: "timeline", weight: 10 },
];

describe("computeDecisionScore", () => {
  it("returns 100 for all fives", () => {
    expect(
      computeDecisionScore(criteria, {
        goal: [5],
        feasibility: [5],
        timeline: [5],
      }),
    ).toBe(100);
  });

  it("returns 20 for all ones", () => {
    expect(
      computeDecisionScore(criteria, {
        goal: [1],
        feasibility: [1],
        timeline: [1],
      }),
    ).toBe(20);
  });

  it("rounds to one decimal", () => {
    const value = computeDecisionScore([{ id: "a", weight: 1 }], {
      a: [4, 5],
    });
    expect(value).toBe(90);
  });
});

describe("failedThresholds", () => {
  it("eliminates an idea with feasibility 2.4 even when the total is high", () => {
    const scores = {
      goal: [5],
      feasibility: [2.4],
      timeline: [5],
    };
    const failed = failedThresholds(criteria, scores);
    expect(failed.map((item) => item.id)).toEqual(["feasibility"]);
    expect(isEliminated(criteria, scores)).toBe(true);
  });

  it("does not eliminate when the mean meets the threshold", () => {
    expect(
      isEliminated(criteria, {
        goal: [5],
        feasibility: [3],
        timeline: [5],
      }),
    ).toBe(false);
  });
});

describe("determineDecisionMethod", () => {
  it("uses consensus when everyone agrees", () => {
    expect(
      determineDecisionMethod(
        [
          { id: "a", score: 90 },
          { id: "b", score: 80 },
        ],
        true,
      ),
    ).toEqual({ method: "CONSENSUS", winnerId: "a", needsTiebreak: false });
  });

  it("uses majority when the leader is 5 points ahead", () => {
    expect(
      determineDecisionMethod(
        [
          { id: "a", score: 90 },
          { id: "b", score: 80 },
        ],
        false,
      ),
    ).toEqual({ method: "MAJORITY", winnerId: "a", needsTiebreak: false });
  });

  it("requires a PM tie-break when the gap is under 5", () => {
    expect(
      determineDecisionMethod(
        [
          { id: "a", score: 90 },
          { id: "b", score: 88 },
        ],
        false,
      ),
    ).toEqual({ method: "PM_TIEBREAK", winnerId: null, needsTiebreak: true });
  });
});

describe("withinPrototypeRange", () => {
  it("allows ideas within five points", () => {
    expect(withinPrototypeRange(90, 85)).toBe(true);
    expect(withinPrototypeRange(90, 84.9)).toBe(false);
  });
});
