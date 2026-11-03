import { describe, expect, it } from "vitest";

import { computeHealth } from "./health";

describe("computeHealth", () => {
  it("returns 100/Sehat when all metrics are perfect", () => {
    const result = computeHealth({
      onTime: 1,
      participation: 1,
      deadlockRounds: 0,
      docCompliance: 1,
    });
    expect(result.score).toBe(100);
    expect(result.tone).toBe("done");
    expect(result.label).toBe("Sehat");
  });

  it("returns 20/Kritis when only decision stability contributes", () => {
    const result = computeHealth({
      onTime: 0,
      participation: 0,
      deadlockRounds: 0,
      docCompliance: 0,
    });
    expect(result.score).toBe(20);
    expect(result.tone).toBe("blocked");
    expect(result.label).toBe("Kritis");
  });

  it("drops decision stability to zero after three deadlock rounds", () => {
    const result = computeHealth({
      onTime: 1,
      participation: 1,
      deadlockRounds: 3,
      docCompliance: 1,
    });
    expect(result.components.decisionStability).toBe(0);
    expect(result.score).toBe(80);
  });

  it("accepts percentages as well as ratios", () => {
    const result = computeHealth({
      onTime: 85,
      participation: 90,
      deadlockRounds: 1,
      docCompliance: 100,
    });
    expect(result.score).toBeGreaterThanOrEqual(75);
  });
});
