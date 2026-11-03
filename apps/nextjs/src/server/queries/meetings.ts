import { prisma } from "@mediasync/db";

import { listProjectMembers } from "~/server/queries/tasks";

export async function getMeetingsPage(projectId: string) {
  const [meetings, members] = await Promise.all([
    prisma.meetingLog.findMany({
      where: { projectId },
      include: {
        createdBy: true,
        decisions: { orderBy: { number: "asc" } },
        actionItems: {
          include: { owner: true, task: true },
          orderBy: { dueDate: "asc" },
        },
        attendance: { include: { user: true } },
      },
      orderBy: { scheduledAt: "desc" },
    }),
    listProjectMembers(projectId),
  ]);

  const completed = meetings.filter((meeting) => meeting.status === "COMPLETED");
  const documented = completed.filter(
    (meeting) =>
      Boolean(meeting.minutes?.trim()) &&
      meeting.decisions.length > 0 &&
      meeting.actionItems.length > 0,
  );
  const lateAgendas = meetings.filter(
    (meeting) =>
      meeting.agendaSentAt &&
      new Date(meeting.scheduledAt).getTime() -
        new Date(meeting.agendaSentAt).getTime() <
        24 * 60 * 60 * 1000,
  );
  const openActions = meetings.flatMap((meeting) =>
    meeting.actionItems.filter((item) => !item.completedAt),
  );

  return {
    meetings,
    members,
    metrics: {
      total: meetings.length,
      completed: completed.length,
      documented: documented.length,
      docCompliance:
        completed.length > 0 ? documented.length / completed.length : 1,
      lateAgendas: lateAgendas.length,
      openActions: openActions.length,
    },
  };
}

export async function getMeetingDetail(meetingId: string, projectId: string) {
  const [meeting, members] = await Promise.all([
    prisma.meetingLog.findFirst({
      where: { id: meetingId, projectId },
      include: {
        createdBy: true,
        decisions: { orderBy: { number: "asc" } },
        actionItems: {
          include: { owner: true, task: true },
          orderBy: { dueDate: "asc" },
        },
        attendance: { include: { user: { include: { role: true } } } },
      },
    }),
    listProjectMembers(projectId),
  ]);

  return { meeting, members };
}

export type MeetingsPageData = Awaited<ReturnType<typeof getMeetingsPage>>;
export type MeetingDetailData = Awaited<ReturnType<typeof getMeetingDetail>>;
