"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma, type TaskStatus } from "@mediasync/db";

import {
  canApproveTask,
  isPM,
  requireMember,
  requireUser,
} from "~/server/auth";

function withError(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function withSuccess(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}ok=${encodeURIComponent(message)}`);
}

function refresh(taskId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

export async function createTask(formData: FormData) {
  const user = await requireUser();
  if (!isPM(user)) withError("/tasks", "Hanya Project Manager yang dapat membuat tugas.");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const phase = String(formData.get("phase") ?? "PRE_PRODUCTION");
  const stepNo = Number(formData.get("stepNo"));
  const assignedUserId = String(formData.get("assignedUserId") ?? "");
  const backupUserId = String(formData.get("backupUserId") ?? "");
  const internalRaw = String(formData.get("internalDeadline") ?? "");
  const officialRaw = String(formData.get("officialDeadline") ?? "");

  if (!title) withError("/tasks?new=1", "Judul tugas wajib diisi.");
  if (!["PRE_PRODUCTION", "PRODUCTION", "POST_PRODUCTION"].includes(phase)) {
    withError("/tasks?new=1", "Fase tugas tidak valid.");
  }
  if (!Number.isInteger(stepNo) || stepNo < 1) {
    withError("/tasks?new=1", "Nomor langkah harus bilangan bulat positif.");
  }
  if (!assignedUserId) withError("/tasks?new=1", "Pilih penanggung jawab.");
  if (backupUserId && backupUserId === assignedUserId) {
    withError("/tasks?new=1", "PIC cadangan harus berbeda dari PIC utama.");
  }

  const internalDeadline = new Date(internalRaw);
  const officialDeadline = new Date(officialRaw);
  if (
    Number.isNaN(internalDeadline.getTime()) ||
    Number.isNaN(officialDeadline.getTime())
  ) {
    withError("/tasks?new=1", "Tanggal deadline tidak valid.");
  }
  if (internalDeadline >= officialDeadline) {
    withError(
      "/tasks?new=1",
      "Deadline internal harus lebih awal daripada deadline resmi.",
    );
  }

  const [assignee, backup] = await Promise.all([
    prisma.user.findFirst({
      where: { id: assignedUserId, projectId: user.projectId },
    }),
    backupUserId
      ? prisma.user.findFirst({
          where: { id: backupUserId, projectId: user.projectId },
        })
      : Promise.resolve(null),
  ]);
  if (!assignee) withError("/tasks?new=1", "Penanggung jawab tidak ditemukan.");
  if (backupUserId && !backup) withError("/tasks?new=1", "PIC cadangan tidak ditemukan.");

  try {
    const task = await prisma.task.create({
      data: {
        projectId: user.projectId,
        title,
        description: description || null,
        phase: phase as "PRE_PRODUCTION" | "PRODUCTION" | "POST_PRODUCTION",
        stepNo,
        assignedUserId,
        backupUserId: backupUserId || null,
        internalDeadline,
        officialDeadline,
        status: "NOT_STARTED",
      },
    });

    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        toStatus: "NOT_STARTED",
        changedById: user.id,
        note: "Tugas dibuat.",
      },
    });

    refresh(task.id);
    redirect(`/tasks/${task.id}?ok=${encodeURIComponent("Tugas berhasil dibuat.")}`);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    withError(
      "/tasks?new=1",
      "Gagal membuat tugas. Pastikan nomor langkah belum dipakai.",
    );
  }
}

export async function changeTaskStatus(formData: FormData) {
  const user = await requireMember();
  const taskId = String(formData.get("taskId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      dependencies: { include: { dependsOnTask: true } },
    },
  });
  if (!task || task.projectId !== user.projectId) withError("/tasks", "Tugas tidak ditemukan.");

  const path = `/tasks/${task.id}`;
  const allPredecessorsDone = task.dependencies.every(
    (dependency) => dependency.dependsOnTask.status === "COMPLETED",
  );

  let nextStatus: TaskStatus;
  let historyNote = note;

  switch (intent) {
    case "start": {
      if (task.status !== "NOT_STARTED") withError(path, "Tugas tidak berada di status Belum mulai.");
      if (!allPredecessorsDone) {
        withError(path, "Tugas sebelumnya belum selesai. Selesaikan prasyarat terlebih dahulu.");
      }
      nextStatus = "IN_PROGRESS";
      historyNote = note || "Pengerjaan dimulai.";
      break;
    }
    case "review": {
      if (task.status !== "IN_PROGRESS") withError(path, "Hanya tugas yang dikerjakan dapat diajukan review.");
      if (!task.deliverableUrl) {
        withError(path, "Unggah tautan deliverable sebelum mengajukan review.");
      }
      nextStatus = "UNDER_REVIEW";
      historyNote = note || "Diajukan untuk review.";
      break;
    }
    case "approve": {
      if (!canApproveTask(user)) withError(path, "Hanya PM atau QC yang dapat menyetujui tugas.");
      if (user.id === task.assignedUserId) {
        withError(path, "PIC tidak boleh menyetujui pekerjaannya sendiri.");
      }
      if (task.status !== "UNDER_REVIEW") withError(path, "Tugas belum diajukan untuk review.");
      if (!allPredecessorsDone) {
        withError(path, "Semua tugas prasyarat harus selesai sebelum persetujuan.");
      }
      if (!task.deliverableUrl) withError(path, "Deliverable belum diunggah.");
      nextStatus = "COMPLETED";
      historyNote = note || `Disetujui oleh ${user.name}.`;
      break;
    }
    case "reject": {
      if (!canApproveTask(user)) withError(path, "Hanya PM atau QC yang dapat menolak review.");
      if (task.status !== "UNDER_REVIEW") withError(path, "Tugas belum diajukan untuk review.");
      nextStatus = "IN_PROGRESS";
      historyNote = note || "Dikembalikan untuk revisi.";
      break;
    }
    case "block": {
      if (!note) withError(path, "Alasan hambatan wajib diisi.");
      if (task.status === "COMPLETED") withError(path, "Tugas selesai tidak dapat diblokir.");
      nextStatus = "BLOCKED";
      historyNote = note;
      break;
    }
    case "unblock": {
      if (task.status !== "BLOCKED") withError(path, "Tugas tidak sedang terhambat.");
      nextStatus = "IN_PROGRESS";
      historyNote = note || "Hambatan diselesaikan.";
      break;
    }
    default:
      withError(path, "Aksi tidak dikenal.");
  }

  await prisma.$transaction([
    prisma.task.update({
      where: { id: task.id },
      data: {
        status: nextStatus,
        blockedReason: nextStatus === "BLOCKED" ? historyNote : null,
        completedAt: nextStatus === "COMPLETED" ? new Date() : null,
      },
    }),
    prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: task.status,
        toStatus: nextStatus,
        changedById: user.id,
        note: historyNote || null,
      },
    }),
  ]);

  refresh(task.id);
  withSuccess(path, "Status tugas diperbarui.");
}

export async function uploadDeliverable(formData: FormData) {
  const user = await requireMember();
  const taskId = String(formData.get("taskId") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();

  if (!url) withError(`/tasks/${taskId}`, "Tautan deliverable wajib diisi.");
  if (!/^https?:\/\//i.test(url)) {
    withError(`/tasks/${taskId}`, "Tautan harus dimulai dengan http:// atau https://.");
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { deliverables: true },
  });
  if (!task || task.projectId !== user.projectId) withError("/tasks", "Tugas tidak ditemukan.");

  const latest = task.deliverables.reduce(
    (max, item) => Math.max(max, item.version),
    0,
  );

  await prisma.$transaction([
    prisma.deliverable.create({
      data: {
        taskId: task.id,
        version: latest + 1,
        url,
        type: type || null,
        uploadedById: user.id,
      },
    }),
    prisma.task.update({
      where: { id: task.id },
      data: { deliverableUrl: url, deliverableType: type || null },
    }),
  ]);

  refresh(task.id);
  withSuccess(`/tasks/${task.id}`, `Deliverable versi ${latest + 1} diunggah.`);
}
