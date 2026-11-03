"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma, type Prisma } from "@mediasync/db";
import {
  aggregateEvaluation,
  INDICATORS,
  INTERVENTION_STEP_META,
  type Indicator,
} from "@mediasync/shared";

import { isPM, requireMember } from "~/server/auth";
import {
  isEvaluationPeriod,
  type EvaluationPeriodKey,
} from "~/server/queries/evaluations";

const INTERVENTION_ORDER = [
  "NUDGE",
  "CHECK_IN",
  "REBALANCE",
  "FORMAL_WARNING",
  "BACKUP_AND_ESCALATE",
] as const;

type InterventionStepKey = (typeof INTERVENTION_ORDER)[number];

const CAUSE_CODES = [
  "NO_ROLE_CLARITY",
  "SKILL_MISMATCH",
  "OVERLOAD",
  "PERSONAL_BARRIER",
  "LOW_EFFORT",
  "UNKNOWN",
] as const;

type CauseCode = (typeof CAUSE_CODES)[number];

function requestedPeriod(formData: FormData): EvaluationPeriodKey {
  const raw = String(formData.get("period") ?? "PRE");
  return isEvaluationPeriod(raw) ? raw : "PRE";
}

function withError(period: EvaluationPeriodKey, message: string): never {
  redirect(`/evaluations?period=${period}&error=${encodeURIComponent(message)}`);
}

function withSuccess(period: EvaluationPeriodKey, message: string): never {
  redirect(`/evaluations?period=${period}&ok=${encodeURIComponent(message)}`);
}

function refresh() {
  revalidatePath("/evaluations");
  revalidatePath("/dashboard");
}

function readScores(formData: FormData): Record<Indicator, number> | null {
  const scores = {} as Record<Indicator, number>;
  for (const indicator of INDICATORS) {
    const value = Number(formData.get(`score-${indicator}`));
    if (!Number.isInteger(value) || value < 1 || value > 5) return null;
    scores[indicator] = value;
  }
  return scores;
}

function readNote(formData: FormData): string | null {
  const note = String(formData.get("note") ?? "").trim();
  return note.length > 0 ? note : null;
}

async function recalculateEvaluation(
  tx: Prisma.TransactionClient,
  evaluationId: string,
) {
  const entries = await tx.evaluationEntry.findMany({
    where: { evaluationId },
  });
  const aggregate = aggregateEvaluation(
    entries.map((entry) => ({
      indicator: entry.indicator as Indicator,
      score: entry.score,
      isSelf: entry.isSelf,
    })),
  );

  await tx.evaluation.update({
    where: { id: evaluationId },
    data: {
      activeScore: aggregate.activeScore,
      disciplineScore: aggregate.disciplineScore,
      totalScore: aggregate.totalScore,
      category: aggregate.category,
    },
  });
}

export async function submitPeerEvaluation(formData: FormData) {
  const user = await requireMember();
  const period = requestedPeriod(formData);
  const subjectId = String(formData.get("subjectId") ?? "");

  if (!subjectId) withError(period, "Pilih anggota yang dinilai.");
  if (subjectId === user.id) {
    withError(period, "Gunakan formulir penilaian diri untuk menilai diri sendiri.");
  }

  const subject = await prisma.user.findFirst({
    where: {
      id: subjectId,
      projectId: user.projectId,
      accessLevel: "MEMBER",
    },
  });
  if (!subject) withError(period, "Anggota yang dinilai tidak ditemukan.");

  const scores = readScores(formData);
  if (!scores) {
    withError(period, "Semua indikator wajib diberi nilai 1 sampai 5.");
  }

  const note = readNote(formData);
  if (note && note.length > 500) {
    withError(period, "Catatan maksimal 500 karakter.");
  }

  const existingEvaluation = await prisma.evaluation.findUnique({
    where: {
      projectId_userId_period: {
        projectId: user.projectId,
        userId: subjectId,
        period,
      },
    },
  });
  if (existingEvaluation) {
    const existing = await prisma.evaluationEntry.findFirst({
      where: {
        evaluationId: existingEvaluation.id,
        evaluatorId: user.id,
        isSelf: false,
      },
    });
    if (existing) {
      withError(period, `Anda sudah menilai ${subject.name} pada periode ini.`);
    }
  }

  await prisma.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.upsert({
      where: {
        projectId_userId_period: {
          projectId: user.projectId,
          userId: subjectId,
          period,
        },
      },
      update: {},
      create: {
        projectId: user.projectId,
        userId: subjectId,
        period,
        activeScore: 0,
        disciplineScore: 0,
        totalScore: 0,
        category: "INTERVENTION_NEEDED",
      },
    });

    await tx.evaluationEntry.createMany({
      data: INDICATORS.map((indicator) => ({
        evaluationId: evaluation.id,
        evaluatorId: user.id,
        isSelf: false,
        indicator,
        score: scores[indicator],
        note: indicator === "A1" ? note : null,
      })),
    });

    await recalculateEvaluation(tx, evaluation.id);
  });

  refresh();
  withSuccess(period, `Penilaian untuk ${subject.name} tersimpan.`);
}

export async function submitSelfEvaluation(formData: FormData) {
  const user = await requireMember();
  const period = requestedPeriod(formData);
  const scores = readScores(formData);
  if (!scores) {
    withError(period, "Semua indikator wajib diberi nilai 1 sampai 5.");
  }

  const note = readNote(formData);
  if (note && note.length > 500) {
    withError(period, "Catatan maksimal 500 karakter.");
  }

  const existingEvaluation = await prisma.evaluation.findUnique({
    where: {
      projectId_userId_period: {
        projectId: user.projectId,
        userId: user.id,
        period,
      },
    },
  });
  if (existingEvaluation) {
    const existing = await prisma.evaluationEntry.findFirst({
      where: {
        evaluationId: existingEvaluation.id,
        evaluatorId: user.id,
        isSelf: true,
      },
    });
    if (existing) {
      withError(period, "Penilaian diri Anda sudah tersimpan pada periode ini.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.upsert({
      where: {
        projectId_userId_period: {
          projectId: user.projectId,
          userId: user.id,
          period,
        },
      },
      update: {},
      create: {
        projectId: user.projectId,
        userId: user.id,
        period,
        activeScore: 0,
        disciplineScore: 0,
        totalScore: 0,
        category: "INTERVENTION_NEEDED",
      },
    });

    await tx.evaluationEntry.createMany({
      data: INDICATORS.map((indicator) => ({
        evaluationId: evaluation.id,
        evaluatorId: user.id,
        isSelf: true,
        indicator,
        score: scores[indicator],
        note: indicator === "A1" ? note : null,
      })),
    });

    await recalculateEvaluation(tx, evaluation.id);
  });

  refresh();
  withSuccess(period, "Penilaian diri tersimpan.");
}

export async function recordIntervention(formData: FormData) {
  const user = await requireMember();
  if (!isPM(user)) {
    redirect("/evaluations?error=Hanya%20Project%20Manager%20yang%20dapat%20mencatat%20intervensi.");
  }

  const period = requestedPeriod(formData);
  const subjectId = String(formData.get("subjectId") ?? "");
  const step = String(formData.get("step") ?? "");
  const causeRaw = String(formData.get("causeCode") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const subject = await prisma.user.findFirst({
    where: {
      id: subjectId,
      projectId: user.projectId,
      accessLevel: "MEMBER",
    },
  });
  if (!subject) withError(period, "Anggota tidak ditemukan.");

  if (!INTERVENTION_ORDER.includes(step as InterventionStepKey)) {
    withError(period, "Langkah intervensi tidak valid.");
  }
  const nextStep = step as InterventionStepKey;

  const causeCode =
    causeRaw && CAUSE_CODES.includes(causeRaw as CauseCode)
      ? (causeRaw as CauseCode)
      : null;
  if (causeRaw && !causeCode) {
    withError(period, "Kode penyebab tidak valid.");
  }

  const latest = await prisma.intervention.findFirst({
    where: { projectId: user.projectId, userId: subjectId },
    orderBy: { createdAt: "desc" },
  });

  const latestIndex = latest
    ? INTERVENTION_ORDER.indexOf(latest.step as InterventionStepKey)
    : -1;
  const expected = INTERVENTION_ORDER[latestIndex + 1];

  if (!expected) {
    withError(
      period,
      "Tangga intervensi sudah berada di langkah terakhir untuk anggota ini.",
    );
  }
  if (nextStep !== expected) {
    withError(
      period,
      `Langkah berikutnya harus ${INTERVENTION_STEP_META[expected]}. Tangga intervensi tidak boleh dilompati.`,
    );
  }

  if (nextStep === "CHECK_IN" && !causeCode) {
    withError(period, "Cek kondisi wajib mencatat penyebab.");
  }
  if (
    nextStep === "REBALANCE" ||
    nextStep === "FORMAL_WARNING" ||
    nextStep === "BACKUP_AND_ESCALATE"
  ) {
    if (notes.length < 10) {
      withError(
        period,
        "Langkah ini wajib mencatat penyesuaian atau alasan minimal 10 karakter.",
      );
    }
  }

  if (nextStep === "FORMAL_WARNING") {
    const priorSteps = await prisma.intervention.findMany({
      where: { projectId: user.projectId, userId: subjectId },
      select: { step: true },
    });
    const prior = new Set(priorSteps.map((item) => item.step));
    if (!prior.has("CHECK_IN") || !prior.has("REBALANCE")) {
      withError(
        period,
        "Peringatan formal hanya boleh setelah cek kondisi dan penyesuaian beban tercatat.",
      );
    }
  }

  if (nextStep === "BACKUP_AND_ESCALATE" && latest?.step !== "FORMAL_WARNING") {
    withError(
      period,
      "Backup dan eskalasi hanya boleh setelah peringatan formal.",
    );
  }

  await prisma.intervention.create({
    data: {
      projectId: user.projectId,
      userId: subjectId,
      step: nextStep,
      causeCode,
      notes: notes || null,
      recordedById: user.id,
    },
  });

  refresh();
  withSuccess(
    period,
    `Intervensi ${INTERVENTION_STEP_META[nextStep]} untuk ${subject.name} tercatat.`,
  );
}
