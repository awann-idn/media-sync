"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@mediasync/db";

import { isPM, requireUser } from "~/server/auth";

const CONFLICT_TYPES = [
  "VISUAL_CONCEPT",
  "LATE_ASSET",
  "REVISION_DISPUTE",
  "RECURRING",
  "WORKLOAD",
] as const;

type ConflictTypeKey = (typeof CONFLICT_TYPES)[number];

function withQuery(path: string, key: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

function refresh(conflictId?: string) {
  revalidatePath("/conflicts");
  if (conflictId) {
    revalidatePath(`/conflicts/${conflictId}`);
    revalidatePath(`/conflicts/${conflictId}/pack`);
  }
  revalidatePath("/dashboard");
}

async function pmOrFail(path: string) {
  const user = await requireUser();
  if (!isPM(user)) {
    withQuery(path, "error", "Hanya Project Manager yang dapat menaikkan level konflik.");
  }
  return user;
}

export async function openConflict(formData: FormData) {
  const user = await requireUser();
  if (user.accessLevel === "OBSERVER") {
    withQuery("/conflicts", "error", "Observer tidak dapat membuka konflik.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (title.length < 5) withQuery("/conflicts", "error", "Judul konflik minimal 5 karakter.");
  if (description.length < 10) {
    withQuery("/conflicts", "error", "Deskripsi konflik minimal 10 karakter.");
  }
  if (!CONFLICT_TYPES.includes(type as ConflictTypeKey)) {
    withQuery("/conflicts", "error", "Jenis konflik tidak valid.");
  }

  const recentSince = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const sameTypeCount = await prisma.conflict.count({
    where: {
      projectId: user.projectId,
      type: type as ConflictTypeKey,
      createdAt: { gte: recentSince },
    },
  });

  const conflict = await prisma.conflict.create({
    data: {
      projectId: user.projectId,
      type: type as ConflictTypeKey,
      level: 1,
      title,
      description:
        sameTypeCount >= 2
          ? `${description}\n\nCatatan sistem: pola serupa muncul ${sameTypeCount + 1} kali dalam tiga minggu terakhir.`
          : description,
      status: "OPEN",
      openedById: user.id,
    },
  });

  await prisma.conflictStep.create({
    data: {
      conflictId: conflict.id,
      level: 1,
      summary:
        "Konflik dibuka. Diskusi langsung dijadwalkan maksimal 48 jam. Fokus pada fakta dan kendala, bukan penilaian pribadi.",
      decidedById: user.id,
    },
  });

  refresh(conflict.id);
  redirect(`/conflicts/${conflict.id}?ok=Konflik%20dicatat%20pada%20Level%201.`);
}

export async function advanceConflict(formData: FormData) {
  const user = await requireUser();
  const conflictId = String(formData.get("conflictId") ?? "");
  const path = `/conflicts/${conflictId}`;

  const conflict = await prisma.conflict.findFirst({
    where: { id: conflictId, projectId: user.projectId },
  });
  if (!conflict) withQuery("/conflicts", "error", "Konflik tidak ditemukan.");
  if (!isPM(user)) {
    withQuery(path, "error", "Hanya Project Manager yang dapat menaikkan level konflik.");
  }
  if (conflict.status === "RESOLVED") {
    withQuery(path, "error", "Konflik sudah diselesaikan.");
  }
  if (conflict.level >= 4) {
    withQuery(path, "error", "Konflik sudah berada di Level 4.");
  }

  const nextLevel = conflict.level + 1;
  const summary = String(formData.get("summary") ?? "").trim();
  if (summary.length < 10) {
    withQuery(path, "error", "Ringkasan langkah konflik minimal 10 karakter.");
  }

  let meetingNote = "";
  if (nextLevel === 2) {
    const meetingId = String(formData.get("meetingId") ?? "");
    const meeting = await prisma.meetingLog.findFirst({
      where: {
        id: meetingId,
        projectId: user.projectId,
        status: "COMPLETED",
      },
    });
    if (!meeting) {
      withQuery(
        path,
        "error",
        "Level 2 memerlukan rapat tercatat yang sudah selesai sebagai dasar perbandingan terstruktur.",
      );
    }
    meetingNote = `Rapat: ${meeting.title}. `;
  }

  if (nextLevel === 3 && !summary) {
    withQuery(path, "error", "Keputusan prosedural PM wajib memiliki alasan tertulis.");
  }

  await prisma.$transaction([
    prisma.conflict.update({
      where: { id: conflictId },
      data: {
        level: nextLevel,
        status: nextLevel === 4 ? "ESCALATED" : "IN_PROGRESS",
        escalatedAt: nextLevel === 4 ? new Date() : conflict.escalatedAt,
      },
    }),
    prisma.conflictStep.create({
      data: {
        conflictId,
        level: nextLevel,
        summary: `${meetingNote}${summary}`,
        decidedById: user.id,
      },
    }),
  ]);

  refresh(conflictId);
  withQuery(
    path,
    "ok",
    nextLevel === 4
      ? "Konflik dieskalasi ke dosen. Escalation Pack siap dicetak."
      : `Konflik dinaikkan ke Level ${nextLevel}.`,
  );
}

export async function resolveConflict(formData: FormData) {
  const user = await requireUser();
  const conflictId = String(formData.get("conflictId") ?? "");
  const path = `/conflicts/${conflictId}`;

  const conflict = await prisma.conflict.findFirst({
    where: { id: conflictId, projectId: user.projectId },
  });
  if (!conflict) withQuery("/conflicts", "error", "Konflik tidak ditemukan.");
  if (!isPM(user)) {
    withQuery(path, "error", "Hanya Project Manager yang dapat menutup konflik.");
  }
  if (conflict.status === "RESOLVED") {
    withQuery(path, "error", "Konflik sudah diselesaikan.");
  }

  const summary = String(formData.get("summary") ?? "").trim();
  if (summary.length < 10) {
    withQuery(path, "error", "Catatan penyelesaian minimal 10 karakter.");
  }

  await prisma.$transaction([
    prisma.conflict.update({
      where: { id: conflictId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    }),
    prisma.conflictStep.create({
      data: {
        conflictId,
        level: conflict.level,
        summary,
        decidedById: user.id,
      },
    }),
  ]);

  refresh(conflictId);
  withQuery(path, "ok", "Konflik ditandai selesai dengan catatan penyelesaian.");
}

export async function saveConflictRequest(formData: FormData) {
  const user = await pmOrFail(`/conflicts/${String(formData.get("conflictId") ?? "")}`);
  const conflictId = String(formData.get("conflictId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  if (summary.length < 10) {
    withQuery(`/conflicts/${conflictId}`, "error", "Permintaan spesifik ke dosen minimal 10 karakter.");
  }

  const conflict = await prisma.conflict.findFirst({
    where: { id: conflictId, projectId: user.projectId },
  });
  if (!conflict) withQuery("/conflicts", "error", "Konflik tidak ditemukan.");

  await prisma.conflict.update({
    where: { id: conflictId },
    data: { summary },
  });

  refresh(conflictId);
  withQuery(`/conflicts/${conflictId}`, "ok", "Permintaan spesifik ke dosen tersimpan.");
}
