export interface TaskLike {
  id: string;
  status: string;
  internalDeadline: Date | string;
}

export interface DependencyLike {
  taskId: string;
  dependsOnTaskId: string;
}

export function computeAtRisk(
  tasks: TaskLike[],
  dependencies: DependencyLike[],
  now: Date = new Date(),
): Set<string> {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const successors = new Map<string, string[]>();

  for (const dependency of dependencies) {
    const list = successors.get(dependency.dependsOnTaskId) ?? [];
    list.push(dependency.taskId);
    successors.set(dependency.dependsOnTaskId, list);
  }

  const atRisk = new Set<string>();

  for (const task of tasks) {
    if (task.status === "COMPLETED") continue;
    const deadline = new Date(task.internalDeadline);
    const overdue = !Number.isNaN(deadline.getTime()) && now > deadline;
    if (task.status === "BLOCKED" || overdue) {
      atRisk.add(task.id);
    }
  }

  const queue = [...atRisk];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const next of successors.get(current) ?? []) {
      const task = byId.get(next);
      if (!task || task.status === "COMPLETED" || atRisk.has(next)) continue;
      atRisk.add(next);
      queue.push(next);
    }
  }

  return atRisk;
}
