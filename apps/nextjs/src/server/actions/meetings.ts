"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@mediasync/db";

import { canFacilitate, requireUser } from "~/server/auth";

function withQuery(path: string, key: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

function refresh(meetingId?: string) {
  revalidatePath("/meetings");
  if (meetingId) revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

async function facilitatorOrFail(path: string) {
  const user = await requireUser();
  if (!canFacilitate(user)) {
    withQuery(path, "error", "Hanya PM atau Content Designer yang dapat mengelola rapat.");
  }
  return user;
}

async function meetingInProject(meetingId: string, projectId: string) {
  return prisma.meetingLog.findFirst({
    where: { id: meetingId, projectId },
    include: {
      decisions: { orderBy: { number: "asc" } },
      actionItems: true,
    },
  });
}

export async function createMeeting(formData: FormData) {
  const path = "/meetings";
  const user = await facilitatorOrFail(path);

  const title = String(formData.get("title") ?? "").trim();
  const agenda = String(formData.get("agenda") ?? "").trim();
  const scheduledRaw = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = new Date(scheduledRaw);

  if (title.length < 3) withQuery(path, "error", "Judul rapat minimal 3 karakter.");
  if (agenda.length < 10) withQuery(path, "error", "Agenda rapat minimal 10 karakter.");
  if (Number.isNaN(scheduledAt.getTime())) {
    withQuery(path, "error", "Tanggal rapat tidak valid.");
  }
  if (scheduledAt.getTime() < Date.now() + 24 * 60 * 60 * 1000) {
    withQuery(
      path,
      "error",
      "Agenda harus dikirim minimal 24 jam sebelum rapat dimulai.",
    );
  }

  const meeting = await prisma.meetingLog.create({
    data: {
      projectId: user.projectId,
      title,
      agenda,
      scheduledAt,
      agendaSentAt: new Date(),
      status: "PLANNED",
      createdById: user.id,
    },
  });

  refresh(meeting.id);
  redirect(`/meetings/${meeting.id}?ok=Agenda%20rapat%20terkirim%20dan%20rapat%20dibuat.`);
}

export async function saveMeetingMinutes(formData: FormData) {
  const user = await facilitatorOrFail("/meetings");
  const meetingId = String(formData.get("meetingId") ?? "");
  const minutes = String(formData.get("minutes") ?? "").trim();

  const meeting = await meetingInProject(meetingId, user.projectId);
  if (!meeting) withQuery("/meetings", "error", "Rapat tidak ditemukan.");
  if (meeting.status === "COMPLETED") {
    withQuery(`/meetings/${meetingId}`, "error", "Rapat yang sudah ditutup bersifat read-only.");
  }
  if (minutes.length < 10) {
    withQuery(`/meetings/${meetingId}`, "error", "Notulen minimal 10 karakter.");
  }

  await prisma.meetingLog.update({
    where: { id: meetingId },
    data: { minutes },
  });

  refresh(meetingId);
  withQuery(`/meetings/${meetingId}`, "ok", "Notulen tersimpan.");
}

export async function addMeetingDecision(formData: FormData) {
  const user = await facilitatorOrFail("/meetings");
  const meetingId = String(formData.get("meetingId") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  const meeting = await meetingInProject(meetingId, user.projectId);
  if (!meeting) withQuery("/meetings", "error", "Rapat tidak ditemukan.");
  if (meeting.status === "COMPLETED") {
    withQuery(`/meetings/${meetingId}`, "error", "Log keputusan rapat yang ditutup tidak dapat diubah.");
  }
  if (text.length < 10) {
    withQuery(`/meetings/${meetingId}`, "error", "Keputusan minimal 10 karakter.");
  }

  const last = meeting.decisions[meeting.decisions.length - 1];
  await prisma.meetingDecision.create({
    data: {
      meetingId,
      number: (last?.number ?? 0) + 1,
      text,
    },
  });

  refresh(meetingId);
  withQuery(`/meetings/${meetingId}`, "ok", "Keputusan rapat ditambahkan dan tidak dapat diedit.");
}

export async function addActionItem(formData: FormData) {
  const user = await facilitatorOrFail("/meetings");
  const meetingId = String(formData.get("meetingId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "");
  const dueRaw = String(formData.get("dueDate") ?? "");
  const dueDate = new Date(dueRaw);

  const meeting = await meetingInProject(meetingId, user.projectId);
  if (!meeting) withQuery("/meetings", "error", "Rapat tidak ditemukan.");
  if (meeting.status === "COMPLETED") {
    withQuery(`/meetings/${meetingId}`, "error", "Action item tidak dapat ditambahkan ke rapat yang sudah ditutup.");
  }
  if (description.length < 5) {
    withQuery(`/meetings/${meetingId}`, "error", "Action item minimal 5 karakter.");
  }
  if (Number.isNaN(dueDate.getTime())) {
    withQuery(`/meetings/${meetingId}`, "error", "Tenggat action item tidak valid.");
  }

  const owner = await prisma.user.findFirst({
    where: { id: ownerId, projectId: user.projectId, accessLevel: "MEMBER" },
  });
  if (!owner) withQuery(`/meetings/${meetingId}`, "error", "Pemilik action item tidak ditemukan.");

  await prisma.actionItem.create({
    data: { meetingId, description, ownerId, dueDate },
  });

  refresh(meetingId);
  withQuery(`/meetings/${meetingId}`, "ok", "Action item ditambahkan dengan pemilik dan tenggat.");
}

export async function completeActionItem(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");

  const item = await prisma.actionItem.findFirst({
    where: { id: itemId, meeting: { projectId: user.projectId } },
    include: { meeting: true },
  });
  if (!item) withQuery("/meetings", "error", "Action item tidak ditemukan.");
  if (item.completedAt) {
    withQuery(`/meetings/${item.meetingId}`, "error", "Action item sudah selesai.");
  }
  if (item.ownerId !== user.id && !canFacilitate(user)) {
    withQuery(`/meetings/${item.meetingId}`, "error", "Hanya pemilik atau fasilitator yang dapat menyelesaikan action item.");
  }

  await prisma.actionItem.update({
    where: { id: itemId },
    data: { completedAt: new Date() },
  });

  refresh(item.meetingId);
  withQuery(`/meetings/${item.meetingId}`, "ok", "Action item ditandai selesai.");
}

export async function convertActionItemToTask(formData: FormData) {
  const user = await facilitatorOrFail("/meetings");
  const itemId = String(formData.get("itemId") ?? "");

  const item = await prisma.actionItem.findFirst({
    where: { id: itemId, meeting: { projectId: user.projectId } },
    include: { meeting: true, owner: true },
  });
  if (!item) withQuery("/meetings", "error", "Action item tidak ditemukan.");
  if (item.taskId) {
    withQuery(`/meetings/${item.meetingId}`, "error", "Action item ini sudah terhubung ke tugas.");
  }

  const lastTask = await prisma.task.findFirst({
    where: { projectId: user.projectId },
    orderBy: { stepNo: "desc" },
    select: { stepNo: true },
  });

  const internalDeadline = item.dueDate;
  const officialDeadline = new Date(item.dueDate.getTime() + 3 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        projectId: user.projectId,
        phase: "PRE_PRODUCTION",
        stepNo: (lastTask?.stepNo ?? 0) + 1,
        title: item.description.slice(0, 90),
        description: `Dibuat dari action item rapat “${item.meeting.title}”.`,
        assignedUserId: item.ownerId,
        internalDeadline,
        officialDeadline,
        status: "NOT_STARTED",
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        taskId: task.id,
        toStatus: "NOT_STARTED",
        changedById: user.id,
        note: "Dibuat dari action item rapat.",
      },
    });

    await tx.actionItem.update({
      where: { id: item.id },
      data: { taskId: task.id },
    });
  });

  refresh(item.meetingId);
  withQuery(`/meetings/${item.meetingId}`, "ok", "Action item diubah menjadi tugas dengan tenggat internal dan resmi.");
}

export async function saveAttendance(formData: FormData) {
  const user = await facilitatorOrFail("/meetings");
  const meetingId = String(formData.get("meetingId") ?? "");

  const meeting = await meetingInProject(meetingId, user.projectId);
  if (!meeting) withQuery("/meetings", "error", "Rapat tidak ditemukan.");
  if (meeting.status === "COMPLETED") {
    withQuery(`/meetings/${meetingId}`, "error", "Absensi rapat yang sudah ditutup bersifat read-only.");
  }

  const members = await prisma.user.findMany({
    where: { projectId: user.projectId, accessLevel: "MEMBER" },
    select: { id: true },
  });

  const allowed = new Set(["PRESENT", "EXCUSED", "ABSENT"]);
  const updates = members
    .map((member) => ({
      userId: member.id,
      status: String(formData.get(`attendance-${member.id}`) ?? "PRESENT"),
    }))
    .filter((entry) => allowed.has(entry.status));

  await prisma.$transaction(
    updates.map((entry) =>
      prisma.attendance.upsert({
        where: {
          meetingId_userId: { meetingId, userId: entry.userId },
        },
        update: { status: entry.status },
        create: {
          meetingId,
          userId: entry.userId,
          status: entry.status,
        },
      }),
    ),
  );

  refresh(meetingId);
  withQuery(`/meetings/${meetingId}`, "ok", "Absensi tersimpan.");
}

export async function closeMeeting(formData: FormData) {
  const user = await facilitatorOrFail("/meetings");
  const meetingId = String(formData.get("meetingId") ?? "");

  const meeting = await meetingInProject(meetingId, user.projectId);
  if (!meeting) withQuery("/meetings", "error", "Rapat tidak ditemukan.");
  if (meeting.status === "COMPLETED") {
    withQuery(`/meetings/${meetingId}`, "error", "Rapat sudah ditutup.");
  }
  if (!meeting.minutes?.trim()) {
    withQuery(`/meetings/${meetingId}`, "error", "Notulen wajib diisi sebelum rapat ditutup.");
  }
  if (meeting.decisions.length === 0) {
    withQuery(`/meetings/${meetingId}`, "error", "Rapat tidak dapat ditutup tanpa keputusan bernomor.");
  }
  if (meeting.actionItems.length === 0) {
    withQuery(`/meetings/${meetingId}`, "error", "Rapat tidak dapat ditutup tanpa action item yang memiliki pemilik dan tenggat.");
  }

  await prisma.meetingLog.update({
    where: { id: meetingId },
    data: { status: "COMPLETED" },
  });

  refresh(meetingId);
  withQuery(`/meetings/${meetingId}`, "ok", "Rapat ditutup. Dokumentasi lengkap terkunci.");
}
