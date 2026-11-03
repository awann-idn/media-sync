"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@mediasync/db";
import {
  computeDecisionScore,
  determineDecisionMethod,
  isEliminated,
} from "@mediasync/shared";

import { isPM, requireMember, requireUser } from "~/server/auth";

function fail(message: string): never {
  redirect(`/decisions?error=${encodeURIComponent(message)}`);
}

function succeed(message: string): never {
  redirect(`/decisions?ok=${encodeURIComponent(message)}`);
}

function refresh() {
  revalidatePath("/decisions");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}

export async function submitIdea(formData: FormData) {
  const user = await requireMember();
  const roundId = String(formData.get("roundId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const proposedIdea = String(formData.get("proposedIdea") ?? "").trim();
  const referenceUrl = String(formData.get("referenceUrl") ?? "").trim();

  const round = await prisma.designRound.findFirst({
    where: { id: roundId, projectId: user.projectId },
  });
  if (!round) fail("Ronde desain tidak ditemukan.");
  if (round.currentStep > 3) fail("Ronde sudah masuk tahap penilaian atau keputusan.");

  if (!title) fail("Judul ide wajib diisi.");
  if (proposedIdea.length < 50) {
    fail("Deskripsi ide minimal 50 karakter agar dapat dinilai.");
  }
  if (referenceUrl && !/^https?:\/\//i.test(referenceUrl)) {
    fail("Tautan referensi harus dimulai dengan http:// atau https://.");
  }

  await prisma.designDecision.create({
    data: {
      roundId: round.id,
      proposerId: user.id,
      title,
      proposedIdea,
      referenceUrl: referenceUrl || null,
      status: "PROPOSED",
    },
  });

  refresh();
  succeed("Ide berhasil diusulkan.");
}

export async function submitDecisionScores(formData: FormData) {
  const user = await requireMember();
  const decisionId = String(formData.get("decisionId") ?? "");

  const decision = await prisma.designDecision.findFirst({
    where: { id: decisionId, round: { projectId: user.projectId } },
    include: { round: true, scores: true },
  });
  if (!decision) fail("Ide tidak ditemukan.");
  if (decision.round.currentStep > 3) {
    fail("Penilaian sudah ditutup untuk ronde ini.");
  }
  if (decision.scores.some((score) => score.scorerId === user.id)) {
    fail("Anda sudah mengirim penilaian untuk ide ini. Skor terkunci.");
  }

  const criteria = await prisma.decisionCriterion.findMany();
  const values = new Map<string, number>();
  for (const criterion of criteria) {
    const raw = Number(formData.get(`score-${criterion.id}`));
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) {
      fail(`Nilai untuk ${criterion.name} harus 1–5.`);
    }
    values.set(criterion.id, raw);
  }

  await prisma.decisionScore.createMany({
    data: criteria.map((criterion) => ({
      decisionId: decision.id,
      criterionId: criterion.id,
      scorerId: user.id,
      score: values.get(criterion.id) ?? 0,
    })),
  });

  const allScores = await prisma.decisionScore.findMany({
    where: { decisionId: decision.id },
  });
  const grouped: Record<string, number[]> = {};
  for (const score of allScores) {
    grouped[score.criterionId] = grouped[score.criterionId] ?? [];
    grouped[score.criterionId]!.push(score.score);
  }
  const total = computeDecisionScore(criteria, grouped);

  await prisma.designDecision.update({
    where: { id: decision.id },
    data: { score: total },
  });

  refresh();
  succeed("Penilaian tersimpan dan terkunci.");
}

export async function decideRound(formData: FormData) {
  const user = await requireUser();
  if (!isPM(user)) fail("Hanya Project Manager yang dapat menetapkan keputusan.");

  const decisionId = String(formData.get("decisionId") ?? "");
  const rationale = String(formData.get("rationale") ?? "").trim();
  const allAgree = formData.get("allAgree") === "on";

  const round = await prisma.designRound.findFirst({
    where: { projectId: user.projectId },
    include: {
      decisions: { include: { scores: true } },
    },
  });
  if (!round) fail("Ronde desain tidak ditemukan.");
  if (round.decisions.length < 2) fail("Minimal dua ide diperlukan sebelum keputusan.");
  if (round.currentStep >= 4) fail("Keputusan untuk ronde ini sudah ditetapkan.");

  const criteria = await prisma.decisionCriterion.findMany();
  const memberCount = await prisma.user.count({
    where: { projectId: user.projectId, accessLevel: "MEMBER" },
  });
  const scoreMaps = new Map<string, Record<string, number[]>>();
  for (const decision of round.decisions) {
    const grouped: Record<string, number[]> = {};
    for (const score of decision.scores) {
      grouped[score.criterionId] = grouped[score.criterionId] ?? [];
      grouped[score.criterionId]!.push(score.score);
    }
    const scorers = new Set(decision.scores.map((score) => score.scorerId));
    if (scorers.size < memberCount) {
      fail(
        `Semua anggota harus menilai "${decision.title}" sebelum keputusan ditetapkan.`,
      );
    }
    scoreMaps.set(decision.id, grouped);
  }

  const eligible = round.decisions
    .filter((decision) => !isEliminated(criteria, scoreMaps.get(decision.id) ?? {}))
    .map((decision) => ({
      id: decision.id,
      score: computeDecisionScore(criteria, scoreMaps.get(decision.id) ?? {}),
    }))
    .sort((a, b) => b.score - a.score);

  if (eligible.length === 0) {
    fail("Semua ide gagal memenuhi ambang batas kriteria. Perbaiki ide terlebih dahulu.");
  }
  if (!eligible.some((idea) => idea.id === decisionId)) {
    fail("Ide yang dipilih tidak layak atau gagal ambang batas FEASIBILITY.");
  }

  const method = determineDecisionMethod(eligible, allAgree);
  if (method.winnerId && method.winnerId !== decisionId) {
    fail("Pilihan tidak sesuai aturan keputusan. Pilih ide dengan skor tertinggi.");
  }
  if (method.method === "PM_TIEBREAK") {
    if (!user.pmApprovedByAll) {
      fail("PM belum disetujui seluruh anggota, sehingga tidak dapat melakukan tie-break.");
    }
    if (!rationale) {
      fail("Tie-break oleh PM wajib menyertakan alasan tertulis.");
    }
    if (allAgree) {
      fail("Tie-break tidak dapat ditetapkan sebagai konsensus.");
    }
  }

  await prisma.$transaction([
    prisma.designDecision.update({
      where: { id: decisionId },
      data: {
        status: "ACCEPTED",
        decidedBy: method.method,
        rationale: rationale || null,
      },
    }),
    prisma.designDecision.updateMany({
      where: {
        roundId: round.id,
        id: { not: decisionId },
        status: { in: ["PROPOSED", "SHORTLISTED"] },
      },
      data: { status: "REJECTED", rationale: rationale || null },
    }),
    prisma.designRound.update({
      where: { id: round.id },
      data: { currentStep: 5 },
    }),
  ]);

  refresh();
  succeed(
    method.method === "PM_TIEBREAK"
      ? "Keputusan ditetapkan melalui tie-break PM dengan alasan tercatat."
      : "Keputusan berhasil ditetapkan.",
  );
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function freezeStyleGuide(formData: FormData) {
  const user = await requireUser();
  if (!isPM(user)) fail("Hanya Project Manager yang dapat membekukan style guide.");

  const decisionId = String(formData.get("decisionId") ?? "");
  const palette = parseLines(String(formData.get("palette") ?? ""));
  const typography = parseLines(String(formData.get("typography") ?? ""));
  const layoutRules = parseLines(String(formData.get("layoutRules") ?? ""));
  const audioRules = parseLines(String(formData.get("audioRules") ?? ""));

  const decision = await prisma.designDecision.findFirst({
    where: {
      id: decisionId,
      status: "ACCEPTED",
      round: { projectId: user.projectId },
    },
    include: { round: true, styleGuides: true },
  });
  if (!decision) fail("Keputusan belum diterima atau tidak ditemukan.");
  if (decision.styleGuides.length > 0) {
    fail("Style guide untuk keputusan ini sudah dibekukan.");
  }
  if (
    palette.length === 0 ||
    typography.length === 0 ||
    layoutRules.length === 0 ||
    audioRules.length === 0
  ) {
    fail("Semua bagian style guide wajib diisi minimal satu baris.");
  }

  const existing = await prisma.styleGuideVersion.findMany({
    where: { projectId: user.projectId },
    select: { version: true },
  });
  const nextVersion =
    existing.reduce((max, item) => Math.max(max, item.version), 0) + 1;

  await prisma.$transaction([
    prisma.styleGuideVersion.create({
      data: {
        projectId: user.projectId,
        version: nextVersion,
        palette,
        typography,
        layoutRules,
        audioRules,
        isFrozen: true,
        frozenAt: new Date(),
        decisionId: decision.id,
      },
    }),
    prisma.designDecision.update({
      where: { id: decision.id },
      data: { status: "FROZEN" },
    }),
    prisma.designRound.update({
      where: { id: decision.roundId },
      data: { currentStep: 6 },
    }),
  ]);

  refresh();
  succeed(`Style guide versi ${nextVersion} dibekukan dan tidak dapat diubah.`);
}

export async function requestStyleChange(formData: FormData) {
  const user = await requireMember();
  const styleGuideId = String(formData.get("styleGuideId") ?? "");
  const meetingId = String(formData.get("meetingId") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!meetingId) {
    fail("Perubahan style guide wajib merujuk pada rapat yang tercatat.");
  }
  if (description.length < 10) {
    fail("Jelaskan alasan perubahan minimal 10 karakter.");
  }

  const [styleGuide, meeting] = await Promise.all([
    prisma.styleGuideVersion.findFirst({
      where: { id: styleGuideId, projectId: user.projectId, isFrozen: true },
    }),
    prisma.meetingLog.findFirst({
      where: { id: meetingId, projectId: user.projectId },
    }),
  ]);
  if (!styleGuide) fail("Style guide beku tidak ditemukan.");
  if (!meeting) fail("Rapat tidak ditemukan.");

  await prisma.changeRequest.create({
    data: {
      styleGuideId: styleGuide.id,
      meetingId: meeting.id,
      requestedById: user.id,
      description,
      status: "PENDING",
    },
  });

  refresh();
  succeed("Permintaan perubahan diajukan dan menunggu persetujuan PM.");
}

export async function reviewStyleChange(formData: FormData) {
  const user = await requireUser();
  if (!isPM(user)) fail("Hanya Project Manager yang dapat menyetujui perubahan.");

  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  const changeRequest = await prisma.changeRequest.findFirst({
    where: {
      id: requestId,
      styleGuide: { projectId: user.projectId },
    },
  });
  if (!changeRequest) fail("Permintaan perubahan tidak ditemukan.");
  if (changeRequest.status !== "PENDING") fail("Permintaan sudah diproses.");
  if (!changeRequest.meetingId) {
    fail("Permintaan tanpa rujukan rapat tidak dapat disetujui.");
  }
  if (decision !== "approve" && decision !== "reject") {
    fail("Aksi persetujuan tidak valid.");
  }

  await prisma.changeRequest.update({
    where: { id: changeRequest.id },
    data: {
      status: decision === "approve" ? "APPROVED" : "REJECTED",
      approvedById: user.id,
    },
  });

  refresh();
  succeed(
    decision === "approve"
      ? "Perubahan disetujui melalui rapat tercatat."
      : "Permintaan perubahan ditolak.",
  );
}

export async function markRoundDeadlock(formData: FormData) {
  const user = await requireUser();
  if (!isPM(user)) fail("Hanya Project Manager yang dapat mencatat deadlock.");

  const roundId = String(formData.get("roundId") ?? "");
  const round = await prisma.designRound.findFirst({
    where: { id: roundId, projectId: user.projectId },
  });
  if (!round) fail("Ronde desain tidak ditemukan.");
  if (round.currentStep > 3) {
    fail("Deadlock hanya dicatat selama tahap penilaian dan keputusan.");
  }

  const nextCount = round.deadlockCount + 1;
  const autoTitle = `Deadlock keputusan: ${round.topic}`;

  await prisma.$transaction(async (tx) => {
    await tx.designRound.update({
      where: { id: round.id },
      data: { deadlockCount: nextCount },
    });

    if (nextCount < 2) return;

    const existing = await tx.conflict.findFirst({
      where: {
        projectId: user.projectId,
        type: "VISUAL_CONCEPT",
        title: autoTitle,
      },
    });
    if (existing) return;

    const conflict = await tx.conflict.create({
      data: {
        projectId: user.projectId,
        type: "VISUAL_CONCEPT",
        level: 2,
        title: autoTitle,
        description: `Ronde “${round.topic}” mengalami deadlock ${nextCount} kali. Sistem menyarankan perbandingan terstruktur dengan kriteria objektif dan purwarupa kecil dalam rapat tercatat.`,
        status: "IN_PROGRESS",
        openedById: user.id,
      },
    });

    await tx.conflictStep.create({
      data: {
        conflictId: conflict.id,
        level: 2,
        summary:
          "Dibuat otomatis karena deadlock mencapai dua putaran. PM diminta memfasilitasi perbandingan terstruktur dan mencatat dasar keputusan.",
      },
    });
  });

  revalidatePath("/conflicts");
  refresh();
  succeed(
    nextCount >= 2
      ? `Deadlock ke-${nextCount} dicatat. Konflik Level 2 otomatis dibuka dan PM diberi tahu.`
      : `Deadlock ke-${nextCount} dicatat. Putaran berikutnya akan memicu eskalasi Level 2.`,
  );
}
