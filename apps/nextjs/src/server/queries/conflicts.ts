import { prisma } from "@mediasync/db";

import { listProjectMembers } from "~/server/queries/tasks";

const THREE_WEEKS = 21 * 24 * 60 * 60 * 1000;

export async function getConflictsPage(projectId: string) {
  const [conflicts, members] = await Promise.all([
    prisma.conflict.findMany({
      where: { projectId },
      include: {
        openedBy: true,
        steps: {
          include: { decidedBy: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    listProjectMembers(projectId),
  ]);

  const now = Date.now();
  const recentByType = new Map<string, number>();
  for (const conflict of conflicts) {
    if (now - new Date(conflict.createdAt).getTime() <= THREE_WEEKS) {
      recentByType.set(conflict.type, (recentByType.get(conflict.type) ?? 0) + 1);
    }
  }

  const rows = conflicts.map((conflict) => {
    const ageHours =
      (now - new Date(conflict.createdAt).getTime()) / (60 * 60 * 1000);
    return {
      ...conflict,
      ageHours,
      needsReminder:
        conflict.level === 1 &&
        (conflict.status === "OPEN" || conflict.status === "IN_PROGRESS") &&
        ageHours > 48,
      recurring: (recentByType.get(conflict.type) ?? 0) >= 3,
      recentTypeCount: recentByType.get(conflict.type) ?? 0,
    };
  });

  return {
    conflicts: rows,
    members,
    metrics: {
      total: rows.length,
      open: rows.filter(
        (conflict) =>
          conflict.status === "OPEN" || conflict.status === "IN_PROGRESS",
      ).length,
      escalated: rows.filter((conflict) => conflict.status === "ESCALATED")
        .length,
      resolved: rows.filter((conflict) => conflict.status === "RESOLVED").length,
      reminders: rows.filter((conflict) => conflict.needsReminder).length,
    },
  };
}

export async function getConflictDetail(conflictId: string, projectId: string) {
  const [conflict, meetings] = await Promise.all([
    prisma.conflict.findFirst({
      where: { id: conflictId, projectId },
      include: {
        openedBy: true,
        steps: {
          include: { decidedBy: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.meetingLog.findMany({
      where: { projectId, status: "COMPLETED" },
      select: { id: true, title: true, scheduledAt: true, minutes: true },
      orderBy: { scheduledAt: "desc" },
    }),
  ]);

  return { conflict, meetings };
}

export async function getEscalationPack(
  conflictId: string,
  projectId: string,
) {
  const [conflict, project, meetings, decisions, evaluations, interventions, tasks] =
    await Promise.all([
      prisma.conflict.findFirst({
        where: { id: conflictId, projectId },
        include: {
          openedBy: true,
          steps: {
            include: { decidedBy: true },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.meetingLog.findMany({
        where: { projectId, status: "COMPLETED" },
        include: {
          decisions: { orderBy: { number: "asc" } },
          attendance: true,
        },
        orderBy: { scheduledAt: "desc" },
      }),
      prisma.designDecision.findMany({
        where: { round: { projectId } },
        include: {
          proposer: true,
          round: { select: { topic: true } },
        },
        orderBy: { score: "desc" },
      }),
      prisma.evaluation.findMany({
        where: { projectId, period: "PRE" },
        include: { user: { include: { role: true } } },
        orderBy: { totalScore: "desc" },
      }),
      prisma.intervention.findMany({
        where: { projectId },
        include: { user: true, recordedBy: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.task.findMany({
        where: { projectId },
        include: { assignedUser: true },
        orderBy: { stepNo: "asc" },
      }),
    ]);

  return {
    conflict,
    project,
    meetings,
    decisions,
    evaluations,
    interventions,
    tasks,
    generatedAt: new Date(),
  };
}

export type ConflictsPageData = Awaited<ReturnType<typeof getConflictsPage>>;
export type ConflictDetailData = Awaited<ReturnType<typeof getConflictDetail>>;
export type EscalationPackData = Awaited<ReturnType<typeof getEscalationPack>>;
