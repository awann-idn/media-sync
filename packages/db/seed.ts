import { prisma } from "./index";
import {
  aggregateEvaluation,
  computeDecisionScore,
  INDICATORS,
  type EvaluationEntry,
} from "@mediasync/shared";

const PROJECT_ID = "project-mediasync";

const ROLES = [
  { id: "role-pm", code: "PM", name: "Project Manager" },
  { id: "role-cd", code: "CD", name: "Content Designer" },
  { id: "role-gd", code: "GD", name: "Graphic Designer" },
  { id: "role-ave", code: "AVE", name: "Audio/Video Editor" },
  { id: "role-qc", code: "QC", name: "Quality Control" },
];

const USERS = [
  {
    id: "user-rani",
    name: "Rani",
    email: "rani@mediasync.local",
    roleId: "role-pm",
    secondaryRoleId: "role-qc",
    avatarColor: "#2B4C3B",
  },
  {
    id: "user-dimas",
    name: "Dimas",
    email: "dimas@mediasync.local",
    roleId: "role-ave",
    secondaryRoleId: "role-gd",
    avatarColor: "#6E9AA8",
  },
  {
    id: "user-salsa",
    name: "Salsa",
    email: "salsa@mediasync.local",
    roleId: "role-cd",
    secondaryRoleId: "role-pm",
    avatarColor: "#C08457",
  },
  {
    id: "user-bayu",
    name: "Bayu",
    email: "bayu@mediasync.local",
    roleId: "role-gd",
    secondaryRoleId: "role-ave",
    avatarColor: "#D9626B",
  },
  {
    id: "user-naya",
    name: "Naya",
    email: "naya@mediasync.local",
    roleId: "role-qc",
    secondaryRoleId: "role-cd",
    avatarColor: "#8FAE93",
  },
  {
    id: "user-dosen",
    name: "Pak Dosen",
    email: "dosen@mediasync.local",
    roleId: "role-qc",
    secondaryRoleId: null,
    avatarColor: "#55655B",
    accessLevel: "OBSERVER" as const,
  },
];

const CRITERIA = [
  { id: "crit-goal", code: "GOAL_FIT", name: "Kesesuaian tujuan", weight: 20, ownerRoleId: "role-pm" },
  { id: "crit-audience", code: "AUDIENCE", name: "Kesesuaian audiens", weight: 15, ownerRoleId: "role-cd" },
  { id: "crit-read", code: "READABILITY", name: "Keterbacaan", weight: 15, ownerRoleId: "role-cd" },
  { id: "crit-consist", code: "CONSISTENCY", name: "Konsistensi", weight: 15, ownerRoleId: "role-gd" },
  { id: "crit-feas", code: "FEASIBILITY", name: "Kelayakan produksi", weight: 15, minThreshold: 3, ownerRoleId: "role-ave" },
  { id: "crit-time", code: "TIMELINE", name: "Kelayakan waktu", weight: 10, ownerRoleId: "role-pm" },
  { id: "crit-integ", code: "INTEGRATION", name: "Integrasi aset", weight: 10, ownerRoleId: "role-ave" },
];

const TASKS = [
  { id: "task-1", stepNo: 1, phase: "PRE_PRODUCTION", title: "Team charter & kesepakatan kerja", assignedUserId: "user-rani", backupUserId: "user-naya", internalDeadline: "2026-10-27T17:00:00+07:00", officialDeadline: "2026-10-30T17:00:00+07:00", status: "COMPLETED", deliverableUrl: "https://docs.example.com/charter", deliverableType: "Dokumen", completedAt: "2026-10-28T14:00:00+07:00" },
  { id: "task-2", stepNo: 2, phase: "PRE_PRODUCTION", title: "Riset audiens & referensi visual", assignedUserId: "user-salsa", backupUserId: "user-rani", internalDeadline: "2026-10-29T17:00:00+07:00", officialDeadline: "2026-11-01T17:00:00+07:00", status: "COMPLETED", deliverableUrl: "https://docs.example.com/riset-audiens", deliverableType: "Riset", completedAt: "2026-10-31T11:00:00+07:00" },
  { id: "task-3", stepNo: 3, phase: "PRE_PRODUCTION", title: "Naskah & storyboard", assignedUserId: "user-salsa", backupUserId: "user-naya", internalDeadline: "2026-11-01T17:00:00+07:00", officialDeadline: "2026-11-03T17:00:00+07:00", status: "COMPLETED", deliverableUrl: "https://docs.example.com/storyboard-v2", deliverableType: "Storyboard", completedAt: "2026-11-02T16:00:00+07:00" },
  { id: "task-4", stepNo: 4, phase: "PRE_PRODUCTION", title: "Style guide visual", assignedUserId: "user-bayu", backupUserId: "user-dimas", internalDeadline: "2026-11-05T17:00:00+07:00", officialDeadline: "2026-11-08T17:00:00+07:00", status: "BLOCKED", blockedReason: "Menunggu keputusan arah visual dari decision matrix" },
  { id: "task-5", stepNo: 5, phase: "PRODUCTION", title: "Produksi aset grafis", assignedUserId: "user-bayu", backupUserId: "user-dimas", internalDeadline: "2026-11-09T17:00:00+07:00", officialDeadline: "2026-11-12T17:00:00+07:00", status: "NOT_STARTED" },
  { id: "task-6", stepNo: 6, phase: "PRODUCTION", title: "Rekaman audio & video", assignedUserId: "user-dimas", backupUserId: "user-bayu", internalDeadline: "2026-11-13T17:00:00+07:00", officialDeadline: "2026-11-16T17:00:00+07:00", status: "NOT_STARTED" },
  { id: "task-7", stepNo: 7, phase: "PRODUCTION", title: "Editing rough cut", assignedUserId: "user-dimas", backupUserId: "user-bayu", internalDeadline: "2026-11-18T17:00:00+07:00", officialDeadline: "2026-11-20T17:00:00+07:00", status: "NOT_STARTED" },
  { id: "task-8", stepNo: 8, phase: "POST_PRODUCTION", title: "Quality control", assignedUserId: "user-naya", backupUserId: "user-rani", internalDeadline: "2026-11-21T17:00:00+07:00", officialDeadline: "2026-11-23T17:00:00+07:00", status: "NOT_STARTED" },
  { id: "task-9", stepNo: 9, phase: "POST_PRODUCTION", title: "Revisi akhir", assignedUserId: "user-dimas", backupUserId: "user-bayu", internalDeadline: "2026-11-24T17:00:00+07:00", officialDeadline: "2026-11-26T17:00:00+07:00", status: "NOT_STARTED" },
  { id: "task-10", stepNo: 10, phase: "POST_PRODUCTION", title: "Rendering & dokumentasi", assignedUserId: "user-dimas", backupUserId: "user-rani", internalDeadline: "2026-11-27T17:00:00+07:00", officialDeadline: "2026-11-29T17:00:00+07:00", status: "NOT_STARTED" },
  { id: "task-11", stepNo: 11, phase: "POST_PRODUCTION", title: "Penyerahan tugas", assignedUserId: "user-rani", backupUserId: "user-naya", internalDeadline: "2026-11-30T17:00:00+07:00", officialDeadline: "2026-12-02T17:00:00+07:00", status: "NOT_STARTED" },
];

const DECISIONS = [
  {
    id: "decision-hangat",
    title: "Hangat & organik",
    proposerId: "user-salsa",
    proposedIdea:
      "Palet warna bumi, foto tangan yang bekerja, tekstur kertas, dan narasi personal dari anggota komunitas.",
    referenceUrl: "https://www.behance.net/gallery/organic-community-film",
    scores: {
      "crit-goal": [5, 4, 5, 4, 5],
      "crit-audience": [4, 4, 5, 4, 4],
      "crit-read": [5, 4, 4, 5, 4],
      "crit-consist": [5, 5, 4, 4, 5],
      "crit-feas": [4, 4, 4, 5, 4],
      "crit-time": [4, 4, 3, 4, 4],
      "crit-integ": [5, 4, 4, 5, 4],
    } as Record<string, number[]>,
  },
  {
    id: "decision-gelap",
    title: "Minimalis gelap",
    proposerId: "user-bayu",
    proposedIdea:
      "Latar gelap, tipografi tebal, aksen neon, dan transisi cepat untuk kesan modern.",
    referenceUrl: "https://www.behance.net/gallery/dark-minimal-motion",
    scores: {
      "crit-goal": [5, 5, 5, 5, 5],
      "crit-audience": [4, 5, 4, 5, 4],
      "crit-read": [5, 4, 5, 5, 4],
      "crit-consist": [5, 5, 5, 4, 5],
      "crit-feas": [2, 2, 3, 2, 3],
      "crit-time": [4, 4, 5, 4, 4],
      "crit-integ": [5, 4, 5, 5, 5],
    } as Record<string, number[]>,
  },
  {
    id: "decision-retro",
    title: "Retro kampus",
    proposerId: "user-dimas",
    proposedIdea:
      "Nuansa arsip kampus era 90-an dengan grain, warna pudar, dan potongan dokumenter.",
    referenceUrl: "https://www.behance.net/gallery/campus-archive",
    scores: {
      "crit-goal": [4, 4, 3, 4, 4],
      "crit-audience": [3, 4, 3, 4, 3],
      "crit-read": [4, 3, 4, 3, 4],
      "crit-consist": [4, 4, 3, 3, 4],
      "crit-feas": [4, 3, 4, 3, 4],
      "crit-time": [3, 4, 3, 3, 4],
      "crit-integ": [4, 3, 3, 4, 3],
    } as Record<string, number[]>,
  },
];

const PEER_SCORES: Record<string, { peers: number[]; self: number }> = {
  "user-rani": { peers: [5, 5, 4, 5], self: 4 },
  "user-dimas": { peers: [4, 5, 4, 4], self: 4 },
  "user-salsa": { peers: [4, 4, 5, 4], self: 5 },
  "user-naya": { peers: [4, 4, 4, 5], self: 4 },
  "user-bayu": { peers: [2, 2, 3, 2], self: 2 },
};

async function clearAll() {
  await prisma.conflictStep.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.evaluationEntry.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.meetingDecision.deleteMany();
  await prisma.meetingLog.deleteMany();
  await prisma.styleGuideVersion.deleteMany();
  await prisma.decisionScore.deleteMany();
  await prisma.designDecision.deleteMany();
  await prisma.designRound.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.decisionCriterion.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.project.deleteMany();
}

async function main() {
  await clearAll();

  await prisma.project.create({
    data: {
      id: PROJECT_ID,
      name: "Film Profil Komunitas Kampus",
      productGoal:
        "Membuat video profil komunitas kampus yang jujur, hangat, dan mudah dipahami oleh mahasiswa baru.",
      audienceProfile:
        "Mahasiswa baru, calon anggota komunitas, dan dosen pembimbing yang ingin melihat kegiatan nyata anggota.",
      goalConfirmed: true,
      audienceConfirmed: true,
      officialEnd: new Date("2026-12-20T17:00:00+07:00"),
    },
  });

  await prisma.role.createMany({ data: ROLES });

  for (const user of USERS) {
    await prisma.user.create({
      data: {
        id: user.id,
        projectId: PROJECT_ID,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        secondaryRoleId: user.secondaryRoleId,
        avatarColor: user.avatarColor,
        accessLevel: "accessLevel" in user ? user.accessLevel : "MEMBER",
        pmApprovedByAll: user.id === "user-rani",
      },
    });
  }

  await prisma.decisionCriterion.createMany({
    data: CRITERIA.map((criterion) => ({
      id: criterion.id,
      code: criterion.code,
      name: criterion.name,
      weight: criterion.weight,
      ownerRoleId: criterion.ownerRoleId,
      minThreshold: criterion.minThreshold ?? null,
    })),
  });

  for (const task of TASKS) {
    await prisma.task.create({
      data: {
        id: task.id,
        projectId: PROJECT_ID,
        phase: task.phase as "PRE_PRODUCTION" | "PRODUCTION" | "POST_PRODUCTION",
        stepNo: task.stepNo,
        title: task.title,
        assignedUserId: task.assignedUserId,
        backupUserId: task.backupUserId,
        internalDeadline: new Date(task.internalDeadline),
        officialDeadline: new Date(task.officialDeadline),
        status: task.status as
          | "NOT_STARTED"
          | "IN_PROGRESS"
          | "UNDER_REVIEW"
          | "COMPLETED"
          | "BLOCKED",
        deliverableUrl: "deliverableUrl" in task ? task.deliverableUrl : null,
        deliverableType: "deliverableType" in task ? task.deliverableType : null,
        completedAt:
          "completedAt" in task && task.completedAt
            ? new Date(task.completedAt)
            : null,
        blockedReason:
          "blockedReason" in task ? task.blockedReason : null,
      },
    });
  }

  for (let index = 1; index < TASKS.length; index += 1) {
    const current = TASKS[index];
    const previous = TASKS[index - 1];
    if (!current || !previous) continue;
    await prisma.taskDependency.create({
      data: { taskId: current.id, dependsOnTaskId: previous.id },
    });
  }

  const completions = [
    { taskId: "task-1", fromStatus: "IN_PROGRESS" as const, changedById: "user-rani", note: "Charter disepakati seluruh anggota." },
    { taskId: "task-2", fromStatus: "IN_PROGRESS" as const, changedById: "user-salsa", note: "Riset audiens selesai." },
    { taskId: "task-3", fromStatus: "IN_PROGRESS" as const, changedById: "user-salsa", note: "Storyboard versi 2 disetujui QC." },
    { taskId: "task-4", fromStatus: "IN_PROGRESS" as const, changedById: "user-bayu", note: "Terhambat menunggu keputusan arah visual." },
  ];

  for (const history of completions) {
    await prisma.taskStatusHistory.create({
      data: {
        taskId: history.taskId,
        fromStatus: history.fromStatus,
        toStatus: history.taskId === "task-4" ? "BLOCKED" : "COMPLETED",
        changedById: history.changedById,
        note: history.note,
      },
    });
  }

  for (const taskId of ["task-1", "task-2", "task-3"]) {
    const task = TASKS.find((item) => item.id === taskId);
    if (!task || !("deliverableUrl" in task) || !task.deliverableUrl) continue;
    await prisma.deliverable.create({
      data: {
        taskId,
        version: 1,
        url: task.deliverableUrl,
        type: task.deliverableType ?? null,
        uploadedById: task.assignedUserId,
      },
    });
  }

  await prisma.deliverable.create({
    data: {
      taskId: "task-3",
      version: 2,
      url: "https://docs.example.com/storyboard-v2",
      type: "Storyboard",
      uploadedById: "user-salsa",
    },
  });

  await prisma.designRound.create({
    data: {
      id: "round-visual",
      projectId: PROJECT_ID,
      topic: "Arah visual utama video profil",
      currentStep: 3,
      deadlockCount: 0,
    },
  });

  const criteriaForScore = CRITERIA.map((criterion) => ({
    id: criterion.id,
    weight: criterion.weight,
    minThreshold: criterion.minThreshold ?? null,
  }));

  for (const decision of DECISIONS) {
    const score = computeDecisionScore(criteriaForScore, decision.scores);
    await prisma.designDecision.create({
      data: {
        id: decision.id,
        roundId: "round-visual",
        proposerId: decision.proposerId,
        title: decision.title,
        proposedIdea: decision.proposedIdea,
        referenceUrl: decision.referenceUrl,
        score,
        status: "SHORTLISTED",
      },
    });

    for (const criterion of CRITERIA) {
      const values = decision.scores[criterion.id] ?? [];
      for (let index = 0; index < USERS.length - 1; index += 1) {
        const user = USERS[index];
        const value = values[index];
        if (!user || value === undefined) continue;
        await prisma.decisionScore.create({
          data: {
            decisionId: decision.id,
            criterionId: criterion.id,
            scorerId: user.id,
            score: value,
          },
        });
      }
    }
  }

  for (const user of USERS.filter((item) => item.id !== "user-dosen")) {
    const preset = PEER_SCORES[user.id];
    if (!preset) continue;

    const peerIds = USERS.filter(
      (item) => item.id !== "user-dosen" && item.id !== user.id,
    ).map((item) => item.id);

    const entries: EvaluationEntry[] = [];
    for (const indicator of INDICATORS) {
      for (let index = 0; index < peerIds.length; index += 1) {
        entries.push({
          indicator,
          score: preset.peers[index] ?? 3,
          isSelf: false,
        });
      }
      entries.push({ indicator, score: preset.self, isSelf: true });
    }

    const aggregated = aggregateEvaluation(entries);

    const evaluation = await prisma.evaluation.create({
      data: {
        projectId: PROJECT_ID,
        userId: user.id,
        period: "PRE",
        activeScore: aggregated.activeScore,
        disciplineScore: aggregated.disciplineScore,
        totalScore: aggregated.totalScore,
        category: aggregated.category,
      },
    });

    for (const indicator of INDICATORS) {
      const peerEntries = peerIds.map((evaluatorId, index) => ({
        evaluationId: evaluation.id,
        evaluatorId,
        isSelf: false,
        indicator,
        score: preset.peers[index] ?? 3,
        note:
          user.id === "user-bayu"
            ? "Perlu bantuan membagi prioritas aset."
            : "Kontribusi terlihat konsisten.",
      }));

      await prisma.evaluationEntry.createMany({ data: peerEntries });
      await prisma.evaluationEntry.create({
        data: {
          evaluationId: evaluation.id,
          evaluatorId: user.id,
          isSelf: true,
          indicator,
          score: preset.self,
        },
      });
    }
  }

  await prisma.intervention.create({
    data: {
      projectId: PROJECT_ID,
      userId: "user-bayu",
      step: "NUDGE",
      causeCode: "UNKNOWN",
      notes:
        "Pengingat awal untuk memperbarui progres aset grafis. Belum ada sanksi.",
      recordedById: "user-rani",
    },
  });

  const meeting = await prisma.meetingLog.create({
    data: {
      id: "meeting-kickoff",
      projectId: PROJECT_ID,
      title: "Rapat kickoff produksi",
      scheduledAt: new Date("2026-10-30T15:00:00+07:00"),
      agenda:
        "1. Konfirmasi tujuan produk dan audiens\n2. Pembagian peran\n3. Kesepakatan deadline internal\n4. Rencana riset",
      agendaSentAt: new Date("2026-10-29T10:00:00+07:00"),
      minutes:
        "Semua anggota sepakat tujuan produk adalah video profil yang jujur dan hangat. Deadline internal selalu dua hari lebih awal dari deadline resmi. Bayu berhalangan hadir karena sakit dan sudah menyampaikan alasan.",
      status: "COMPLETED",
      createdById: "user-rani",
    },
  });

  await prisma.meetingDecision.createMany({
    data: [
      {
        meetingId: meeting.id,
        number: 1,
        text: "Riset audiens dilakukan sebelum menyusun naskah dan storyboard.",
      },
      {
        meetingId: meeting.id,
        number: 2,
        text: "Setiap deadline internal ditetapkan minimal dua hari sebelum deadline resmi.",
      },
    ],
  });

  await prisma.attendance.createMany({
    data: USERS.filter((user) => user.id !== "user-dosen").map((user) => ({
      meetingId: meeting.id,
      userId: user.id,
      status: user.id === "user-bayu" ? "EXCUSED" : "PRESENT",
    })),
  });

  await prisma.actionItem.createMany({
    data: [
      {
        meetingId: meeting.id,
        description: "Kirim moodboard referensi visual",
        ownerId: "user-salsa",
        dueDate: new Date("2026-11-02T17:00:00+07:00"),
        completedAt: new Date("2026-11-01T12:00:00+07:00"),
      },
      {
        meetingId: meeting.id,
        description: "Susun draft style guide visual",
        ownerId: "user-bayu",
        dueDate: new Date("2026-11-05T17:00:00+07:00"),
      },
    ],
  });

  const conflict = await prisma.conflict.create({
    data: {
      id: "conflict-asset",
      projectId: PROJECT_ID,
      type: "LATE_ASSET",
      level: 1,
      title: "Aset grafis terlambat",
      description:
        "Aset grafis untuk storyboard belum dikirim sesuai tenggat internal, sehingga editing berpotensi mundur.",
      status: "OPEN",
      openedById: "user-salsa",
    },
  });

  await prisma.conflictStep.create({
    data: {
      conflictId: conflict.id,
      level: 1,
      summary:
        "Diskusi langsung dijadwalkan 5 November pukul 16.00. Fokus pada kendala dan pembagian ulang beban, bukan sanksi.",
    },
  });

  console.log("Seed selesai:", {
    users: USERS.length,
    tasks: TASKS.length,
    decisions: DECISIONS.length,
    meeting: meeting.title,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect().catch((error) => {
      console.error(error);
    });
  });
