import { prisma } from "@mediasync/db";
import {
  computeDecisionScore,
  determineDecisionMethod,
  failedThresholds,
  isEliminated,
} from "@mediasync/shared";

import { listProjectMembers } from "~/server/queries/tasks";

export async function getDecisionBoard(projectId: string) {
  const [project, round, criteria, members, meetings, styleGuides] =
    await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.designRound.findFirst({
        where: { projectId },
        include: {
          decisions: {
            include: {
              proposer: true,
              scores: { include: { scorer: true, criterion: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.decisionCriterion.findMany({ orderBy: { weight: "desc" } }),
      listProjectMembers(projectId),
      prisma.meetingLog.findMany({
        where: { projectId },
        orderBy: { scheduledAt: "desc" },
      }),
      prisma.styleGuideVersion.findMany({
        where: { projectId },
        include: {
          decision: true,
          changeRequests: {
            include: { requestedBy: true, meeting: true, approvedBy: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { version: "desc" },
      }),
    ]);

  if (!round) {
    return {
      project,
      round: null,
      criteria,
      members,
      meetings,
      styleGuide: null,
      styleGuides,
      decisions: [],
      eligibleRanking: [],
      recommendation: null,
    };
  }

  const decisions = round.decisions
    .map((decision) => {
      const grouped: Record<string, number[]> = {};
      for (const score of decision.scores) {
        grouped[score.criterionId] = grouped[score.criterionId] ?? [];
        grouped[score.criterionId]!.push(score.score);
      }
      const score = computeDecisionScore(criteria, grouped);
      const failed = failedThresholds(criteria, grouped);
      const eliminated = isEliminated(criteria, grouped);
      const scoredMembers = members.filter(
        (member) =>
          decision.scores.filter((item) => item.scorerId === member.id).length ===
          criteria.length,
      ).length;

      return {
        ...decision,
        grouped,
        computedScore: score,
        failed,
        eliminated,
        scoredMembers,
        allScored: members.length > 0 && scoredMembers === members.length,
        perCriterion: criteria.map((criterion) => {
          const values = grouped[criterion.id] ?? [];
          const mean =
            values.length > 0
              ? values.reduce((sum, value) => sum + value, 0) / values.length
              : 0;
          return {
            criterion,
            mean,
            count: values.length,
            failed:
              criterion.minThreshold !== null &&
              criterion.minThreshold !== undefined &&
              values.length > 0 &&
              mean < criterion.minThreshold,
          };
        }),
      };
    })
    .sort((a, b) => b.computedScore - a.computedScore)
    .map((decision, index) => ({ ...decision, rank: index + 1 }));

  const eligibleRanking = decisions
    .filter((decision) => !decision.eliminated)
    .map((decision) => ({ id: decision.id, score: decision.computedScore }));

  const recommendation = determineDecisionMethod(eligibleRanking, false);
  const top = eligibleRanking[0] ?? null;
  const runnerUp = eligibleRanking[1] ?? null;
  const gap = top && runnerUp ? top.score - runnerUp.score : null;

  return {
    project,
    round,
    criteria,
    members,
    meetings,
    styleGuide: styleGuides[0] ?? null,
    styleGuides,
    decisions,
    eligibleRanking,
    recommendation: {
      ...recommendation,
      gap,
      topScore: top?.score ?? null,
    },
  };
}

export type DecisionBoard = Awaited<ReturnType<typeof getDecisionBoard>>;
