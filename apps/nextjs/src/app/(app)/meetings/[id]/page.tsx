import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lock,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";

import { AlertBanner } from "~/components/ui/alert-banner";
import { StatusBadge } from "~/components/ui/status-badge";
import { formatDate, formatDateTime, relativeDeadline } from "~/lib/format";
import { cn } from "~/lib/utils";
import { canFacilitate, requireUser } from "~/server/auth";
import {
  addActionItem,
  addMeetingDecision,
  closeMeeting,
  completeActionItem,
  convertActionItemToTask,
  saveAttendance,
  saveMeetingMinutes,
} from "~/server/actions/meetings";
import { getMeetingDetail } from "~/server/queries/meetings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail rapat",
};

interface PageProps {
  params: { id: string };
  searchParams: { ok?: string; error?: string };
}

const ATTENDANCE_LABEL: Record<
  string,
  { tone: "done" | "doing" | "blocked"; label: string }
> = {
  PRESENT: { tone: "done", label: "Hadir" },
  EXCUSED: { tone: "doing", label: "Izin" },
  ABSENT: { tone: "blocked", label: "Tidak hadir" },
};

function defaultDueValue() {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export default async function MeetingDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireUser();
  const { meeting, members } = await getMeetingDetail(
    params.id,
    user.projectId,
  );

  if (!meeting) notFound();

  const canManage = canFacilitate(user);
  const completed = meeting.status === "COMPLETED";
  const attendanceByUser = new Map(
    meeting.attendance.map((entry) => [entry.userId, entry.status]),
  );
  const agendaOnTime =
    meeting.agendaSentAt &&
    new Date(meeting.scheduledAt).getTime() -
      new Date(meeting.agendaSentAt).getTime() >=
      24 * 60 * 60 * 1000;

  const documentComplete =
    Boolean(meeting.minutes?.trim()) &&
    meeting.decisions.length > 0 &&
    meeting.actionItems.length > 0;

  return (
    <div className="space-y-5">
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke daftar rapat
      </Link>

      {searchParams.error ? (
        <AlertBanner tone="error">{searchParams.error}</AlertBanner>
      ) : null}
      {searchParams.ok ? (
        <AlertBanner tone="success">{searchParams.ok}</AlertBanner>
      ) : null}

      <header className="card-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              M5 · Rapat
            </p>
            <h1 className="mt-1 font-heading text-xl font-bold text-ink">
              {meeting.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatDateTime(meeting.scheduledAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" aria-hidden />
                {meeting.attendance.length} absensi
              </span>
              <span>Fasilitator: {meeting.createdBy.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge tone={completed ? "done" : "review"}>
              {completed ? "Selesai" : "Direncanakan"}
            </StatusBadge>
            <StatusBadge tone={agendaOnTime ? "done" : "blocked"} withDot={false}>
              {agendaOnTime ? "Agenda ≥24 jam" : "Agenda terlambat"}
            </StatusBadge>
            <StatusBadge tone={documentComplete ? "done" : "doing"} withDot={false}>
              {documentComplete ? "Dokumentasi lengkap" : "Dokumentasi belum lengkap"}
            </StatusBadge>
          </div>
        </div>
        {meeting.agendaSentAt ? (
          <p className="mt-3 text-xs text-ink-muted">
            Agenda dikirim {formatDateTime(meeting.agendaSentAt)}
          </p>
        ) : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Agenda</h2>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-ink-muted">
              {meeting.agenda}
            </pre>
          </section>

          <section className="card-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <FileText className="h-4 w-4 text-forest" aria-hidden />
                Notulen
              </h2>
              {completed ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Read-only
                </span>
              ) : null}
            </div>

            {meeting.minutes ? (
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-ink-muted">
                {meeting.minutes}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                Notulen belum diisi. Rapat tidak dapat ditutup tanpa notulen.
              </p>
            )}

            {canManage && !completed ? (
              <form action={saveMeetingMinutes} className="mt-4 space-y-2">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <label htmlFor="minutes" className="label-base">
                  {meeting.minutes ? "Perbarui notulen" : "Tulis notulen"}
                </label>
                <textarea
                  id="minutes"
                  name="minutes"
                  rows={5}
                  className="input-base"
                  defaultValue={meeting.minutes ?? ""}
                  minLength={10}
                  required
                  placeholder="Ringkasan diskusi, kesepakatan, dan hal yang masih terbuka."
                />
                <button type="submit" className="btn-primary">
                  Simpan notulen
                </button>
              </form>
            ) : null}
          </section>

          <section className="card-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <ClipboardList className="h-4 w-4 text-forest" aria-hidden />
                Log keputusan
              </h2>
              <StatusBadge tone="idle" withDot={false}>
                Immutable
              </StatusBadge>
            </div>

            {meeting.decisions.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                Belum ada keputusan bernomor. Rapat tidak dapat ditutup tanpa
                keputusan.
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {meeting.decisions.map((decision) => (
                  <li
                    key={decision.id}
                    className="flex gap-3 rounded-lg border border-cream-line bg-cream/40 p-3"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-cream">
                      {decision.number}
                    </span>
                    <p className="text-sm leading-6 text-ink">{decision.text}</p>
                  </li>
                ))}
              </ol>
            )}

            {canManage && !completed ? (
              <form action={addMeetingDecision} className="mt-4 space-y-2">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <label htmlFor="text" className="label-base">
                  Keputusan baru
                </label>
                <textarea
                  id="text"
                  name="text"
                  rows={3}
                  className="input-base"
                  minLength={10}
                  required
                  placeholder="Tulis keputusan yang disepakati. Setelah disimpan tidak dapat diedit."
                />
                <button type="submit" className="btn-primary">
                  Tambah keputusan
                </button>
              </form>
            ) : null}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <UserCheck className="h-4 w-4 text-forest" aria-hidden />
              Absensi
            </h2>

            {canManage && !completed ? (
              <form action={saveAttendance} className="mt-3 space-y-3">
                <input type="hidden" name="meetingId" value={meeting.id} />
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <label
                      htmlFor={`attendance-${member.id}`}
                      className="text-sm font-medium text-ink"
                    >
                      {member.name}
                      <span className="ml-1 text-xs font-normal text-ink-muted">
                        {member.role.name}
                      </span>
                    </label>
                    <select
                      id={`attendance-${member.id}`}
                      name={`attendance-${member.id}`}
                      className="input-base w-32 py-1.5"
                      defaultValue={attendanceByUser.get(member.id) ?? "PRESENT"}
                    >
                      <option value="PRESENT">Hadir</option>
                      <option value="EXCUSED">Izin</option>
                      <option value="ABSENT">Tidak hadir</option>
                    </select>
                  </div>
                ))}
                <button type="submit" className="btn-primary w-full">
                  Simpan absensi
                </button>
              </form>
            ) : (
              <ul className="mt-3 space-y-2">
                {members.map((member) => {
                  const status = attendanceByUser.get(member.id);
                  const meta = (status ? ATTENDANCE_LABEL[status] : null) ?? {
                    tone: "idle" as const,
                    label: "Belum dicatat",
                  };
                  return (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium text-ink">{member.name}</span>
                      <StatusBadge tone={meta.tone} withDot={false}>
                        {meta.label}
                      </StatusBadge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card-surface p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle2 className="h-4 w-4 text-forest" aria-hidden />
              Action item
            </h2>

            {meeting.actionItems.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                Belum ada action item. Setiap action item wajib memiliki pemilik
                dan tenggat.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {meeting.actionItems.map((item) => {
                  const done = Boolean(item.completedAt);
                  return (
                    <li
                      key={item.id}
                      className="rounded-lg border border-cream-line p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium text-ink",
                            done && "line-through opacity-60",
                          )}
                        >
                          {item.description}
                        </p>
                        <StatusBadge
                          tone={done ? "done" : "doing"}
                          withDot={false}
                        >
                          {done ? "Selesai" : "Terbuka"}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {item.owner.name} · tenggat {formatDate(item.dueDate)} (
                        {relativeDeadline(item.dueDate)})
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {!done ? (
                          <form action={completeActionItem}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <button type="submit" className="btn-secondary py-1 text-xs">
                              Tandai selesai
                            </button>
                          </form>
                        ) : null}
                        {canManage ? (
                          item.task ? (
                            <Link
                              href={`/tasks/${item.task.id}`}
                              className="text-xs font-semibold text-forest hover:underline"
                            >
                              Lihat tugas #{item.task.stepNo}
                            </Link>
                          ) : (
                            <form action={convertActionItemToTask}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <button
                                type="submit"
                                className="btn-ghost py-1 text-xs"
                              >
                                Jadikan tugas
                              </button>
                            </form>
                          )
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {canManage && !completed ? (
              <form action={addActionItem} className="mt-4 space-y-2">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <label htmlFor="description" className="label-base">
                  Action item baru
                </label>
                <input
                  id="description"
                  name="description"
                  className="input-base"
                  minLength={5}
                  required
                  placeholder="Contoh: Kirim draf style guide ke Bayu"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="ownerId" className="label-base">
                      Pemilik
                    </label>
                    <select
                      id="ownerId"
                      name="ownerId"
                      className="input-base py-1.5"
                      required
                    >
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="label-base">
                      Tenggat
                    </label>
                    <input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      className="input-base py-1.5"
                      defaultValue={defaultDueValue()}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-secondary w-full">
                  <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Tambah action item
                </button>
              </form>
            ) : null}
          </section>

          <section className="card-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Tutup rapat</h2>
            {completed ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <Lock className="h-4 w-4" aria-hidden />
                Rapat sudah ditutup dan dokumentasi dikunci.
              </p>
            ) : (
              <>
                <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                  {[
                    ["Notulen terisi", Boolean(meeting.minutes?.trim())],
                    ["Minimal 1 keputusan", meeting.decisions.length > 0],
                    ["Minimal 1 action item", meeting.actionItems.length > 0],
                  ].map(([label, met]) => (
                    <li key={String(label)} className="flex items-center gap-1.5">
                      <CheckCircle2
                        className={cn(
                          "h-3.5 w-3.5",
                          met ? "text-status-done-solid" : "text-ink-muted/50",
                        )}
                        aria-hidden
                      />
                      {label}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <form action={closeMeeting} className="mt-3">
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <button
                      type="submit"
                      className="btn-primary w-full"
                      disabled={!documentComplete}
                    >
                      Tutup rapat
                    </button>
                    {!documentComplete ? (
                      <p className="mt-2 text-xs text-ink-muted">
                        Lengkapi seluruh dokumentasi sebelum menutup rapat.
                      </p>
                    ) : null}
                  </form>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">
                    Hanya fasilitator (PM/CD) yang dapat menutup rapat.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
