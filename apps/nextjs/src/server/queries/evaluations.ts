import { prisma } from "@mediasync/db";
import {
  aggregateEvaluation,
  INTERVENTION_STEP_META,
  type EvaluationCategory,
  type EvaluationEntry as RuleEvaluationEntry,
  type Indicator,
} from "@mediasync/shared";

export const EVALUATION_PERIODS = ["PRE", "PROD", "POST", "FINAL"] as const;
export type EvaluationPeriodKey = (typeof EVALUATION_PERIODS)[number];

export function isEvaluationPeriod(value: string): value is EvaluationPeriodKey {
  return EVALUATION_PERIODS.includes(value as EvaluationPeriodKey);
}

export interface EvaluationMember {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  roleName: string;
  roleCode: string;
  secondaryRoleName: string | null;
}

export interface EvaluationSummary {
  activeScore: number;
  disciplineScore: number;
  totalScore: number;
  category: EvaluationCategory;
  indicators: {
    indicator: Indicator;
    peerScore: number;
    selfScore: number | null;
    finalScore: number;
  }[];
  peerNotes: { note: string; indicators: string[] }[];
  selfNote: string | null;
  peerCount: number;
}

export interface EvaluationIntervention {
  id: string;
  step: keyof typeof INTERVENTION_STEP_META;
  stepLabel: string;
  causeCode: string | null;
  notes: string | null;
  createdAt: Date;
  recordedByName: string;
}

export interface EvaluationMemberRow {
  member: EvaluationMember;
  evaluation: EvaluationSummary | null;
  objectiveSignal: number | null;
  calibration: boolean;
  submittedByMe: boolean;
  selfSubmitted: boolean;
  latestIntervention: EvaluationIntervention | null;
  interventions: EvaluationIntervention[];
}

export async function getEvaluationsPage({
  projectId,
  viewerId,
  period,
  canSeeAll,
}: {
  projectId: string;
  viewerId: string;
  period: EvaluationPeriodKey;
  canSeeAll: boolean;
}) {
  const [members, evaluations, tasks, interventions] = await Promise.all([
    prisma.user.findMany({
      where: { projectId, accessLevel: "MEMBER" },
      include: { role: true, secondaryRole: true },
      orderBy: { name: "asc" },
    }),
    prisma.evaluation.findMany({
      where: { projectId, period },
      include: {
        user: { include: { role: true, secondaryRole: true } },
        entries: true,
      },
    }),
    prisma.task.findMany({
      where: { projectId },
      select: {
        assignedUserId: true,
        status: true,
        completedAt: true,
        officialDeadline: true,
      },
    }),
    prisma.intervention.findMany({
      where: { projectId },
      include: { user: true, recordedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const evaluationByUser = new Map(
    evaluations.map((evaluation) => [evaluation.userId, evaluation]),
  );

  const interventionsByUser = new Map<string, typeof interventions>();
  for (const intervention of interventions) {
    const list = interventionsByUser.get(intervention.userId) ?? [];
    list.push(intervention);
    interventionsByUser.set(intervention.userId, list);
  }

  function objectiveSignalFor(userId: string): number | null {
    const assigned = tasks.filter((task) => task.assignedUserId === userId);
    if (assigned.length === 0) return null;

    const completed = assigned.filter((task) => task.status === "COMPLETED");
    const onTime =
      completed.length > 0
        ? completed.filter(
            (task) =>
              task.completedAt &&
              new Date(task.completedAt).getTime() <=
                new Date(task.officialDeadline).getTime(),
          ).length / completed.length
        : null;
    const participation = assigned.some(
      (task) => task.status !== "NOT_STARTED",
    )
      ? 1
      : 0;

    const parts = [participation];
    if (onTime !== null) parts.push(onTime);
    const average =
      parts.reduce((sum, value) => sum + value, 0) / parts.length;

    return Math.round((1 + 4 * average) * 10) / 10;
  }

  const rows: EvaluationMemberRow[] = members.map((member) => {
    const evaluation = evaluationByUser.get(member.id);
    const entries = evaluation?.entries ?? [];

    const ruleEntries: RuleEvaluationEntry[] = entries.map((entry) => ({
      indicator: entry.indicator as Indicator,
      score: entry.score,
      isSelf: entry.isSelf,
    }));

    const aggregate =
      evaluation && entries.length > 0 ? aggregateEvaluation(ruleEntries) : null;

    const notes = new Map<string, { note: string; indicators: string[] }>();
    for (const entry of entries) {
      if (entry.isSelf || !entry.note) continue;
      const existing = notes.get(entry.note);
      if (existing) {
        if (!existing.indicators.includes(entry.indicator)) {
          existing.indicators.push(entry.indicator);
        }
      } else {
        notes.set(entry.note, {
          note: entry.note,
          indicators: [entry.indicator],
        });
      }
    }

    const selfNote =
      entries.find((entry) => entry.isSelf && entry.note)?.note ?? null;
    const peerEntryCount = entries.filter((entry) => !entry.isSelf).length;
    const peerCount = new Set(
      entries.filter((entry) => !entry.isSelf).map((entry) => entry.evaluatorId),
    ).size;

    const peerScores = entries
      .filter((entry) => !entry.isSelf)
      .map((entry) => entry.score);
    const peerMean =
      peerScores.length > 0
        ? peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length
        : null;
    const objectiveSignal = objectiveSignalFor(member.id);
    const calibration =
      peerMean !== null &&
      objectiveSignal !== null &&
      Math.abs(peerMean - objectiveSignal) > 1.5;

    const userInterventions = interventionsByUser.get(member.id) ?? [];
    const mappedInterventions: EvaluationIntervention[] = userInterventions.map(
      (intervention) => ({
        id: intervention.id,
        step: intervention.step,
        stepLabel: INTERVENTION_STEP_META[intervention.step],
        causeCode: intervention.causeCode,
        notes: intervention.notes,
        createdAt: intervention.createdAt,
        recordedByName: intervention.recordedBy.name,
      }),
    );

    const submittedByMe =
      peerEntryCount > 0 &&
      entries.some(
        (entry) => entry.evaluatorId === viewerId && !entry.isSelf,
      );
    const selfSubmitted = entries.some(
      (entry) => entry.evaluatorId === viewerId && entry.isSelf,
    );

    const maySeeEvaluation = canSeeAll || member.id === viewerId;

    return {
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        avatarColor: member.avatarColor,
        roleName: member.role.name,
        roleCode: member.role.code,
        secondaryRoleName: member.secondaryRole?.name ?? null,
      },
      evaluation:
        aggregate && maySeeEvaluation
          ? {
              activeScore: aggregate.activeScore,
              disciplineScore: aggregate.disciplineScore,
              totalScore: aggregate.totalScore,
              category: aggregate.category,
              indicators: aggregate.indicators,
              peerNotes: [...notes.values()],
              selfNote,
              peerCount,
            }
          : null,
      objectiveSignal,
      calibration: canSeeAll && calibration,
      submittedByMe,
      selfSubmitted,
      latestIntervention: canSeeAll
        ? (mappedInterventions[0] ?? null)
        : null,
      interventions: canSeeAll ? mappedInterventions : [],
    };
  });

  return {
    period,
    canSeeAll,
    members: rows,
    own: rows.find((row) => row.member.id === viewerId) ?? null,
    evaluationCount: rows.filter((row) => row.evaluation).length,
    memberCount: rows.length,
  };
}

export type EvaluationsPageData = Awaited<
  ReturnType<typeof getEvaluationsPage>
>;
