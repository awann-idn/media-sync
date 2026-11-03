import { describe, expect, it } from "vitest";

import { computeAtRisk, type DependencyLike, type TaskLike } from "./blockers";

const now = new Date("2026-11-10T12:00:00Z");
const future = "2026-11-20T12:00:00Z";
const past = "2026-11-01T12:00:00Z";

const chain: TaskLike[] = [
  { id: "naskah", status: "IN_PROGRESS", internalDeadline: past },
  { id: "storyboard", status: "NOT_STARTED", internalDeadline: future },
  { id: "aset", status: "NOT_STARTED", internalDeadline: future },
  { id: "editing", status: "NOT_STARTED", internalDeadline: future },
  { id: "qc", status: "NOT_STARTED", internalDeadline: future },
  { id: "serah", status: "NOT_STARTED", internalDeadline: future },
];

const deps: DependencyLike[] = [
  { taskId: "storyboard", dependsOnTaskId: "naskah" },
  { taskId: "aset", dependsOnTaskId: "storyboard" },
  { taskId: "editing", dependsOnTaskId: "aset" },
  { taskId: "qc", dependsOnTaskId: "editing" },
  { taskId: "serah", dependsOnTaskId: "qc" },
];

describe("computeAtRisk", () => {
  it("marks every transitive successor of an overdue task", () => {
    const result = computeAtRisk(chain, deps, now);
    for (const id of ["naskah", "storyboard", "aset", "editing", "qc", "serah"]) {
      expect(result.has(id)).toBe(true);
    }
  });

  it("marks successors of a blocked task", () => {
    const tasks = chain.map((task) =>
      task.id === "storyboard" ? { ...task, status: "BLOCKED" } : task,
    );
    const result = computeAtRisk(tasks, deps, now);
    expect(result.has("storyboard")).toBe(true);
    expect(result.has("aset")).toBe(true);
    expect(result.has("editing")).toBe(true);
  });

  it("stops propagation through completed work", () => {
    const tasks = chain.map((task) =>
      task.id === "aset" ? { ...task, status: "COMPLETED" } : task,
    );
    const result = computeAtRisk(tasks, deps, now);
    expect(result.has("editing")).toBe(false);
    expect(result.has("qc")).toBe(false);
    expect(result.has("serah")).toBe(false);
  });

  it("does not mark tasks with future deadlines and no blockers", () => {
    const tasks = chain.map((task) => ({
      ...task,
      status: "IN_PROGRESS",
      internalDeadline: future,
    }));
    const result = computeAtRisk(tasks, deps, now);
    expect(result.size).toBe(0);
  });
});
