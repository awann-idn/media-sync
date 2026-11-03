import { prisma } from "@mediasync/db";
import {
  computeHealth,
  INTERVENTION_STEP_META,
  PHASE_META,
  type TaskPhase,
} from "@mediasync/shared";

import type { BadgeTone } from "~/components/ui/status-badge";
import {
  computeTaskFlags,
  listProjectMembers,
  listTasks,
} from "~/server/queries/tasks";

export interface AttentionItem {
  id: string;
  tone: BadgeTone;
  label: string;
  title: string;
  detail?: string;
  href?: string;
}

export async function getDashboardData(projectId: string) {
  const [tasks, members, evaluations, interventions, decisions, meetings, conflicts, rounds] =
    await Promise.all([
      listTasks(projectId),
      listProjectMembers(projectId),
      prisma.evaluation.findMany({
        where: { projectId, period: "PRE" },
        include: { user: { include: { role: true } } },
        orderBy: { totalScore: "desc" },
      }),
      prisma.intervention.findMany({
        where: { projectId },
        include: { user: true, recordedBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.designDecision.findMany({
        where: { round: { projectId } },
        include: { proposer: true, round: { select: { topic: true } } },
        orderBy: { score: "desc" },
      }),
      prisma.meetingLog.findMany({
        where: { projectId },
        include: { decisions: true, actionItems: true, attendance: true },
        orderBy: { scheduledAt: "desc" },
      }),
      prisma.conflict.findMany({
        where: { projectId },
        include: { openedBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.designRound.findMany({
        where: { projectId },
        select: { deadlockCount: true, currentStep: true, topic: true },
      }),
    ]);

  const now = new Date();
  const flags = computeTaskFlags(tasks, now);
  const completed = tasks.filter((task) => task.status === "COMPLETED");

  const onTimeCount = completed.filter(
    (task) =>
      task.completedAt &&
      new Date(task.completedAt).getTime() <=
        new Date(task.officialDeadline).getTime(),
  ).length;
  const onTime = completed.length > 0 ? onTimeCount / completed.length : 0;

  const activeMemberIds = new Set(
    tasks
      .filter((task) => task.status !== "NOT_STARTED")
      .map((task) => task.assignedUserId),
  );
  const participation =
    members.length > 0 ? activeMemberIds.size / members.length : 0;

  const completedMeetings = meetings.filter(
    (meeting) => meeting.status === "COMPLETED",
  );
  const compliantMeetings = completedMeetings.filter(
    (meeting) =>
      (meeting.minutes?.trim().length ?? 0) > 0 &&
      meeting.decisions.length > 0 &&
      meeting.actionItems.every((item) => item.ownerId && item.dueDate),
  ).length;
  const docCompliance =
    completedMeetings.length > 0
      ? compliantMeetings / completedMeetings.length
      : 1;

  const deadlockRounds = rounds.reduce(
    (sum, round) => sum + round.deadlockCount,
    0,
  );
  const health = computeHealth({
    onTime,
    participation,
    deadlockRounds,
    docCompliance,
  });

  const openBlockers = tasks.filter((task) => task.status === "BLOCKED");
  const atRiskTasks = tasks.filter(
    (task) => task.status !== "COMPLETED" && flags.get(task.id)?.atRisk,
  );
  const upcoming = tasks
    .filter((task) => task.status !== "COMPLETED")
    .sort(
      (a, b) =>
        new Date(a.internalDeadline).getTime() -
        new Date(b.internalDeadline).getTime(),
    );
  const nextDeadline = upcoming[0] ?? null;

  const contributions = members
    .map((member) => {
      const assigned = tasks.filter((task) => task.assignedUserId === member.id);
      const count = (status: string) =>
        assigned.filter((task) => task.status === status).length;
      const done = count("COMPLETED");
      return {
        member,
        total: assigned.length,
        done,
        doing: count("IN_PROGRESS"),
        review: count("UNDER_REVIEW"),
        blocked: count("BLOCKED"),
        idle: count("NOT_STARTED"),
        risk: assigned.filter(
          (task) =>
            task.status !== "COMPLETED" && flags.get(task.id)?.atRisk,
        ).length,
        completionRate: assigned.length > 0 ? done / assigned.length : 0,
      };
    })
    .sort(
      (a, b) =>
        b.done + b.doing + b.review + b.blocked -
          (a.done + a.doing + a.review + a.blocked) ||
        a.member.name.localeCompare(b.member.name),
    );

  const phaseProgress = (
    Object.keys(PHASE_META) as TaskPhase[]
  ).map((phase) => {
    const phaseTasks = tasks.filter((task) => task.phase === phase);
    return {
      phase,
      label: PHASE_META[phase],
      total: phaseTasks.length,
      completed: phaseTasks.filter((task) => task.status === "COMPLETED").length,
    };
  });

  const pendingReview = tasks.filter(
    (task) => task.status === "UNDER_REVIEW",
  );
  const pendingDecisions = decisions.filter(
    (decision) =>
      decision.status === "PROPOSED" || decision.status === "SHORTLISTED",
  );
  const openConflicts = conflicts.filter(
    (conflict) => conflict.status === "OPEN" || conflict.status === "IN_PROGRESS",
  );
  const latestInterventionByUser = new Map<string, (typeof interventions)[number]>();
  for (const intervention of interventions) {
    if (!latestInterventionByUser.has(intervention.userId)) {
      latestInterventionByUser.set(intervention.userId, intervention);
    }
  }
  const activeInterventions = [...latestInterventionByUser.values()].filter(
    (intervention) =>
      intervention.step === "NUDGE" ||
      intervention.step === "CHECK_IN" ||
      intervention.step === "REBALANCE",
  );
  const overdueActions = meetings
    .flatMap((meeting) => meeting.actionItems)
    .filter(
      (item) =>
        !item.completedAt && new Date(item.dueDate).getTime() < now.getTime(),
    );

  const attention: AttentionItem[] = [];

  for (const task of openBlockers) {
    attention.push({
      id: `blocked-${task.id}`,
      tone: "blocked",
      label: "Hambatan",
      title: `${task.title} terhambat`,
      detail: task.blockedReason ?? "Alasan belum dicatat.",
      href: `/tasks/${task.id}`,
    });
  }

  for (const task of upcoming) {
    if (task.status === "BLOCKED") continue;
    if (flags.get(task.id)?.overdue) {
      attention.push({
        id: `overdue-${task.id}`,
        tone: "blocked",
        label: "Lewat deadline",
        title: task.title,
        detail: `Deadline internal ${task.internalDeadline.toLocaleDateString("id-ID")} sudah lewat.`,
        href: `/tasks/${task.id}`,
      });
    }
  }

  for (const task of pendingReview) {
    attention.push({
      id: `review-${task.id}`,
      tone: "review",
      label: "Menunggu review",
      title: task.title,
      detail: `Diajukan oleh ${task.assignedUser.name}.`,
      href: `/tasks/${task.id}`,
    });
  }

  for (const decision of pendingDecisions) {
    attention.push({
      id: `decision-${decision.id}`,
      tone: "review",
      label: "Keputusan",
      title: decision.title,
      detail: `${decision.round.topic} · skor ${decision.score.toFixed(1)}`,
      href: "/decisions",
    });
  }

  for (const conflict of openConflicts) {
    attention.push({
      id: `conflict-${conflict.id}`,
      tone: "blocked",
      label: "Konflik terbuka",
      title: conflict.title,
      detail: `Level ${conflict.level} · dibuka oleh ${conflict.openedBy.name}.`,
      href: "/conflicts",
    });
  }

  for (const intervention of activeInterventions) {
    attention.push({
      id: `intervention-${intervention.id}`,
      tone: "doing",
      label: "Pendampingan",
      title: `${intervention.user.name} · ${INTERVENTION_STEP_META[intervention.step]}`,
      detail: intervention.notes ?? undefined,
      href: "/evaluations",
    });
  }

  for (const item of overdueActions) {
    attention.push({
      id: `action-${item.id}`,
      tone: "blocked",
      label: "Aksi terlambat",
      title: item.description,
      detail: "Action item melewati tenggat.",
      href: "/meetings",
    });
  }

  for (const task of upcoming) {
    if (task.status === "BLOCKED") continue;
    if (flags.get(task.id)?.dueSoon) {
      attention.push({
        id: `due-${task.id}`,
        tone: "doing",
        label: "Deadline dekat",
        title: task.title,
        detail: `Deadline internal ${task.internalDeadline.toLocaleDateString("id-ID")}.`,
        href: `/tasks/${task.id}`,
      });
    }
  }

  for (const task of atRiskTasks) {
    const isRoot = openBlockers.some((blocked) => blocked.id === task.id);
    if (!isRoot) {
      attention.push({
        id: `risk-${task.id}`,
        tone: "doing",
        label: "Berisiko",
        title: task.title,
        detail: "Terdampak hambatan pada tugas sebelumnya.",
        href: `/tasks/${task.id}`,
      });
    }
  }

  return {
    tasks,
    flags,
    members,
    evaluations,
    decisions,
    meetings,
    conflicts,
    health,
    metrics: {
      onTime,
      participation,
      docCompliance,
      deadlockRounds,
      openBlockers: openBlockers.length,
      atRisk: atRiskTasks.length,
      dueSoon: upcoming.filter((task) => flags.get(task.id)?.dueSoon).length,
      completed: completed.length,
      total: tasks.length,
      nextDeadline,
    },
    contributions,
    phaseProgress,
    attention: attention.slice(0, 9),
    pendingReview,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
