import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck2,
  Plus,
  Users,
} from "lucide-react";

import { AlertBanner } from "~/components/ui/alert-banner";
import { EmptyState } from "~/components/ui/empty-state";
import { MetricCard } from "~/components/ui/metric-card";
import { PageHeader } from "~/components/ui/page-header";
import { StatusBadge } from "~/components/ui/status-badge";
import { formatDate, formatDateTime, percent } from "~/lib/format";
import { canFacilitate, requireUser } from "~/server/auth";
import { createMeeting } from "~/server/actions/meetings";
import { getMeetingsPage } from "~/server/queries/meetings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rapat & notulen",
};

interface PageProps {
  searchParams: { ok?: string; error?: string };
}

const WEEKLY_TEMPLATE = `1. Progres tiap peran sejak rapat terakhir
2. Hambatan, dependensi, dan bantuan yang dibutuhkan
3. Keputusan minggu ini (beri nomor)
4. Action item: pemilik + tenggat
5. Evaluasi singkat: apa yang perlu disesuaikan?`;

function defaultScheduleValue() {
  const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  date.setHours(15, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default async function MeetingsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const data = await getMeetingsPage(user.projectId);
  const canManage = canFacilitate(user);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="M5 · Komunikasi"
        title="Rapat & notulen"
        description="Agenda dikirim minimal 24 jam sebelumnya. Keputusan rapat bernomor dan tidak dapat diedit. Rapat hanya dapat ditutup dengan notulen, keputusan, dan action item yang memiliki pemilik serta tenggat."
      />

      {searchParams.error ? (
        <AlertBanner tone="error">{searchParams.error}</AlertBanner>
      ) : null}
      {searchParams.ok ? (
        <AlertBanner tone="success">{searchParams.ok}</AlertBanner>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Rapat tercatat"
          value={String(data.metrics.total)}
          hint={`${data.metrics.completed} selesai`}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <MetricCard
          label="Kepatuhan dokumentasi"
          value={percent(data.metrics.docCompliance)}
          hint="Notulen + keputusan + action item"
          tone="done"
          icon={<FileCheck2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Agenda terlambat"
          value={String(data.metrics.lateAgendas)}
          hint="Dikirim kurang dari 24 jam"
          tone={data.metrics.lateAgendas > 0 ? "blocked" : "done"}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          label="Action item terbuka"
          value={String(data.metrics.openActions)}
          hint="Memiliki pemilik & tenggat"
          tone={data.metrics.openActions > 0 ? "doing" : "done"}
          icon={<ClipboardList className="h-4 w-4" />}
        />
      </div>

      {canManage ? (
        <details className="card-surface overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-forest">
            <Plus className="h-4 w-4" aria-hidden />
            Buat rapat baru
          </summary>
          <form
            action={createMeeting}
            className="grid gap-4 border-t border-cream-line px-5 py-4 lg:grid-cols-2"
          >
            <div>
              <label htmlFor="title" className="label-base">
                Judul rapat
              </label>
              <input
                id="title"
                name="title"
                className="input-base"
                placeholder="Rapat progres mingguan"
                required
                minLength={3}
              />
            </div>
            <div>
              <label htmlFor="scheduledAt" className="label-base">
                Waktu rapat <span className="font-normal text-ink-muted">(minimal 24 jam dari sekarang)</span>
              </label>
              <input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                className="input-base"
                defaultValue={defaultScheduleValue()}
                required
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="agenda" className="label-base">
                Agenda <span className="font-normal text-ink-muted">(langsung dikirim saat dibuat)</span>
              </label>
              <textarea
                id="agenda"
                name="agenda"
                rows={6}
                className="input-base"
                defaultValue={WEEKLY_TEMPLATE}
                required
                minLength={10}
              />
            </div>
            <div className="lg:col-span-2">
              <button type="submit" className="btn-primary">
                Kirim agenda & buat rapat
              </button>
            </div>
          </form>
        </details>
      ) : null}

      <section className="card-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Template progres mingguan</h2>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-6 text-ink-muted">
          {WEEKLY_TEMPLATE}
        </pre>
      </section>

      {data.meetings.length === 0 ? (
        <EmptyState
          title="Belum ada rapat"
          description="Buat rapat pertama dengan agenda yang dikirim minimal 24 jam sebelumnya."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.meetings.map((meeting) => {
            const completed = meeting.status === "COMPLETED";
            const agendaOnTime =
              meeting.agendaSentAt &&
              new Date(meeting.scheduledAt).getTime() -
                new Date(meeting.agendaSentAt).getTime() >=
                24 * 60 * 60 * 1000;
            const openActions = meeting.actionItems.filter(
              (item) => !item.completedAt,
            ).length;

            return (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="card-surface block p-5 transition-colors hover:border-forest/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {formatDate(meeting.scheduledAt)}
                    </p>
                    <h2 className="mt-0.5 font-heading text-base font-bold text-ink">
                      {meeting.title}
                    </h2>
                  </div>
                  <StatusBadge tone={completed ? "done" : "review"}>
                    {completed ? "Selesai" : "Direncanakan"}
                  </StatusBadge>
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                  {meeting.agenda}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <StatusBadge tone={agendaOnTime ? "done" : "blocked"} withDot={false}>
                    {agendaOnTime ? "Agenda ≥24 jam" : "Agenda terlambat"}
                  </StatusBadge>
                  <StatusBadge tone="review" withDot={false}>
                    {meeting.decisions.length} keputusan
                  </StatusBadge>
                  <StatusBadge
                    tone={openActions > 0 ? "doing" : "done"}
                    withDot={false}
                  >
                    {openActions} action item terbuka
                  </StatusBadge>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {meeting.attendance.length} absensi
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-forest">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  {meeting.minutes
                    ? "Notulen tersedia"
                    : "Notulen belum diisi"}
                  <span className="text-ink-muted">·</span>
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {formatDateTime(meeting.scheduledAt)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
