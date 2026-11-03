import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Users,
} from "lucide-react";

import { PHASE_META } from "@mediasync/shared";

import { AttentionFeed } from "~/components/dashboard/attention-feed";
import { ContributionStrip } from "~/components/dashboard/contribution-strip";
import { DependencyFlow } from "~/components/dashboard/dependency-flow";
import { HealthPanel } from "~/components/dashboard/health-panel";
import { PhaseProgress } from "~/components/dashboard/phase-progress";
import { MetricCard } from "~/components/ui/metric-card";
import { PageHeader } from "~/components/ui/page-header";
import { daysUntil, formatDate, relativeDeadline } from "~/lib/format";
import { requireUser } from "~/server/auth";
import { getDashboardData } from "~/server/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.projectId);
  const { metrics, health } = data;

  const nextDeadlineDays = metrics.nextDeadline
    ? daysUntil(metrics.nextDeadline.internalDeadline)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="M1 · Ringkasan proyek"
        title={`Selamat datang, ${user.name}`}
        description="Pantau kesehatan proyek, tugas yang berisiko, dan keputusan yang menunggu tindakan."
        actions={
          <>
            <Link href="/tasks" className="btn-primary">
              Buka papan tugas
            </Link>
            <Link href="/decisions" className="btn-secondary">
              Lihat keputusan
            </Link>
          </>
        }
      />

      {metrics.atRisk > 0 ? (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-status-blocked-solid/30 bg-status-blocked-soft px-3.5 py-3 text-sm font-medium text-status-blocked-text sm:flex-row sm:items-center">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {metrics.atRisk} tugas berisiko
            {metrics.openBlockers > 0
              ? ` akibat ${metrics.openBlockers} hambatan aktif`
              : ""}
            . Buka papan untuk menindaklanjuti.
          </span>
          <Link
            href="/tasks"
            className="font-semibold underline decoration-status-blocked-solid/50 underline-offset-2 sm:ml-auto"
          >
            Tinjau sekarang
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Kesehatan proyek"
          value={`${health.score}`}
          hint={`${health.label} · skor 0–100`}
          tone={health.tone}
          icon={<Activity className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          label="On-time"
          value={`${Math.round(metrics.onTime * 100)}%`}
          hint={`${metrics.completed} dari ${metrics.total} tugas selesai`}
          tone={health.components.onTime >= 0.85 ? "done" : "doing"}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          label="Partisipasi"
          value={`${Math.round(metrics.participation * 100)}%`}
          hint={`${data.contributions.filter((item) => item.done + item.doing + item.review + item.blocked > 0).length} dari ${data.members.length} anggota aktif`}
          tone={health.components.participation >= 0.8 ? "done" : "doing"}
          icon={<Users className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          label="Hambatan aktif"
          value={`${metrics.openBlockers}`}
          hint={
            metrics.openBlockers > 0
              ? `${metrics.atRisk} tugas terdampak`
              : "Tidak ada hambatan"
          }
          tone={metrics.openBlockers > 0 ? "blocked" : "done"}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          label="Deadline berikutnya"
          value={
            metrics.nextDeadline
              ? formatDate(metrics.nextDeadline.internalDeadline)
              : "—"
          }
          hint={
            metrics.nextDeadline
              ? `${metrics.nextDeadline.title} · ${
                  nextDeadlineDays !== null && nextDeadlineDays < 0
                    ? "terlewat"
                    : relativeDeadline(metrics.nextDeadline.internalDeadline)
                }`
              : "Semua tugas selesai"
          }
          tone={
            nextDeadlineDays !== null && nextDeadlineDays < 0
              ? "blocked"
              : nextDeadlineDays !== null && nextDeadlineDays <= 2
                ? "doing"
                : "neutral"
          }
          icon={<CalendarClock className="h-4 w-4" aria-hidden />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <section className="card-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-bold text-ink">
                  Alur ketergantungan
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Urutan 11 langkah produksi. Garis merah menandai dampak
                  hambatan.
                </p>
              </div>
              <Link
                href="/tasks?view=timeline"
                className="text-xs font-semibold text-forest hover:text-forest-700"
              >
                Lihat linimasa →
              </Link>
            </div>
            <div className="mt-4">
              <DependencyFlow tasks={data.tasks} flags={data.flags} />
            </div>
          </section>

          <ContributionStrip contributions={data.contributions} />
        </div>

        <div className="space-y-4 lg:col-span-4">
          <HealthPanel health={health} />
          <AttentionFeed items={data.attention} />
          <PhaseProgress phases={data.phaseProgress} />
        </div>
      </div>

      <p className="mt-5 text-[11px] text-ink-muted">
        Data diperbarui saat halaman dimuat. Fase aktif:{" "}
        {PHASE_META.PRE_PRODUCTION} · keputusan menunggu:{" "}
        {data.decisions.filter((decision) => decision.status === "SHORTLISTED").length}.
      </p>
    </>
  );
}
