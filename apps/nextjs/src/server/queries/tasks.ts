import { prisma } from "@mediasync/db";
import { computeAtRisk } from "@mediasync/shared";

const DAY = 24 * 60 * 60 * 1000;

export async function listTasks(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    include: {
      assignedUser: { include: { role: true } },
      backupUser: true,
      dependencies: {
        include: {
          dependsOnTask: {
            select: { id: true, title: true, status: true, stepNo: true },
          },
        },
      },
    },
    orderBy: { stepNo: "asc" },
  });
}

export type TaskListItem = Awaited<ReturnType<typeof listTasks>>[number];

export async function getTaskDetail(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      assignedUser: { include: { role: true } },
      backupUser: true,
      dependencies: {
        include: {
          dependsOnTask: {
            select: { id: true, title: true, status: true, stepNo: true },
          },
        },
      },
      dependents: {
        include: {
          task: { select: { id: true, title: true, status: true, stepNo: true } },
        },
      },
      statusHistory: {
        include: { changedBy: true },
        orderBy: { changedAt: "desc" },
      },
      deliverables: {
        include: { uploadedBy: true },
        orderBy: { version: "desc" },
      },
    },
  });
}

export async function listProjectMembers(projectId: string) {
  return prisma.user.findMany({
    where: { projectId, accessLevel: "MEMBER" },
    include: { role: true },
    orderBy: { name: "asc" },
  });
}

export interface TaskFlags {
  atRisk: boolean;
  overdue: boolean;
  dueSoon: boolean;
  blockedLong: boolean;
}

export function computeTaskFlags(
  tasks: Pick<
    TaskListItem,
    "id" | "status" | "internalDeadline" | "updatedAt" | "dependencies"
  >[],
  now: Date = new Date(),
): Map<string, TaskFlags> {
  const dependencies = tasks.flatMap((task) =>
    task.dependencies.map((dependency) => ({
      taskId: task.id,
      dependsOnTaskId: dependency.dependsOnTaskId,
    })),
  );

  const atRisk = computeAtRisk(
    tasks.map((task) => ({
      id: task.id,
      status: task.status,
      internalDeadline: task.internalDeadline,
    })),
    dependencies,
    now,
  );

  const flags = new Map<string, TaskFlags>();
  for (const task of tasks) {
    const deadline = new Date(task.internalDeadline).getTime();
    const overdue = task.status !== "COMPLETED" && now.getTime() > deadline;
    const dueSoon =
      task.status !== "COMPLETED" &&
      !overdue &&
      deadline - now.getTime() <= 2 * DAY;
    const blockedLong =
      task.status === "BLOCKED" &&
      now.getTime() - new Date(task.updatedAt).getTime() > DAY;

    flags.set(task.id, {
      atRisk: atRisk.has(task.id),
      overdue,
      dueSoon,
      blockedLong,
    });
  }

  return flags;
}

export function predecessorsComplete(
  task: Pick<TaskListItem, "dependencies">,
): boolean {
  return task.dependencies.every(
    (dependency) => dependency.dependsOnTask.status === "COMPLETED",
  );
}
